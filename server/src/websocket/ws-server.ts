import { createServer } from 'node:http';
import { URL } from 'node:url';
import pino from 'pino';
import QRCode from 'qrcode';
import { WebSocketServer, type WebSocket } from 'ws';
import type { ClientMessage } from '@party/shared';
import { RoomManager } from '../core/room-manager';
import { pickPrimaryLocalIPv4 } from '../network/local-ip';
import { makeServerMessage, parseClientMessage } from './protocol';

const logger = pino({ name: 'party-server' });

type ClientCtx = {
  role: 'host' | 'player' | null;
  playerId?: string;
  seenMessageIds: Set<string>;
  rateWindowStart: number;
  rateCount: number;
};

export class PartyServer {
  private readonly roomManager = new RoomManager();
  private timerInterval: NodeJS.Timeout;
  private startedPort = 3000;
  private readonly clients = new Map<WebSocket, ClientCtx>();
  private readonly hostConnections = new Set<WebSocket>();
  private readonly playerConnections = new Map<string, Set<WebSocket>>();

  private readonly http = createServer((req, res) => {
    const url = new URL(req.url ?? '/', `http://${req.headers.host}`);
    if (url.pathname === '/health') {
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ ok: true }));
      return;
    }

    if (url.pathname === '/room') {
      const room = this.roomManager.getRoom();
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ code: room.code }));
      return;
    }

    res.writeHead(200, { 'content-type': 'text/plain; charset=utf-8' });
    res.end('Party server is running. Use host/mobile apps to connect.');
  });

  private readonly wss = new WebSocketServer({
    server: this.http,
    path: '/ws',
    maxPayload: 16 * 1024,
  });

  constructor(private readonly port = 3000) {
    this.startedPort = port;
    this.wss.on('connection', (socket) => this.onConnection(socket));
    this.timerInterval = setInterval(() => this.tickTimers(), 500);
  }

  async start(): Promise<void> {
    await new Promise<void>((resolve) => {
      this.http.listen(this.port, '0.0.0.0', () => resolve());
    });
    const address = this.http.address();
    if (address && typeof address === 'object') {
      this.startedPort = address.port;
    }
    const ip = pickPrimaryLocalIPv4();
    const room = this.roomManager.getRoom();
    logger.info({ roomCode: room.code, url: `http://${ip}:${this.startedPort}/join/${room.code}` }, 'Party server started');
  }

  async stop(): Promise<void> {
    clearInterval(this.timerInterval);
    for (const socket of this.clients.keys()) {
      socket.close();
    }
    await new Promise<void>((resolve) => this.wss.close(() => resolve()));
    await new Promise<void>((resolve, reject) => this.http.close((error) => (error ? reject(error) : resolve())));
  }

  getRoomCode(): string {
    return this.roomManager.getRoom().code;
  }

  getPort(): number {
    return this.startedPort;
  }

  private onConnection(socket: WebSocket): void {
    this.clients.set(socket, {
      role: null,
      seenMessageIds: new Set(),
      rateWindowStart: Date.now(),
      rateCount: 0,
    });

    socket.on('message', async (data) => {
      try {
        const parsed = parseClientMessage(JSON.parse(data.toString()));
        await this.onClientMessage(socket, parsed);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        this.send(socket, 'ERROR', { code: 'BAD_REQUEST', message, recoverable: true });
      }
    });

    socket.on('close', () => {
      const ctx = this.clients.get(socket);
      if (ctx?.role === 'host') {
        this.hostConnections.delete(socket);
      }
      if (ctx?.role === 'player' && ctx.playerId) {
        const set = this.playerConnections.get(ctx.playerId);
        if (set) {
          set.delete(socket);
          if (set.size === 0) {
            this.playerConnections.delete(ctx.playerId);
            this.roomManager.getRoom().disconnectPlayer(ctx.playerId, Date.now());
            this.broadcast('PLAYER_LEFT', { playerId: ctx.playerId });
            this.broadcastRoomState();
            this.broadcastOwnerChanged();
          }
        }
      }
      this.clients.delete(socket);
    });
  }

  private async onClientMessage(socket: WebSocket, message: ClientMessage): Promise<void> {
    const ctx = this.clients.get(socket);
    if (!ctx) {
      return;
    }

    if (ctx.seenMessageIds.has(message.messageId)) {
      return;
    }
    const now = Date.now();
    if (now - ctx.rateWindowStart > 5000) {
      ctx.rateWindowStart = now;
      ctx.rateCount = 0;
    }
    ctx.rateCount += 1;
    if (ctx.rateCount > 30) {
      this.send(socket, 'ERROR', { code: 'RATE_LIMITED', message: 'Too many messages', recoverable: true });
      return;
    }
    ctx.seenMessageIds.add(message.messageId);
    if (ctx.seenMessageIds.size > 200) {
      const first = ctx.seenMessageIds.values().next().value as string;
      ctx.seenMessageIds.delete(first);
    }

    const room = this.roomManager.getRoom();

    if (message.type === 'PING') {
      this.send(socket, 'PONG', {});
      return;
    }

    if (message.type === 'JOIN_ROOM') {
      if (message.payload.roomCode !== room.code) {
        this.send(socket, 'ERROR', { code: 'ROOM_NOT_FOUND', message: 'Invalid room code', recoverable: true });
        return;
      }

      if (message.payload.role === 'host') {
        ctx.role = 'host';
        this.hostConnections.add(socket);
        this.send(socket, 'ROOM_JOINED', { roomCode: room.code, role: 'host', ownerPlayerId: room.ownerPlayerId });
        this.broadcastRoomState();
        return;
      }

      const { player, sessionToken } = room.joinPlayer(message.payload.playerName, Date.now());
      ctx.role = 'player';
      ctx.playerId = player.id;
      const playerSockets = this.playerConnections.get(player.id) ?? new Set<WebSocket>();
      playerSockets.add(socket);
      this.playerConnections.set(player.id, playerSockets);

      this.send(socket, 'ROOM_JOINED', {
        roomCode: room.code,
        role: 'player',
        playerId: player.id,
        ownerPlayerId: room.ownerPlayerId,
        sessionToken,
      });
      this.broadcast('PLAYER_JOINED', { playerId: player.id, name: player.name });
      this.broadcastRoomState();
      this.pushGameState();
      return;
    }

    if (message.type === 'RECONNECT_SESSION') {
      if (message.payload.roomCode !== room.code) {
        this.send(socket, 'ERROR', { code: 'ROOM_NOT_FOUND', message: 'Invalid room code', recoverable: true });
        return;
      }

      if (message.payload.role === 'host') {
        ctx.role = 'host';
        this.hostConnections.add(socket);
        this.send(socket, 'ROOM_JOINED', { roomCode: room.code, role: 'host', ownerPlayerId: room.ownerPlayerId });
        this.broadcastRoomState();
        return;
      }

      const player = room.reconnect(message.payload.sessionToken, Date.now());
      ctx.role = 'player';
      ctx.playerId = player.id;
      const playerSockets = this.playerConnections.get(player.id) ?? new Set<WebSocket>();
      playerSockets.add(socket);
      this.playerConnections.set(player.id, playerSockets);

      this.send(socket, 'ROOM_JOINED', {
        roomCode: room.code,
        role: 'player',
        playerId: player.id,
        ownerPlayerId: room.ownerPlayerId,
      });
      this.broadcast('PLAYER_RECONNECTED', { playerId: player.id });
      this.broadcastRoomState();
      this.pushPrivateState(player.id);
      this.pushGameState();
      return;
    }

    if (message.type === 'START_GAME') {
      this.assertOwner(ctx.playerId);
      room.startGame(ctx.playerId ?? null);
      this.broadcast('GAME_STARTED', {});
      this.pushGameState();
      this.flushGameEvents();
      return;
    }

    if (!ctx.playerId) {
      this.send(socket, 'ERROR', { code: 'NOT_AUTHENTICATED', message: 'Player session required', recoverable: true });
      return;
    }

    if (message.type === 'PLAY_CARD') {
      room.applyGameAction({ type: 'play_card', playerId: ctx.playerId, cardId: message.payload.cardId, chosenColor: message.payload.chosenColor });
      this.flushAndPublishState();
      return;
    }

    if (message.type === 'DRAW_CARD') {
      room.applyGameAction({ type: 'draw_card', playerId: ctx.playerId, playDrawnCardId: message.payload.playDrawnCardId, chosenColor: message.payload.chosenColor });
      this.flushAndPublishState();
      return;
    }

    if (message.type === 'CHOOSE_COLOR') {
      room.applyGameAction({ type: 'choose_color', playerId: ctx.playerId, color: message.payload.color });
      this.flushAndPublishState();
      return;
    }

    if (message.type === 'UNO_CALL') {
      room.applyGameAction({ type: 'uno_call', playerId: ctx.playerId });
      this.flushAndPublishState();
      return;
    }

    if (message.type === 'UNO_CHALLENGE') {
      room.applyGameAction({ type: 'uno_challenge', playerId: ctx.playerId, targetPlayerId: message.payload.targetPlayerId });
      this.flushAndPublishState();
      return;
    }

    this.send(socket, 'ERROR', { code: 'NOT_IMPLEMENTED', message: `Action ${message.type} not implemented`, recoverable: true });
  }

  private flushAndPublishState(): void {
    this.pushGameState();
    this.flushGameEvents();
  }

  private flushGameEvents(): void {
    const game = this.roomManager.getRoom().game;
    if (!game) {
      return;
    }
    for (const event of game.consumeEvents()) {
      this.broadcast('GAME_EVENT', { event, stateVersion: this.roomManager.getRoom().stateVersion });
    }
  }

  private pushGameState(): void {
    const room = this.roomManager.getRoom();
    if (!room.game) {
      return;
    }
    const publicState = room.game.getPublicState();
    this.broadcast('GAME_STATE_PUBLIC', { state: publicState, stateVersion: room.stateVersion });
    for (const playerId of this.playerConnections.keys()) {
      this.pushPrivateState(playerId);
    }
  }

  private pushPrivateState(playerId: string): void {
    const room = this.roomManager.getRoom();
    const game = room.game;
    if (!game) {
      return;
    }
    const state = game.getPrivateState(playerId);
    for (const socket of this.playerConnections.get(playerId) ?? []) {
      this.send(socket, 'PLAYER_STATE_PRIVATE', { state, stateVersion: room.stateVersion });
    }
  }

  private async broadcastRoomState(): Promise<void> {
    const room = this.roomManager.getRoom();
    const ip = pickPrimaryLocalIPv4();
    const joinUrl = `http://${ip}:${this.startedPort}/join/${room.code}`;
    const joinQrDataUrl = await QRCode.toDataURL(joinUrl, { margin: 1, scale: 6 });
    this.broadcast('ROOM_STATE', {
      roomCode: room.code,
      ownerPlayerId: room.ownerPlayerId,
      joinUrl,
      joinQrDataUrl,
      players: room.getPlayers().map((player) => ({ id: player.id, name: player.name, connected: player.connected, handCount: room.game?.getState().hands[player.id]?.length ?? 0 })),
    });
  }

  private broadcastOwnerChanged(): void {
    this.broadcast('OWNER_CHANGED', { ownerPlayerId: this.roomManager.getRoom().ownerPlayerId });
  }

  private broadcast<T extends Parameters<PartyServer['send']>[1]>(type: T, payload: Parameters<PartyServer['send']>[2]): void {
    for (const socket of this.clients.keys()) {
      this.send(socket, type, payload as never);
    }
  }

  private send<T extends Parameters<typeof makeServerMessage>[0]>(
    socket: WebSocket,
    type: T,
    payload: Parameters<typeof makeServerMessage<T>>[1],
  ): void {
    if (socket.readyState !== 1) {
      return;
    }
    socket.send(JSON.stringify(makeServerMessage(type, payload)));
  }

  private assertOwner(playerId?: string): void {
    if (!playerId || this.roomManager.getRoom().ownerPlayerId !== playerId) {
      throw new Error('NOT_ALLOWED:Only owner can perform this action');
    }
  }

  private tickTimers(): void {
    const room = this.roomManager.getRoom();
    const timer = room.game?.getState().timer;
    if (!timer) {
      return;
    }
    if (Date.now() >= timer.expiresAt) {
      room.applyTimeout();
      this.flushAndPublishState();
    }
  }
}
