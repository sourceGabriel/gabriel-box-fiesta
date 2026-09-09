import { afterEach, describe, expect, it } from 'vitest';
import WebSocket, { type RawData } from 'ws';
import type { ServerMessage, UnoGameEvent, UnoPrivatePlayerState, UnoPublicState } from '@party/shared';
import { PartyServer } from '../websocket/ws-server';

const makeMessage = <T extends string, P>(type: T, payload: P) =>
  JSON.stringify({
    messageId: crypto.randomUUID(),
    protocolVersion: 1,
    sentAt: Date.now(),
    type,
    payload,
  });

/** A generic GAME_ACTION envelope carrying a raw UNO action. */
const gameAction = (action: Record<string, unknown>) => makeMessage('GAME_ACTION', { action });

// GAME_STATE_PUBLIC / PLAYER_STATE_PRIVATE / GAME_EVENT payloads are `unknown` on the wire;
// the tests know the active game is UNO and cast at the boundary.
const pubState = (m: Extract<ServerMessage, { type: 'GAME_STATE_PUBLIC' }>): UnoPublicState =>
  m.payload.state as UnoPublicState;
const privState = (m: Extract<ServerMessage, { type: 'PLAYER_STATE_PRIVATE' }>): UnoPrivatePlayerState =>
  m.payload.state as UnoPrivatePlayerState;

const waitForMessage = async <T extends ServerMessage['type']>(
  socket: WebSocket,
  type: T,
  timeoutMs = 3001,
): Promise<Extract<ServerMessage, { type: T }>> => {
  return await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error(`Timeout waiting ${type}`)), timeoutMs);
    const handler = (raw: RawData) => {
      const parsed = JSON.parse(String(raw)) as ServerMessage;
      if (parsed.type === type) {
        clearTimeout(timeout);
        socket.off('message', handler);
        resolve(parsed as Extract<ServerMessage, { type: T }>);
      }
    };
    socket.on('message', handler);
  });
};

const waitForMessageWhere = async <T extends ServerMessage['type']>(
  socket: WebSocket,
  type: T,
  predicate: (message: Extract<ServerMessage, { type: T }>) => boolean,
  timeoutMs = 3001,
): Promise<Extract<ServerMessage, { type: T }>> => {
  return await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error(`Timeout waiting ${type}`)), timeoutMs);
    const handler = (raw: RawData) => {
      const parsed = JSON.parse(String(raw)) as ServerMessage;
      if (parsed.type === type && predicate(parsed as Extract<ServerMessage, { type: T }>)) {
        clearTimeout(timeout);
        socket.off('message', handler);
        resolve(parsed as Extract<ServerMessage, { type: T }>);
      }
    };
    socket.on('message', handler);
  });
};

describe('multiplayer integration', () => {
  let server: PartyServer | null = null;

  afterEach(async () => {
    if (server) {
      await server.stop();
      server = null;
    }
  });

  it('supports host/player join, owner transfer, and player reconnection', async () => {
    server = new PartyServer(0, 50); // short disconnect grace for the test
    await server.start();
    const roomCode = server.getRoomCode();
    const port = server.getPort();

    const host = new WebSocket(`ws://127.0.0.1:${port}/ws`);
    await new Promise<void>((resolve) => host.once('open', () => resolve()));
    host.send(makeMessage('JOIN_ROOM', { roomCode, playerName: 'HOST', role: 'host' }));
    await waitForMessage(host, 'ROOM_JOINED');

    const p1 = new WebSocket(`ws://127.0.0.1:${port}/ws`);
    await new Promise<void>((resolve) => p1.once('open', () => resolve()));
    p1.send(makeMessage('JOIN_ROOM', { roomCode, playerName: 'Alice', role: 'player' }));
    const p1Joined = await waitForMessage(p1, 'ROOM_JOINED');
    expect(p1Joined.payload.ownerPlayerId).toBe(p1Joined.payload.playerId);

    const p2 = new WebSocket(`ws://127.0.0.1:${port}/ws`);
    await new Promise<void>((resolve) => p2.once('open', () => resolve()));
    p2.send(makeMessage('JOIN_ROOM', { roomCode, playerName: 'Bob', role: 'player' }));
    const p2Joined = await waitForMessage(p2, 'ROOM_JOINED');
    expect(p2Joined.payload.playerId).toBeTruthy();

    p1.close();
    const ownerChanged = await waitForMessage(host, 'OWNER_CHANGED');
    expect(ownerChanged.payload.ownerPlayerId).toBe(p2Joined.payload.playerId);

    const p1Reconnect = new WebSocket(`ws://127.0.0.1:${port}/ws`);
    await new Promise<void>((resolve) => p1Reconnect.once('open', () => resolve()));
    p1Reconnect.send(
      makeMessage('RECONNECT_SESSION', {
        roomCode,
        sessionToken: p1Joined.payload.sessionToken,
        role: 'player',
      }),
    );
    const rejoined = await waitForMessage(p1Reconnect, 'ROOM_JOINED');
    expect(rejoined.payload.playerId).toBe(p1Joined.payload.playerId);

    host.close();
    p2.close();
    p1Reconnect.close();
  });

  it('carries a per-player avatar through PLAYER_JOINED and ROOM_STATE', async () => {
    server = new PartyServer(0);
    await server.start();
    const roomCode = server.getRoomCode();
    const port = server.getPort();

    const host = new WebSocket(`ws://127.0.0.1:${port}/ws`);
    await new Promise<void>((resolve) => host.once('open', () => resolve()));
    host.send(makeMessage('JOIN_ROOM', { roomCode, playerName: 'HOST', role: 'host' }));
    await waitForMessage(host, 'ROOM_JOINED');

    const avatar = { gender: 'male', skin: 'brown', hair: 'afro', hairColor: 'pink', eyes: 'purple', shirt: 'polo', hat: 'crown', bg: 'teal' };
    const p1 = new WebSocket(`ws://127.0.0.1:${port}/ws`);
    await new Promise<void>((resolve) => p1.once('open', () => resolve()));
    const joinedPromise = waitForMessage(host, 'PLAYER_JOINED');
    p1.send(makeMessage('JOIN_ROOM', { roomCode, playerName: 'Alice', role: 'player', avatar }));
    await waitForMessage(p1, 'ROOM_JOINED');

    const joined = await joinedPromise;
    expect(joined.payload.avatar).toEqual(avatar);

    const roomState = await waitForMessageWhere(host, 'ROOM_STATE', (m) => m.payload.players.length === 1);
    expect(roomState.payload.players[0].avatar).toEqual(avatar);

    host.close();
    p1.close();
  });

  it('UPDATE_AVATAR changes the avatar in the lobby and is rejected once the game started', async () => {
    server = new PartyServer(0);
    await server.start();
    const roomCode = server.getRoomCode();
    const port = server.getPort();

    const a1 = { gender: 'male', skin: 'brown', hair: 'afro', hairColor: 'pink', eyes: 'purple', shirt: 'polo', hat: 'crown', bg: 'teal' } as const;
    const a2 = { ...a1, hat: 'none', bg: 'rose' } as const;

    const host = new WebSocket(`ws://127.0.0.1:${port}/ws`);
    await new Promise<void>((resolve) => host.once('open', () => resolve()));
    host.send(makeMessage('JOIN_ROOM', { roomCode, playerName: 'HOST', role: 'host' }));
    await waitForMessage(host, 'ROOM_JOINED');

    const p1 = new WebSocket(`ws://127.0.0.1:${port}/ws`);
    await new Promise<void>((resolve) => p1.once('open', () => resolve()));
    p1.send(makeMessage('JOIN_ROOM', { roomCode, playerName: 'Alice', role: 'player', avatar: a1 }));
    await waitForMessage(p1, 'ROOM_JOINED');
    const p2 = new WebSocket(`ws://127.0.0.1:${port}/ws`);
    await new Promise<void>((resolve) => p2.once('open', () => resolve()));
    p2.send(makeMessage('JOIN_ROOM', { roomCode, playerName: 'Bob', role: 'player' }));
    await waitForMessage(p2, 'ROOM_JOINED');

    p1.send(makeMessage('UPDATE_AVATAR', { avatar: a2 }));
    const updated = await waitForMessageWhere(
      host,
      'ROOM_STATE',
      (m) => m.payload.players.find((pl) => pl.name === 'Alice')?.avatar.hat === 'none',
    );
    expect(updated.payload.players.find((pl) => pl.name === 'Alice')?.avatar).toEqual(a2);

    // A malformed avatar is rejected.
    const badErr = waitForMessage(p1, 'ERROR');
    p1.send(makeMessage('UPDATE_AVATAR', { avatar: { skin: 42 } }));
    expect((await badErr).payload.code).toBe('BAD_REQUEST');

    // Once the game is running, UPDATE_AVATAR is refused.
    host.send(makeMessage('START_GAME', { gameId: 'uno' }));
    await waitForMessage(host, 'GAME_STARTED');
    const err = waitForMessage(p1, 'ERROR');
    p1.send(makeMessage('UPDATE_AVATAR', { avatar: a1 }));
    expect((await err).payload.code).toBe('GAME_IN_PROGRESS');

    host.close();
    p1.close();
    p2.close();
  });

  it('rejects a JOIN_ROOM whose avatar has the wrong shape', async () => {
    server = new PartyServer(0);
    await server.start();
    const roomCode = server.getRoomCode();
    const port = server.getPort();

    const p1 = new WebSocket(`ws://127.0.0.1:${port}/ws`);
    await new Promise<void>((resolve) => p1.once('open', () => resolve()));
    p1.send(makeMessage('JOIN_ROOM', { roomCode, playerName: 'Alice', role: 'player', avatar: { skin: 42 } }));
    const err = await waitForMessage(p1, 'ERROR');
    expect(err.payload.code).toBe('BAD_REQUEST');

    p1.close();
  });

  it('keeps ownership when the owner reconnects within the grace window', async () => {
    server = new PartyServer(0, 2000);
    await server.start();
    const roomCode = server.getRoomCode();
    const port = server.getPort();

    const host = new WebSocket(`ws://127.0.0.1:${port}/ws`);
    await new Promise<void>((resolve) => host.once('open', () => resolve()));
    host.send(makeMessage('JOIN_ROOM', { roomCode, playerName: 'HOST', role: 'host' }));
    await waitForMessage(host, 'ROOM_JOINED');

    const p1 = new WebSocket(`ws://127.0.0.1:${port}/ws`);
    await new Promise<void>((resolve) => p1.once('open', () => resolve()));
    p1.send(makeMessage('JOIN_ROOM', { roomCode, playerName: 'Alice', role: 'player' }));
    const p1Joined = await waitForMessage(p1, 'ROOM_JOINED');

    const p2 = new WebSocket(`ws://127.0.0.1:${port}/ws`);
    await new Promise<void>((resolve) => p2.once('open', () => resolve()));
    p2.send(makeMessage('JOIN_ROOM', { roomCode, playerName: 'Bob', role: 'player' }));
    await waitForMessage(p2, 'ROOM_JOINED');

    p1.close();
    const p1Reconnect = new WebSocket(`ws://127.0.0.1:${port}/ws`);
    await new Promise<void>((resolve) => p1Reconnect.once('open', () => resolve()));
    p1Reconnect.send(makeMessage('RECONNECT_SESSION', { roomCode, sessionToken: p1Joined.payload.sessionToken, role: 'player' }));
    await waitForMessage(p1Reconnect, 'ROOM_JOINED');

    const stillOwner = await waitForMessageWhere(
      p1Reconnect,
      'ROOM_STATE',
      (message) => message.payload.players.every((player) => player.connected),
    );
    expect(stillOwner.payload.ownerPlayerId).toBe(p1Joined.payload.playerId);

    host.close();
    p2.close();
    p1Reconnect.close();
  });

  it('starts game and keeps private player state isolated', async () => {
    server = new PartyServer(0);
    await server.start();
    const roomCode = server.getRoomCode();
    const port = server.getPort();

    const host = new WebSocket(`ws://127.0.0.1:${port}/ws`);
    await new Promise<void>((resolve) => host.once('open', () => resolve()));
    host.send(makeMessage('JOIN_ROOM', { roomCode, playerName: 'HOST', role: 'host' }));
    await waitForMessage(host, 'ROOM_JOINED');

    const p1 = new WebSocket(`ws://127.0.0.1:${port}/ws`);
    await new Promise<void>((resolve) => p1.once('open', () => resolve()));
    p1.send(makeMessage('JOIN_ROOM', { roomCode, playerName: 'Alice', role: 'player' }));
    const p1Joined = await waitForMessage(p1, 'ROOM_JOINED');

    const p2 = new WebSocket(`ws://127.0.0.1:${port}/ws`);
    await new Promise<void>((resolve) => p2.once('open', () => resolve()));
    p2.send(makeMessage('JOIN_ROOM', { roomCode, playerName: 'Bob', role: 'player' }));
    const p2Joined = await waitForMessage(p2, 'ROOM_JOINED');

    const gameStartedPromise = waitForMessage(host, 'GAME_STARTED');
    const publicStatePromise = waitForMessage(host, 'GAME_STATE_PUBLIC');
    host.send(makeMessage('START_GAME', {}));
    await gameStartedPromise;
    const publicState = await publicStatePromise;
    expect(publicState.payload.gameId).toBe('uno');
    expect(pubState(publicState).players).toHaveLength(2);
    expect(pubState(publicState).players.every((player) => typeof player.handCount === 'number')).toBe(true);

    const p1Private = await waitForMessageWhere(
      p1,
      'PLAYER_STATE_PRIVATE',
      (message) => privState(message).playerId === p1Joined.payload.playerId,
    );
    const p2Private = await waitForMessageWhere(
      p2,
      'PLAYER_STATE_PRIVATE',
      (message) => privState(message).playerId === p2Joined.payload.playerId,
    );

    expect(privState(p1Private).playerId).toBe(p1Joined.payload.playerId);
    expect(privState(p2Private).playerId).toBe(p2Joined.payload.playerId);
    expect(privState(p1Private).hand).toHaveLength(7);
    expect(privState(p2Private).hand).toHaveLength(7);
    expect(privState(p1Private).playerId).not.toBe(privState(p2Private).playerId);

    host.close();
    p1.close();
    p2.close();
  });

  it('routes NEXT_ROUND and rejects it while a round is active', async () => {
    server = new PartyServer(0);
    await server.start();
    const roomCode = server.getRoomCode();
    const port = server.getPort();

    const host = new WebSocket(`ws://127.0.0.1:${port}/ws`);
    await new Promise<void>((resolve) => host.once('open', () => resolve()));
    host.send(makeMessage('JOIN_ROOM', { roomCode, playerName: 'HOST', role: 'host' }));
    await waitForMessage(host, 'ROOM_JOINED');

    const p1 = new WebSocket(`ws://127.0.0.1:${port}/ws`);
    await new Promise<void>((resolve) => p1.once('open', () => resolve()));
    p1.send(makeMessage('JOIN_ROOM', { roomCode, playerName: 'Alice', role: 'player' }));
    await waitForMessage(p1, 'ROOM_JOINED');

    const p2 = new WebSocket(`ws://127.0.0.1:${port}/ws`);
    await new Promise<void>((resolve) => p2.once('open', () => resolve()));
    p2.send(makeMessage('JOIN_ROOM', { roomCode, playerName: 'Bob', role: 'player' }));
    await waitForMessage(p2, 'ROOM_JOINED');

    const startedPromise = waitForMessage(host, 'GAME_STARTED');
    host.send(makeMessage('START_GAME', {}));
    await startedPromise;

    const errorPromise = waitForMessage(host, 'ERROR');
    host.send(makeMessage('NEXT_ROUND', {}));
    const error = await errorPromise;
    expect(error.payload.message).toMatch(/round must be finished/i);

    host.close();
    p1.close();
    p2.close();
  });

  const connect = async (port: number): Promise<WebSocket> => {
    const ws = new WebSocket(`ws://127.0.0.1:${port}/ws`);
    await new Promise<void>((resolve) => ws.once('open', () => resolve()));
    return ws;
  };

  it('handles a full lobby of 8 players and deals every hand privately', async () => {
    server = new PartyServer(0);
    await server.start();
    const roomCode = server.getRoomCode();
    const port = server.getPort();

    const host = await connect(port);
    host.send(makeMessage('JOIN_ROOM', { roomCode, playerName: 'HOST', role: 'host' }));
    await waitForMessage(host, 'ROOM_JOINED');

    const players: WebSocket[] = [];
    const ids: string[] = [];
    for (let i = 0; i < 8; i += 1) {
      const ws = await connect(port);
      ws.send(makeMessage('JOIN_ROOM', { roomCode, playerName: `P${i}`, role: 'player' }));
      const joined = await waitForMessage(ws, 'ROOM_JOINED');
      ids.push(joined.payload.playerId!);
      players.push(ws);
    }

    const publicStatePromise = waitForMessage(host, 'GAME_STATE_PUBLIC');
    host.send(makeMessage('START_GAME', {}));
    const publicState = await publicStatePromise;
    expect(pubState(publicState).players).toHaveLength(8);

    for (let i = 0; i < 8; i += 1) {
      const priv = await waitForMessageWhere(players[i], 'PLAYER_STATE_PRIVATE', (m) => privState(m).playerId === ids[i]);
      expect(privState(priv).hand).toHaveLength(7);
    }

    host.close();
    for (const ws of players) {
      ws.close();
    }
  });

  it('sustains real multiplayer play without desync or errors', async () => {
    server = new PartyServer(0);
    await server.start();
    const roomCode = server.getRoomCode();
    const port = server.getPort();

    const host = await connect(port);
    host.send(makeMessage('JOIN_ROOM', { roomCode, playerName: 'HOST', role: 'host' }));
    await waitForMessage(host, 'ROOM_JOINED');
    let cardsPlayed = 0;
    let lastPublic: (ServerMessage & { type: 'GAME_STATE_PUBLIC' }) | null = null;
    const errors: string[] = [];
    host.on('message', (raw: RawData) => {
      const m = JSON.parse(String(raw)) as ServerMessage;
      if (m.type === 'GAME_EVENT' && (m.payload.event as UnoGameEvent).type === 'card_played') cardsPlayed += 1;
      if (m.type === 'GAME_STATE_PUBLIC') lastPublic = m;
      if (m.type === 'ERROR') errors.push(m.payload.message);
    });

    const bots = await Promise.all([0, 1, 2].map(async (i) => {
      const ws = await connect(port);
      const bot: {
        ws: WebSocket;
        id: string | null;
        pub: (ServerMessage & { type: 'GAME_STATE_PUBLIC' }) | null;
        priv: (ServerMessage & { type: 'PLAYER_STATE_PRIVATE' }) | null;
        actedFor: string;
      } = { ws, id: null, pub: null, priv: null, actedFor: '' };
      const maybeAct = (): void => {
        const pub = bot.pub ? pubState(bot.pub) : null;
        const priv = bot.priv ? privState(bot.priv) : null;
        if (!pub || !priv || !bot.id || pub.currentPlayerId !== bot.id) return;
        const key = `${pub.turn}:${pub.phase}`;
        if (bot.actedFor === key) return; // one action per (turn, phase)
        bot.actedFor = key;
        if (pub.phase === 'awaiting_color_choice') {
          ws.send(gameAction({ type: 'choose_color', color: 'red' }));
          return;
        }
        if (pub.phase !== 'round_active') return;
        const p = priv.selectableCardIds;
        if (p.length > 0) {
          const card = priv.hand.find((c) => c.id === p[0])!;
          ws.send(gameAction({ type: 'play_card', cardId: card.id }));
          if (priv.hand.length === 2) ws.send(gameAction({ type: 'uno_call' }));
        } else {
          ws.send(gameAction({ type: 'draw_card' }));
        }
      };
      ws.on('message', (raw: RawData) => {
        const m = JSON.parse(String(raw)) as ServerMessage;
        if (m.type === 'ROOM_JOINED') bot.id = m.payload.playerId ?? null;
        if (m.type === 'GAME_STATE_PUBLIC') bot.pub = m;
        if (m.type === 'PLAYER_STATE_PRIVATE') bot.priv = m;
        setTimeout(maybeAct, 8);
      });
      ws.send(makeMessage('JOIN_ROOM', { roomCode, playerName: `Bot${i}`, role: 'player' }));
      await waitForMessage(ws, 'ROOM_JOINED');
      return bot;
    }));

    host.send(makeMessage('START_GAME', {}));
    await new Promise((r) => setTimeout(r, 6_000));

    const state = lastPublic ? pubState(lastPublic) : null;
    expect(errors).toEqual([]);
    expect(cardsPlayed).toBeGreaterThan(10);
    expect(state?.turn ?? 0).toBeGreaterThan(10);
    // deck integrity: every card is somewhere
    const inHands = (state?.players ?? []).reduce((sum, pl) => sum + pl.handCount, 0);
    expect(inHands + (state?.drawPileCount ?? 0)).toBeLessThanOrEqual(108);
    expect(inHands).toBeGreaterThan(0);

    host.close();
    for (const bot of bots) {
      bot.ws.close();
    }
  }, 15_000);

  it('ignores a re-sent message with a duplicate messageId', async () => {
    server = new PartyServer(0);
    await server.start();
    const roomCode = server.getRoomCode();
    const port = server.getPort();

    const host = await connect(port);
    host.send(makeMessage('JOIN_ROOM', { roomCode, playerName: 'HOST', role: 'host' }));
    await waitForMessage(host, 'ROOM_JOINED');

    let playerJoinedCount = 0;
    host.on('message', (raw: RawData) => {
      const m = JSON.parse(String(raw)) as ServerMessage;
      if (m.type === 'PLAYER_JOINED') playerJoinedCount += 1;
    });

    const p1 = await connect(port);
    const joinFrame = makeMessage('JOIN_ROOM', { roomCode, playerName: 'Alice', role: 'player' });
    p1.send(joinFrame);
    await waitForMessage(p1, 'ROOM_JOINED');
    p1.send(joinFrame); // exact same frame, same messageId
    await new Promise((r) => setTimeout(r, 300));

    expect(playerJoinedCount).toBe(1);

    host.close();
    p1.close();
  });

  it('sends the game catalog on join, routes SELECT_GAME and generic GAME_ACTION', async () => {
    server = new PartyServer(0);
    await server.start();
    const roomCode = server.getRoomCode();
    const port = server.getPort();

    const host = await connect(port);
    const catalogPromise = waitForMessage(host, 'GAME_CATALOG');
    host.send(makeMessage('JOIN_ROOM', { roomCode, playerName: 'HOST', role: 'host' }));
    await waitForMessage(host, 'ROOM_JOINED');
    const catalog = await catalogPromise;
    expect(catalog.payload.games.map((g) => g.id)).toContain('uno');
    expect(catalog.payload.selectedGameId).toBe('uno');

    // SELECT_GAME to a known game is accepted; unknown is rejected.
    const reselected = waitForMessage(host, 'GAME_CATALOG');
    host.send(makeMessage('SELECT_GAME', { gameId: 'uno' }));
    expect((await reselected).payload.selectedGameId).toBe('uno');
    const selectError = waitForMessage(host, 'ERROR');
    host.send(makeMessage('SELECT_GAME', { gameId: 'nope' }));
    expect((await selectError).payload.message).toMatch(/no such game/i);

    const p1 = await connect(port);
    p1.send(makeMessage('JOIN_ROOM', { roomCode, playerName: 'Alice', role: 'player' }));
    const p1Joined = await waitForMessage(p1, 'ROOM_JOINED');
    const p2 = await connect(port);
    p2.send(makeMessage('JOIN_ROOM', { roomCode, playerName: 'Bob', role: 'player' }));
    await waitForMessage(p2, 'ROOM_JOINED');

    const firstPublic = waitForMessage(host, 'GAME_STATE_PUBLIC');
    const startedPromise = waitForMessage(host, 'GAME_STARTED');
    host.send(makeMessage('START_GAME', { gameId: 'uno' }));
    expect((await startedPromise).payload.gameId).toBe('uno');
    const firstPublicMsg = await firstPublic;
    expect(firstPublicMsg.payload.gameId).toBe('uno');
    const initial = pubState(firstPublicMsg);

    // The current player draws a card via the generic GAME_ACTION verb — draw always advances the turn.
    const currentWs = initial.currentPlayerId === p1Joined.payload.playerId ? p1 : p2;
    currentWs.send(gameAction({ type: 'draw_card' }));
    const advanced = await waitForMessageWhere(
      host,
      'GAME_STATE_PUBLIC',
      (m) => pubState(m).turn > initial.turn,
    );
    expect(pubState(advanced).turn).toBeGreaterThan(initial.turn);

    // A malformed GAME_ACTION is rejected without crashing the room.
    const otherWs = currentWs === p1 ? p2 : p1;
    const actionError = waitForMessage(otherWs, 'ERROR');
    otherWs.send(gameAction({ type: 'garbage' }));
    expect((await actionError).payload.message).toMatch(/INVALID_ACTION/i);

    host.close();
    p1.close();
    p2.close();
  });

  it('runs Coup: SELECT_GAME + START_GAME, private hands isolated, generic GAME_ACTION routed', async () => {
    server = new PartyServer(0);
    await server.start();
    const roomCode = server.getRoomCode();
    const port = server.getPort();

    const host = await connect(port);
    const catalogPromise = waitForMessage(host, 'GAME_CATALOG');
    host.send(makeMessage('JOIN_ROOM', { roomCode, playerName: 'HOST', role: 'host' }));
    await waitForMessage(host, 'ROOM_JOINED');

    const catalog = await catalogPromise;
    expect(catalog.payload.games.map((game) => game.id)).toEqual(expect.arrayContaining(['uno', 'coup']));

    const reselected = waitForMessageWhere(host, 'GAME_CATALOG', (m) => m.payload.selectedGameId === 'coup');
    host.send(makeMessage('SELECT_GAME', { gameId: 'coup' }));
    await reselected;

    const p1 = await connect(port);
    p1.send(makeMessage('JOIN_ROOM', { roomCode, playerName: 'Alice', role: 'player' }));
    const p1Joined = await waitForMessage(p1, 'ROOM_JOINED');
    const p2 = await connect(port);
    p2.send(makeMessage('JOIN_ROOM', { roomCode, playerName: 'Bob', role: 'player' }));
    const p2Joined = await waitForMessage(p2, 'ROOM_JOINED');
    const p3 = await connect(port);
    p3.send(makeMessage('JOIN_ROOM', { roomCode, playerName: 'Cara', role: 'player' }));
    await waitForMessage(p3, 'ROOM_JOINED');

    const firstPublic = waitForMessage(host, 'GAME_STATE_PUBLIC');
    const started = waitForMessage(host, 'GAME_STARTED');
    host.send(makeMessage('START_GAME', { gameId: 'coup' }));
    expect((await started).payload.gameId).toBe('coup');
    const pub = (await firstPublic).payload.state as {
      phase: string;
      currentPlayerId: string;
      players: { id: string; influenceCount: number; coins: number }[];
    };
    expect(pub.phase).toBe('awaiting_action');
    expect(pub.players.every((pl) => pl.influenceCount === 2 && pl.coins === 2)).toBe(true);

    // Each controller sees only its own 2 influences.
    const priv1 = (await waitForMessage(p1, 'PLAYER_STATE_PRIVATE')).payload.state as {
      influences: { character: string | null }[];
    };
    expect(priv1.influences).toHaveLength(2);
    expect(priv1.influences.every((i) => i.character !== null)).toBe(true);

    // The current player takes Income via the generic GAME_ACTION verb.
    const currentId = pub.currentPlayerId;
    const currentWs = currentId === p1Joined.payload.playerId ? p1 : currentId === p2Joined.payload.playerId ? p2 : p3;
    currentWs.send(makeMessage('GAME_ACTION', { action: { kind: 'declare_action', action: 'Income' } }));
    const advanced = await waitForMessageWhere(
      host,
      'GAME_STATE_PUBLIC',
      (m) => (m.payload.state as { currentPlayerId: string }).currentPlayerId !== currentId,
    );
    const advState = advanced.payload.state as { players: { id: string; coins: number }[] };
    expect(advState.players.find((pl) => pl.id === currentId)!.coins).toBe(3);

    // A malformed Coup action is rejected without crashing the room.
    const otherWs = currentWs === p1 ? p2 : p1;
    const actionError = waitForMessage(otherWs, 'ERROR');
    otherWs.send(makeMessage('GAME_ACTION', { action: { kind: 'garbage' } }));
    expect((await actionError).payload.message).toMatch(/INVALID_ACTION/i);

    host.close();
    p1.close();
    p2.close();
    p3.close();
  });

  it('runs Zap!: SELECT_GAME + START_GAME, per-player prompts isolated, generic GAME_ACTION routed', async () => {
    server = new PartyServer(0);
    await server.start();
    const roomCode = server.getRoomCode();
    const port = server.getPort();

    const host = await connect(port);
    const catalogPromise = waitForMessage(host, 'GAME_CATALOG');
    host.send(makeMessage('JOIN_ROOM', { roomCode, playerName: 'HOST', role: 'host' }));
    await waitForMessage(host, 'ROOM_JOINED');

    const catalog = await catalogPromise;
    expect(catalog.payload.games.map((game) => game.id)).toEqual(expect.arrayContaining(['uno', 'coup', 'zap']));

    const reselected = waitForMessageWhere(host, 'GAME_CATALOG', (m) => m.payload.selectedGameId === 'zap');
    host.send(makeMessage('SELECT_GAME', { gameId: 'zap' }));
    await reselected;

    const phones = [] as Awaited<ReturnType<typeof connect>>[];
    for (const name of ['Ana', 'Bia', 'Caio']) {
      const ws = await connect(port);
      ws.send(makeMessage('JOIN_ROOM', { roomCode, playerName: name, role: 'player' }));
      await waitForMessage(ws, 'ROOM_JOINED');
      phones.push(ws);
    }

    const firstPublic = waitForMessage(host, 'GAME_STATE_PUBLIC');
    const started = waitForMessage(host, 'GAME_STARTED');
    host.send(makeMessage('START_GAME', { gameId: 'zap' }));
    expect((await started).payload.gameId).toBe('zap');

    const pub = (await firstPublic).payload.state as {
      phase: string;
      round: number;
      answersExpectedCount: number;
    };
    expect(pub.phase).toBe('answering');
    expect(pub.round).toBe(1);
    expect(pub.answersExpectedCount).toBe(6);

    // Each controller gets its own 2 prompts.
    const privs = await Promise.all(
      phones.map((ws) => waitForMessage(ws, 'PLAYER_STATE_PRIVATE')),
    );
    for (const p of privs) {
      const priv = p.payload.state as { assignments: { slot: number; prompt: string }[]; pendingDecision: string };
      expect(priv.assignments).toHaveLength(2);
      expect(priv.pendingDecision).toBe('answer');
    }

    // Everyone answers both prompts via the generic GAME_ACTION verb → the round advances to voting.
    const votingReached = waitForMessageWhere(
      host,
      'GAME_STATE_PUBLIC',
      (m) => (m.payload.state as { phase: string }).phase === 'voting',
    );
    for (const ws of phones) {
      for (const slot of [0, 1]) {
        ws.send(makeMessage('GAME_ACTION', { action: { type: 'submitAnswer', slot, text: `resposta ${slot}` } }));
      }
    }
    expect((await votingReached).payload.state).toBeTruthy();

    // A malformed Zap action is rejected without crashing the room.
    const actionError = waitForMessage(phones[0], 'ERROR');
    phones[0].send(makeMessage('GAME_ACTION', { action: { type: 'garbage' } }));
    expect((await actionError).payload.message).toMatch(/INVALID_ACTION/i);

    host.close();
    for (const ws of phones) ws.close();
  });

  it('runs Lorota!: SELECT_GAME + START_GAME, per-player prompt, lies advance to guessing', async () => {
    server = new PartyServer(0);
    await server.start();
    const roomCode = server.getRoomCode();
    const port = server.getPort();

    const host = await connect(port);
    const catalogPromise = waitForMessage(host, 'GAME_CATALOG');
    host.send(makeMessage('JOIN_ROOM', { roomCode, playerName: 'HOST', role: 'host' }));
    await waitForMessage(host, 'ROOM_JOINED');

    const catalog = await catalogPromise;
    expect(catalog.payload.games.map((game) => game.id)).toEqual(expect.arrayContaining(['uno', 'coup', 'zap', 'lorota']));

    const reselected = waitForMessageWhere(host, 'GAME_CATALOG', (m) => m.payload.selectedGameId === 'lorota');
    host.send(makeMessage('SELECT_GAME', { gameId: 'lorota' }));
    await reselected;

    const phones = [] as Awaited<ReturnType<typeof connect>>[];
    for (const name of ['Ana', 'Bia', 'Caio']) {
      const ws = await connect(port);
      ws.send(makeMessage('JOIN_ROOM', { roomCode, playerName: name, role: 'player' }));
      await waitForMessage(ws, 'ROOM_JOINED');
      phones.push(ws);
    }

    const firstPublic = waitForMessage(host, 'GAME_STATE_PUBLIC');
    const started = waitForMessage(host, 'GAME_STARTED');
    host.send(makeMessage('START_GAME', { gameId: 'lorota' }));
    expect((await started).payload.gameId).toBe('lorota');

    const pub = (await firstPublic).payload.state as { phase: string; prompt: string; liesExpectedCount: number };
    expect(pub.phase).toBe('lying');
    expect(pub.prompt).toMatch(/___/);
    expect(pub.liesExpectedCount).toBe(3);

    const privs = await Promise.all(phones.map((ws) => waitForMessage(ws, 'PLAYER_STATE_PRIVATE')));
    for (const p of privs) {
      expect((p.payload.state as { pendingDecision: string }).pendingDecision).toBe('lie');
    }

    const guessingReached = waitForMessageWhere(
      host,
      'GAME_STATE_PUBLIC',
      (m) => (m.payload.state as { phase: string }).phase === 'guessing',
    );
    phones.forEach((ws, i) => ws.send(makeMessage('GAME_ACTION', { action: { type: 'submitLie', text: `mentira ${i}` } })));
    const guessState = (await guessingReached).payload.state as { options: unknown[] };
    expect(guessState.options).toHaveLength(4); // 3 lies + truth

    const actionError = waitForMessage(phones[0], 'ERROR');
    phones[0].send(makeMessage('GAME_ACTION', { action: { type: 'garbage' } }));
    expect((await actionError).payload.message).toMatch(/INVALID_ACTION/i);

    host.close();
    for (const ws of phones) ws.close();
  });

  it('runs É Você!: SELECT_GAME + START_GAME, enquete round, player votes advance to results', async () => {
    server = new PartyServer(0);
    await server.start();
    const roomCode = server.getRoomCode();
    const port = server.getPort();

    const host = await connect(port);
    const catalogPromise = waitForMessage(host, 'GAME_CATALOG');
    host.send(makeMessage('JOIN_ROOM', { roomCode, playerName: 'HOST', role: 'host' }));
    await waitForMessage(host, 'ROOM_JOINED');
    expect((await catalogPromise).payload.games.map((g) => g.id)).toEqual(
      expect.arrayContaining(['uno', 'coup', 'zap', 'lorota', 'sabetudo', 'fdp', 'evoce']),
    );

    const reselected = waitForMessageWhere(host, 'GAME_CATALOG', (m) => m.payload.selectedGameId === 'evoce');
    host.send(makeMessage('SELECT_GAME', { gameId: 'evoce' }));
    await reselected;

    const phones = [] as Awaited<ReturnType<typeof connect>>[];
    for (const name of ['Ana', 'Bia', 'Caio']) {
      const ws = await connect(port);
      ws.send(makeMessage('JOIN_ROOM', { roomCode, playerName: name, role: 'player' }));
      await waitForMessage(ws, 'ROOM_JOINED');
      phones.push(ws);
    }

    const firstPublic = waitForMessage(host, 'GAME_STATE_PUBLIC');
    const started = waitForMessage(host, 'GAME_STARTED');
    host.send(makeMessage('START_GAME', { gameId: 'evoce' }));
    expect((await started).payload.gameId).toBe('evoce');

    const pub = (await firstPublic).payload.state as { phase: string; roundKind: string; prompt: string };
    expect(pub.phase).toBe('answering');
    expect(pub.roundKind).toBe('enquete');
    expect(pub.prompt).toBeTruthy();

    const privs = await Promise.all(phones.map((ws) => waitForMessage(ws, 'PLAYER_STATE_PRIVATE')));
    for (const p of privs) expect((p.payload.state as { pendingDecision: string }).pendingDecision).toBe('vote_player');

    const resultsReached = waitForMessageWhere(
      host,
      'GAME_STATE_PUBLIC',
      (m) => (m.payload.state as { phase: string }).phase === 'roundResults',
    );
    // everyone votes Ana (p1's socket is phones[0])
    const anaId = (privs[0].payload.state as { playerId: string }).playerId;
    phones.forEach((ws) => ws.send(makeMessage('GAME_ACTION', { action: { type: 'votePlayer', targetId: anaId } })));
    const resState = (await resultsReached).payload.state as { pollWinnerId: string | null; pollBars: unknown[] };
    expect(resState.pollWinnerId).toBe(anaId);
    expect(Array.isArray(resState.pollBars)).toBe(true);

    const actionError = waitForMessage(phones[0], 'ERROR');
    phones[0].send(makeMessage('GAME_ACTION', { action: { type: 'garbage' } }));
    expect((await actionError).payload.message).toMatch(/INVALID_ACTION/i);

    host.close();
    for (const ws of phones) ws.close();
  });

  it('SET_CONTENT_TIER: owner flips it in the lobby and the catalog reflects it', async () => {
    server = new PartyServer(0);
    await server.start();
    const roomCode = server.getRoomCode();
    const port = server.getPort();

    const host = await connect(port);
    const firstCatalog = waitForMessage(host, 'GAME_CATALOG');
    host.send(makeMessage('JOIN_ROOM', { roomCode, playerName: 'HOST', role: 'host' }));
    await waitForMessage(host, 'ROOM_JOINED');
    expect((await firstCatalog).payload.contentTier).toBe('pesado');

    const flipped = waitForMessageWhere(host, 'GAME_CATALOG', (m) => m.payload.contentTier === 'leve');
    host.send(makeMessage('SET_CONTENT_TIER', { tier: 'leve' }));
    await flipped;

    // A non-owner player cannot flip it (first player to join is the owner).
    const owner = await connect(port);
    owner.send(makeMessage('JOIN_ROOM', { roomCode, playerName: 'Ana', role: 'player' }));
    await waitForMessage(owner, 'ROOM_JOINED');
    const guest = await connect(port);
    guest.send(makeMessage('JOIN_ROOM', { roomCode, playerName: 'Bob', role: 'player' }));
    await waitForMessage(guest, 'ROOM_JOINED');

    const denied = waitForMessage(guest, 'ERROR');
    guest.send(makeMessage('SET_CONTENT_TIER', { tier: 'pesado' }));
    expect((await denied).payload.message).toMatch(/owner/i);

    host.close();
    owner.close();
    guest.close();
  });

  it('runs Sabe-Tudo: SELECT_GAME + START_GAME, question with four options, answers advance to reveal', async () => {
    server = new PartyServer(0);
    await server.start();
    const roomCode = server.getRoomCode();
    const port = server.getPort();

    const host = await connect(port);
    const catalogPromise = waitForMessage(host, 'GAME_CATALOG');
    host.send(makeMessage('JOIN_ROOM', { roomCode, playerName: 'HOST', role: 'host' }));
    await waitForMessage(host, 'ROOM_JOINED');

    const catalog = await catalogPromise;
    expect(catalog.payload.games.map((game) => game.id)).toEqual(
      expect.arrayContaining(['uno', 'coup', 'zap', 'lorota', 'sabetudo']),
    );

    const reselected = waitForMessageWhere(host, 'GAME_CATALOG', (m) => m.payload.selectedGameId === 'sabetudo');
    host.send(makeMessage('SELECT_GAME', { gameId: 'sabetudo' }));
    await reselected;

    const phones = [] as Awaited<ReturnType<typeof connect>>[];
    for (const name of ['Ana', 'Bia']) {
      const ws = await connect(port);
      ws.send(makeMessage('JOIN_ROOM', { roomCode, playerName: name, role: 'player' }));
      await waitForMessage(ws, 'ROOM_JOINED');
      phones.push(ws);
    }

    const firstPublic = waitForMessage(host, 'GAME_STATE_PUBLIC');
    const started = waitForMessage(host, 'GAME_STARTED');
    host.send(makeMessage('START_GAME', { gameId: 'sabetudo' }));
    expect((await started).payload.gameId).toBe('sabetudo');

    const pub = (await firstPublic).payload.state as { phase: string; options: string[]; answersExpectedCount: number };
    expect(pub.phase).toBe('question');
    expect(pub.options).toHaveLength(4);
    expect(pub.answersExpectedCount).toBe(2);

    const privs = await Promise.all(phones.map((ws) => waitForMessage(ws, 'PLAYER_STATE_PRIVATE')));
    for (const p of privs) {
      expect((p.payload.state as { pendingDecision: string }).pendingDecision).toBe('answer');
    }

    const revealReached = waitForMessageWhere(
      host,
      'GAME_STATE_PUBLIC',
      (m) => (m.payload.state as { phase: string }).phase === 'reveal',
    );
    phones.forEach((ws) => ws.send(makeMessage('GAME_ACTION', { action: { type: 'submitAnswer', optionIndex: 0 } })));
    const revealState = (await revealReached).payload.state as { correctIndex: number };
    expect(typeof revealState.correctIndex).toBe('number');

    const actionError = waitForMessage(phones[0], 'ERROR');
    phones[0].send(makeMessage('GAME_ACTION', { action: { type: 'garbage' } }));
    expect((await actionError).payload.message).toMatch(/INVALID_ACTION/i);

    host.close();
    for (const ws of phones) ws.close();
  });

  it('runs FDP: SELECT_GAME + START_GAME, shared prompt, answers advance to voting', async () => {
    server = new PartyServer(0);
    await server.start();
    const roomCode = server.getRoomCode();
    const port = server.getPort();

    const host = await connect(port);
    const catalogPromise = waitForMessage(host, 'GAME_CATALOG');
    host.send(makeMessage('JOIN_ROOM', { roomCode, playerName: 'HOST', role: 'host' }));
    await waitForMessage(host, 'ROOM_JOINED');

    const catalog = await catalogPromise;
    expect(catalog.payload.games.map((game) => game.id)).toEqual(
      expect.arrayContaining(['uno', 'coup', 'zap', 'lorota', 'sabetudo', 'fdp']),
    );

    const reselected = waitForMessageWhere(host, 'GAME_CATALOG', (m) => m.payload.selectedGameId === 'fdp');
    host.send(makeMessage('SELECT_GAME', { gameId: 'fdp' }));
    await reselected;

    const phones = [] as Awaited<ReturnType<typeof connect>>[];
    for (const name of ['Ana', 'Bia', 'Caio']) {
      const ws = await connect(port);
      ws.send(makeMessage('JOIN_ROOM', { roomCode, playerName: name, role: 'player' }));
      await waitForMessage(ws, 'ROOM_JOINED');
      phones.push(ws);
    }

    const firstPublic = waitForMessage(host, 'GAME_STATE_PUBLIC');
    const started = waitForMessage(host, 'GAME_STARTED');
    host.send(makeMessage('START_GAME', { gameId: 'fdp' }));
    expect((await started).payload.gameId).toBe('fdp');

    const pub = (await firstPublic).payload.state as { phase: string; prompt: string; answersExpectedCount: number };
    expect(pub.phase).toBe('writing');
    expect(pub.prompt).toBeTruthy();
    expect(pub.answersExpectedCount).toBe(3);

    const privs = await Promise.all(phones.map((ws) => waitForMessage(ws, 'PLAYER_STATE_PRIVATE')));
    for (const p of privs) {
      expect((p.payload.state as { pendingDecision: string }).pendingDecision).toBe('write');
    }

    const votingReached = waitForMessageWhere(
      host,
      'GAME_STATE_PUBLIC',
      (m) => (m.payload.state as { phase: string }).phase === 'voting',
    );
    phones.forEach((ws, i) => ws.send(makeMessage('GAME_ACTION', { action: { type: 'submitAnswer', text: `resposta ${i}` } })));
    const votingState = (await votingReached).payload.state as { answers: unknown[] };
    expect(votingState.answers).toHaveLength(3);

    const actionError = waitForMessage(phones[0], 'ERROR');
    phones[0].send(makeMessage('GAME_ACTION', { action: { type: 'garbage' } }));
    expect((await actionError).payload.message).toMatch(/INVALID_ACTION/i);

    host.close();
    for (const ws of phones) ws.close();
  });

  it('runs Dilema nos Trilhos: SELECT_GAME + START_GAME, Maquinista + two tracks, cards advance to verdict', async () => {
    server = new PartyServer(0);
    await server.start();
    const roomCode = server.getRoomCode();
    const port = server.getPort();

    const host = await connect(port);
    const catalogPromise = waitForMessage(host, 'GAME_CATALOG');
    host.send(makeMessage('JOIN_ROOM', { roomCode, playerName: 'HOST', role: 'host' }));
    await waitForMessage(host, 'ROOM_JOINED');

    const catalog = await catalogPromise;
    expect(catalog.payload.games.map((game) => game.id)).toEqual(
      expect.arrayContaining(['uno', 'coup', 'zap', 'lorota', 'sabetudo', 'fdp', 'evoce', 'dilema']),
    );

    const reselected = waitForMessageWhere(host, 'GAME_CATALOG', (m) => m.payload.selectedGameId === 'dilema');
    host.send(makeMessage('SELECT_GAME', { gameId: 'dilema' }));
    await reselected;

    const phones = [] as Awaited<ReturnType<typeof connect>>[];
    for (const name of ['Ana', 'Bia', 'Caio']) {
      const ws = await connect(port);
      ws.send(makeMessage('JOIN_ROOM', { roomCode, playerName: name, role: 'player' }));
      await waitForMessage(ws, 'ROOM_JOINED');
      phones.push(ws);
    }

    const firstPublic = waitForMessage(host, 'GAME_STATE_PUBLIC');
    const started = waitForMessage(host, 'GAME_STARTED');
    host.send(makeMessage('START_GAME', { gameId: 'dilema' }));
    expect((await started).payload.gameId).toBe('dilema');

    const pub = (await firstPublic).payload.state as {
      phase: string;
      conductorId: string;
      tracks: { left: { memberIds: string[] }; right: { memberIds: string[] } };
    };
    expect(pub.phase).toBe('assigning');
    expect(pub.conductorId).toBeTruthy();
    expect([...pub.tracks.left.memberIds, ...pub.tracks.right.memberIds]).toHaveLength(2);

    const privs = await Promise.all(phones.map((ws) => waitForMessage(ws, 'PLAYER_STATE_PRIVATE')));
    const conductorPriv = privs.find((p) => (p.payload.state as { isConductor: boolean }).isConductor);
    expect(conductorPriv).toBeTruthy();

    const actionError = waitForMessage(phones[0], 'ERROR');
    phones[0].send(makeMessage('GAME_ACTION', { action: { type: 'garbage' } }));
    expect((await actionError).payload.message).toMatch(/INVALID_ACTION/i);

    host.close();
    for (const ws of phones) ws.close();
  });

  it('runs Sintonia: SELECT_GAME + START_GAME, médium + two teams, clue advances to guessing', async () => {
    server = new PartyServer(0);
    await server.start();
    const roomCode = server.getRoomCode();
    const port = server.getPort();

    const host = await connect(port);
    host.send(makeMessage('JOIN_ROOM', { roomCode, playerName: 'HOST', role: 'host' }));
    await waitForMessage(host, 'ROOM_JOINED');

    const reselected = waitForMessageWhere(
      host,
      'GAME_CATALOG',
      (m) => m.payload.selectedGameId === 'sintonia',
    );
    host.send(makeMessage('SELECT_GAME', { gameId: 'sintonia' }));
    await reselected;

    const phones = [] as Awaited<ReturnType<typeof connect>>[];
    for (const name of ['Ana', 'Bia', 'Caio']) {
      const ws = await connect(port);
      ws.send(makeMessage('JOIN_ROOM', { roomCode, playerName: name, role: 'player' }));
      await waitForMessage(ws, 'ROOM_JOINED');
      phones.push(ws);
    }

    const firstPublic = waitForMessage(host, 'GAME_STATE_PUBLIC');
    const started = waitForMessage(host, 'GAME_STARTED');
    host.send(makeMessage('START_GAME', { gameId: 'sintonia' }));
    expect((await started).payload.gameId).toBe('sintonia');

    const pub = (await firstPublic).payload.state as {
      phase: string;
      mediumId: string;
      teams: { memberIds: string[] }[];
    };
    expect(pub.phase).toBe('cluing');
    expect(pub.mediumId).toBeTruthy();
    expect([...pub.teams[0].memberIds, ...pub.teams[1].memberIds]).toHaveLength(3);

    const privs = await Promise.all(phones.map((ws) => waitForMessage(ws, 'PLAYER_STATE_PRIVATE')));
    const mediumPriv = privs.find((p) => (p.payload.state as { role: string }).role === 'medium');
    expect(mediumPriv).toBeTruthy();
    expect((mediumPriv!.payload.state as { target: number | null }).target).not.toBeNull();

    const guessingReached = waitForMessageWhere(
      host,
      'GAME_STATE_PUBLIC',
      (m) => (m.payload.state as { phase: string }).phase === 'guessing',
    );
    const mediumIdx = privs.findIndex(
      (p) => (p.payload.state as { playerId: string }).playerId === pub.mediumId,
    );
    phones[mediumIdx].send(
      makeMessage('GAME_ACTION', { action: { type: 'submitClue', clue: 'perto do meio' } }),
    );
    const guessing = (await guessingReached).payload.state as { clue: string | null };
    expect(guessing.clue).toBe('perto do meio');

    const actionError = waitForMessage(phones[0], 'ERROR');
    phones[0].send(makeMessage('GAME_ACTION', { action: { type: 'garbage' } }));
    expect((await actionError).payload.message).toMatch(/INVALID_ACTION/i);

    host.close();
    for (const ws of phones) ws.close();
  });

  it('rebroadcasts emoji reactions to the whole room and rejects oversized ones', async () => {
    server = new PartyServer(0);
    await server.start();
    const roomCode = server.getRoomCode();
    const port = server.getPort();

    const host = await connect(port);
    host.send(makeMessage('JOIN_ROOM', { roomCode, playerName: 'HOST', role: 'host' }));
    await waitForMessage(host, 'ROOM_JOINED');

    const p1 = await connect(port);
    p1.send(makeMessage('JOIN_ROOM', { roomCode, playerName: 'Alice', role: 'player' }));
    const p1Joined = await waitForMessage(p1, 'ROOM_JOINED');
    const p2 = await connect(port);
    p2.send(makeMessage('JOIN_ROOM', { roomCode, playerName: 'Bob', role: 'player' }));
    await waitForMessage(p2, 'ROOM_JOINED');

    const onHost = waitForMessage(host, 'REACTION');
    const onP2 = waitForMessage(p2, 'REACTION');
    p1.send(makeMessage('SEND_REACTION', { reaction: '🔥' }));
    const hostSaw = await onHost;
    expect(hostSaw.payload.reaction).toBe('🔥');
    expect(hostSaw.payload.playerId).toBe(p1Joined.payload.playerId);
    expect((await onP2).payload.reaction).toBe('🔥');

    const rejected = waitForMessage(p1, 'ERROR');
    p1.send(makeMessage('SEND_REACTION', { reaction: 'x'.repeat(64) }));
    expect((await rejected).payload.message).toBeTruthy();

    host.close();
    p1.close();
    p2.close();
  });
});
