import { afterEach, describe, expect, it } from 'vitest';
import WebSocket, { type RawData } from 'ws';
import type { ServerMessage } from '@party/shared';
import { PartyServer } from '../websocket/ws-server';

const makeMessage = <T extends string, P>(type: T, payload: P) =>
  JSON.stringify({
    messageId: crypto.randomUUID(),
    protocolVersion: 1,
    sentAt: Date.now(),
    type,
    payload,
  });

const waitForMessage = async <T extends ServerMessage['type']>(
  socket: WebSocket,
  type: T,
  timeoutMs = 3000,
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
  timeoutMs = 3000,
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
    p1.send(makeMessage('START_GAME', {}));
    await gameStartedPromise;
    const publicState = await publicStatePromise;
    expect(publicState.payload.state.players).toHaveLength(2);
    expect(publicState.payload.state.players.every((player) => typeof player.handCount === 'number')).toBe(true);

    const p1Private = await waitForMessageWhere(
      p1,
      'PLAYER_STATE_PRIVATE',
      (message) => message.payload.state.playerId === p1Joined.payload.playerId,
    );
    const p2Private = await waitForMessageWhere(
      p2,
      'PLAYER_STATE_PRIVATE',
      (message) => message.payload.state.playerId === p2Joined.payload.playerId,
    );

    expect(p1Private.payload.state.playerId).toBe(p1Joined.payload.playerId);
    expect(p2Private.payload.state.playerId).toBe(p2Joined.payload.playerId);
    expect(p1Private.payload.state.hand).toHaveLength(7);
    expect(p2Private.payload.state.hand).toHaveLength(7);
    expect(p1Private.payload.state.playerId).not.toBe(p2Private.payload.state.playerId);

    host.close();
    p1.close();
    p2.close();
  });
});
