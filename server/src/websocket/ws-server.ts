import { createServer } from 'node:http';
import { URL } from 'node:url';
import pino from 'pino';
import QRCode from 'qrcode';
import { WebSocketServer, type WebSocket } from 'ws';
import type { ClientMessage } from '@party/shared';
import { isTurnTimed } from '../core/game-plugin';
import { RoomManager } from '../core/room-manager';
import { gameCatalog } from '../games/registry';
import { pickPrimaryLocalIPv4 } from '../network/local-ip';
import { makeServerMessage, parseClientMessage } from './protocol';

const logger = pino({ name: 'party-server' });

type ClientCtx = {
  role: 'host' | 'player' | null;
  playerId?: string;
  seenMessageIds: Set<string>;
  rateWindowStart: number;
  rateCount: number;
  lastReactionAt: number;
};

export class PartyServer {
  private readonly roomManager = new RoomManager();
  private timerInterval: NodeJS.Timeout;
  private startedPort = 3001;
  private readonly clients = new Map<WebSocket, ClientCtx>();
  private readonly hostConnections = new Set<WebSocket>();
  private readonly playerConnections = new Map<string, Set<WebSocket>>();
  private readonly disconnectTimers = new Map<string, NodeJS.Timeout>();

  private readonly http = createServer((req, res) => {
    const url = new URL(req.url ?? '/', `http://${req.headers.host}`);
    const origin = req.headers.origin;
    const isLocalOrigin = typeof origin === 'string' && /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);

    if (origin && isLocalOrigin) {
      res.setHeader('Access-Control-Allow-Origin', origin);
    } else if (origin) {
      res.setHeader('Access-Control-Allow-Origin', '*');
    } else {
      res.setHeader('Access-Control-Allow-Origin', '*');
    }
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Vary', 'Origin');

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

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
    // Big enough for a full É Você! drawing (a stroke list) or a voting-phase
    // public state carrying several of them; still bounded against abuse.
    maxPayload: 128 * 1024,
  });

  constructor(
    private readonly port = 3001,
    private readonly disconnectGraceMs = 30_000,
  ) {
    this.startedPort = port;
    this.wss.on('connection', (socket) => this.onConnection(socket));
    // A per-socket protocol error (e.g. an oversized frame — WS_ERR_UNSUPPORTED_MESSAGE_LENGTH)
    // emits 'error' on the socket; without a listener Node crashes the whole process.
    this.wss.on('error', (error) => logger.warn({ err: (error as Error).message }, 'WebSocket server error'));
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
    const joinUrl = this.getJoinUrl(ip, room.code);
    logger.info({ roomCode: room.code, joinUrl, serverPort: this.startedPort }, 'Party server started');
  }

  async stop(): Promise<void> {
    clearInterval(this.timerInterval);
    for (const timer of this.disconnectTimers.values()) {
      clearTimeout(timer);
    }
    this.disconnectTimers.clear();
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
      lastReactionAt: 0,
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

    // Protocol-level socket errors (oversized frame, bad UTF-8, …). `ws` emits
    // 'error' here and, unhandled, it takes down the process — log and drop.
    socket.on('error', (error) => {
      logger.warn({ err: (error as Error).message }, 'WebSocket connection error — closing socket');
      try {
        socket.terminate();
      } catch {
        // already gone
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
            const playerId = ctx.playerId;
            this.roomManager.getRoom().markDisconnected(playerId, Date.now());
            this.broadcastRoomState();
            this.pushGameState();
            this.scheduleDisconnectFinalize(playerId);
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

    const remoteAddress = (socket as WebSocket & { _socket?: { remoteAddress?: string } })._socket?.remoteAddress ?? 'unknown';
    const roomCode = 'roomCode' in message.payload ? message.payload.roomCode : 'n/a';
    logger.info({ remoteAddress, type: message.type, roomCode }, 'Received client message');

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
        logger.warn({ remoteAddress, requestedRoomCode: message.payload.roomCode, actualRoomCode: room.code }, 'Rejecting JOIN_ROOM for invalid room code');
        this.send(socket, 'ERROR', { code: 'ROOM_NOT_FOUND', message: 'Invalid room code', recoverable: true });
        return;
      }

      if (message.payload.role === 'host') {
        ctx.role = 'host';
        this.hostConnections.add(socket);
        logger.info({ remoteAddress, roomCode: room.code, role: 'host' }, 'Host connected');
        this.send(socket, 'ROOM_JOINED', { roomCode: room.code, role: 'host', ownerPlayerId: room.ownerPlayerId });
        this.sendGameCatalog(socket);
        this.broadcastRoomState();
        return;
      }

      logger.info({ remoteAddress, roomCode: room.code, playerName: message.payload.playerName }, 'Player join request received');
      const { player, sessionToken } = room.joinPlayer(message.payload.playerName, message.payload.avatar, Date.now());
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
      this.sendGameCatalog(socket);
      this.broadcast('PLAYER_JOINED', { playerId: player.id, name: player.name, avatar: player.avatar });
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
        this.sendGameCatalog(socket);
        this.broadcastRoomState();
        return;
      }

      const player = room.reconnect(message.payload.sessionToken, Date.now());
      this.clearDisconnectTimer(player.id);
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
      this.sendGameCatalog(socket);
      this.broadcast('PLAYER_RECONNECTED', { playerId: player.id });
      this.broadcastRoomState();
      this.pushPrivateState(player.id);
      this.pushGameState();
      return;
    }

    if (message.type === 'SELECT_GAME') {
      this.assertOwner(ctx.playerId, ctx.role);
      room.selectGame(message.payload.gameId);
      this.broadcastGameCatalog();
      return;
    }

    if (message.type === 'SET_CONTENT_TIER') {
      this.assertOwner(ctx.playerId, ctx.role);
      try {
        room.setContentTier(message.payload.tier);
      } catch (error) {
        const [code, msg] = (error as Error).message.split(/:(.*)/s);
        this.send(socket, 'ERROR', { code: code ?? 'BAD_REQUEST', message: msg ?? 'Cannot change content intensity', recoverable: true });
        return;
      }
      this.broadcastGameCatalog();
      return;
    }

    if (message.type === 'SET_MATCH_LENGTH') {
      this.assertOwner(ctx.playerId, ctx.role);
      try {
        room.setMatchLength(message.payload.gameId, message.payload.length);
      } catch (error) {
        const [code, msg] = (error as Error).message.split(/:(.*)/s);
        this.send(socket, 'ERROR', { code: code ?? 'BAD_REQUEST', message: msg ?? 'Cannot change match length', recoverable: true });
        return;
      }
      this.broadcastGameCatalog();
      return;
    }

    if (message.type === 'START_GAME') {
      this.assertOwner(ctx.playerId, ctx.role);
      room.startGame(ctx.playerId ?? room.ownerPlayerId ?? null, message.payload.gameId);
      this.broadcast('GAME_STARTED', { gameId: room.selectedGameId });
      this.broadcastGameCatalog();
      this.pushGameState();
      this.flushGameEvents();
      this.broadcastRoomState();
      return;
    }

    if (message.type === 'END_GAME') {
      this.assertOwner(ctx.playerId, ctx.role);
      room.endGame();
      this.broadcast('GAME_ENDED', {});
      // Back in the lobby: re-sync the catalog so SELECT_GAME works again and the host can switch games.
      this.broadcastGameCatalog();
      this.broadcastRoomState();
      return;
    }

    if (message.type === 'NEXT_ROUND') {
      this.assertOwner(ctx.playerId, ctx.role);
      room.startNextRound();
      this.flushAndPublishState();
      this.broadcastRoomState();
      return;
    }

    if (message.type === 'PAUSE_GAME') {
      this.assertOwner(ctx.playerId, ctx.role);
      room.pauseGame();
      this.flushAndPublishState();
      return;
    }

    if (message.type === 'RESUME_GAME') {
      this.assertOwner(ctx.playerId, ctx.role);
      room.resumeGame();
      this.flushAndPublishState();
      return;
    }

    if (message.type === 'KICK_PLAYER') {
      this.assertOwner(ctx.playerId, ctx.role);
      const targetPlayerId = message.payload.targetPlayerId;
      this.clearDisconnectTimer(targetPlayerId);
      room.kickPlayer(targetPlayerId);
      this.playerConnections.delete(targetPlayerId);
      this.broadcast('PLAYER_LEFT', { playerId: targetPlayerId });
      this.broadcastRoomState();
      return;
    }

    if (message.type === 'LEAVE_ROOM') {
      // The player is walking away for good (phone "back to start"). Remove them
      // now instead of waiting out the disconnect grace; forget this socket's identity.
      if (ctx.playerId) {
        const leavingId = ctx.playerId;
        this.clearDisconnectTimer(leavingId);
        room.kickPlayer(leavingId);
        this.playerConnections.delete(leavingId);
        ctx.playerId = undefined;
        ctx.role = null;
        this.broadcast('PLAYER_LEFT', { playerId: leavingId });
        this.broadcastRoomState();
        this.flushAndPublishState();
      }
      return;
    }

    if (!ctx.playerId) {
      this.send(socket, 'ERROR', { code: 'NOT_AUTHENTICATED', message: 'Player session required', recoverable: true });
      return;
    }

    if (message.type === 'GAME_ACTION') {
      room.applyGameAction(ctx.playerId, message.payload.action);
      this.flushAndPublishState();
      return;
    }

    if (message.type === 'SEND_REACTION') {
      // Game-agnostic: light cooldown, then rebroadcast to the whole room.
      if (now - ctx.lastReactionAt < 1200) {
        return;
      }
      ctx.lastReactionAt = now;
      this.broadcast('REACTION', { playerId: ctx.playerId, reaction: message.payload.reaction, at: now });
      return;
    }

    if (message.type === 'UPDATE_AVATAR') {
      if (ctx.role !== 'player' || !ctx.playerId) {
        this.send(socket, 'ERROR', { code: 'NOT_ALLOWED', message: 'Only a joined player can change avatar', recoverable: true });
        return;
      }
      try {
        room.setAvatar(ctx.playerId, message.payload.avatar);
      } catch (error) {
        const [code, msg] = (error as Error).message.split(/:(.*)/s);
        this.send(socket, 'ERROR', { code: code ?? 'BAD_REQUEST', message: msg ?? 'Cannot change avatar', recoverable: true });
        return;
      }
      this.broadcastRoomState();
      return;
    }

    this.send(socket, 'ERROR', { code: 'NOT_IMPLEMENTED', message: 'Unsupported action', recoverable: true });
  }

  private flushAndPublishState(): void {
    this.pushGameState();
    this.flushGameEvents();
  }

  private catalogPayload() {
    const room = this.roomManager.getRoom();
    const games = gameCatalog();
    const matchLengths: Record<string, number> = {};
    for (const g of games) {
      const len = room.matchLengthFor(g.id);
      if (len !== undefined) matchLengths[g.id] = len;
    }
    return { games, selectedGameId: room.selectedGameId, contentTier: room.contentTier, matchLengths };
  }

  private broadcastGameCatalog(): void {
    this.broadcast('GAME_CATALOG', this.catalogPayload());
  }

  private sendGameCatalog(socket: WebSocket): void {
    this.send(socket, 'GAME_CATALOG', this.catalogPayload());
  }

  private flushGameEvents(): void {
    const room = this.roomManager.getRoom();
    const game = room.game;
    if (!game) {
      return;
    }
    for (const event of game.consumeEvents()) {
      this.broadcast('GAME_EVENT', { gameId: room.selectedGameId, event, stateVersion: room.stateVersion });
    }
  }

  private pushGameState(): void {
    const room = this.roomManager.getRoom();
    if (!room.game) {
      return;
    }
    this.broadcast('GAME_STATE_PUBLIC', {
      gameId: room.selectedGameId,
      state: room.game.getPublicState(),
      stateVersion: room.stateVersion,
    });
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
      this.send(socket, 'PLAYER_STATE_PRIVATE', { gameId: room.selectedGameId, state, stateVersion: room.stateVersion });
    }
  }

  private getJoinUrl(ip: string, roomCode: string): string {
    const explicitOrigin = process.env.PARTY_PUBLIC_URL ?? process.env.VITE_MOBILE_ORIGIN ?? process.env.MOBILE_APP_ORIGIN ?? process.env.PARTY_APP_ORIGIN;
    const frontendOrigin = explicitOrigin ?? `http://${ip}:5174`;
    return `${frontendOrigin.replace(/\/$/, '')}/join/${roomCode}`;
  }

  private async broadcastRoomState(): Promise<void> {
    const room = this.roomManager.getRoom();
    const ip = pickPrimaryLocalIPv4();
    const joinUrl = this.getJoinUrl(ip, room.code);
    logger.info({ roomCode: room.code, ip, joinUrl }, 'Broadcasting room state with QR join URL');
    const joinQrDataUrl = await QRCode.toDataURL(joinUrl, { margin: 1, scale: 6 });
    this.broadcast('ROOM_STATE', {
      roomCode: room.code,
      ownerPlayerId: room.ownerPlayerId,
      joinUrl,
      joinQrDataUrl,
      players: room.getPlayers().map((player) => ({ id: player.id, name: player.name, avatar: player.avatar, connected: player.connected })),
    });
  }

  private broadcastOwnerChanged(): void {
    this.broadcast('OWNER_CHANGED', { ownerPlayerId: this.roomManager.getRoom().ownerPlayerId });
  }

  private scheduleDisconnectFinalize(playerId: string): void {
    this.clearDisconnectTimer(playerId);
    const timer = setTimeout(() => {
      this.disconnectTimers.delete(playerId);
      const ownershipChanged = this.roomManager.getRoom().finalizeDisconnect(playerId);
      this.broadcast('PLAYER_LEFT', { playerId });
      if (ownershipChanged) {
        this.broadcastOwnerChanged();
      }
      this.broadcastRoomState();
    }, this.disconnectGraceMs);
    if (typeof timer.unref === 'function') {
      timer.unref();
    }
    this.disconnectTimers.set(playerId, timer);
  }

  private clearDisconnectTimer(playerId: string): void {
    const timer = this.disconnectTimers.get(playerId);
    if (timer) {
      clearTimeout(timer);
      this.disconnectTimers.delete(playerId);
    }
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

  private assertOwner(playerId?: string, role?: ClientCtx['role']): void {
    if (role === 'host') {
      return;
    }

    if (!playerId || this.roomManager.getRoom().ownerPlayerId !== playerId) {
      throw new Error('NOT_ALLOWED:Only owner can perform this action');
    }
  }

  private tickTimers(): void {
    const room = this.roomManager.getRoom();
    const game = room.game;
    if (!game || !isTurnTimed(game)) {
      return;
    }
    const timer = game.getTimer();
    if (!timer) {
      return;
    }

    const now = Date.now();
    if (now >= timer.expiresAt) {
      room.applyTimeout();
      this.flushAndPublishState();
      return;
    }

    this.pushGameState();
  }
}
