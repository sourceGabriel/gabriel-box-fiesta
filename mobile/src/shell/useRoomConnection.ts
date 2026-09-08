import { useEffect, useRef, useState } from 'react';
import type { AvatarSpec, ContentTier, GameMeta, ServerMessage } from '@party/shared';
import { getRoomCodeFromPath, makeMessage, wsOrigin, type Send } from './messages';
import {
  clearStoredSession,
  readStoredSessionKey,
  readToken,
  rememberActiveSession,
  sessionKeyFor,
  writeToken,
} from './session';

export type ShellPlayer = { id: string; name: string; avatar?: AvatarSpec; connected: boolean };
export type LiveReaction = { key: number; playerId: string; reaction: string; at: number };

const REACTION_TTL_MS = 4000;

export interface RoomConnection {
  roomCode: string;
  setRoomCode: (code: string) => void;
  playerId: string | null;
  connected: boolean;
  error: string;
  /** Lobby roster (from ROOM_STATE). During a game the game view uses its own public state instead. */
  roomPlayers: ShellPlayer[];
  catalog: GameMeta[];
  selectedGameId: string;
  contentTier: ContentTier;
  /** The game in progress for this player, or null while waiting in the lobby. */
  activeGameId: string | null;
  /** Latest GAME_STATE_PUBLIC / PLAYER_STATE_PRIVATE payloads — opaque; the game view casts them. */
  publicState: unknown | null;
  privateState: unknown | null;
  /** Emoji reactions currently on screen (auto-expire). Game-agnostic. */
  reactions: LiveReaction[];
  send: Send;
  /** Join the room (or silently resume an existing session for this name). */
  joinOrReconnect: (identity: { playerName: string; avatar: AvatarSpec }) => void;
}

export function useRoomConnection(): RoomConnection {
  const [roomCode, setRoomCode] = useState(getRoomCodeFromPath());
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState('');
  const [roomPlayers, setRoomPlayers] = useState<ShellPlayer[]>([]);
  const [catalog, setCatalog] = useState<GameMeta[]>([]);
  const [selectedGameId, setSelectedGameId] = useState('');
  const [contentTier, setContentTier] = useState<ContentTier>('pesado');
  const [activeGameId, setActiveGameId] = useState<string | null>(null);
  const [publicState, setPublicState] = useState<unknown | null>(null);
  const [privateState, setPrivateState] = useState<unknown | null>(null);
  const [reactions, setReactions] = useState<LiveReaction[]>([]);
  const reactionKeyRef = useRef(0);

  const socketRef = useRef<WebSocket | null>(null);
  const pendingSessionStorageKeyRef = useRef<string | null>(null);
  const activeSessionKeyRef = useRef<string | null>(readStoredSessionKey(getRoomCodeFromPath()));
  const roomCodeRef = useRef(roomCode);
  const errorTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    roomCodeRef.current = roomCode;
  }, [roomCode]);

  const showError = (message: string): void => {
    setError(message);
    if (errorTimerRef.current) {
      clearTimeout(errorTimerRef.current);
    }
    errorTimerRef.current = setTimeout(() => setError(''), 5000);
  };

  useEffect(() => {
    let keepAlive = true;
    let ws: WebSocket | null = null;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;
    let attempts = 0;

    const connect = (): void => {
      ws = new WebSocket(`${wsOrigin}/ws`);
      socketRef.current = ws;

      ws.onopen = () => {
        attempts = 0;
        setConnected(true);
        // On reconnect: if we hold a token for this room, resume the session immediately.
        const token = readToken(activeSessionKeyRef.current);
        if (token && roomCodeRef.current) {
          ws?.send(JSON.stringify(makeMessage('RECONNECT_SESSION', {
            roomCode: roomCodeRef.current.toUpperCase(),
            sessionToken: token,
            role: 'player',
          })));
        }
      };
      ws.onerror = () => {
        // A close event always follows; reconnection is handled there.
      };
      ws.onclose = () => {
        setConnected(false);
        if (socketRef.current === ws) {
          socketRef.current = null;
        }
        if (!keepAlive) {
          return;
        }
        const delay = Math.min(1000 * 2 ** attempts, 5000);
        attempts += 1;
        retryTimer = setTimeout(connect, delay);
      };
      ws.onmessage = (event) => {
        const message = JSON.parse(event.data as string) as ServerMessage;
        switch (message.type) {
          case 'ROOM_JOINED':
            if (message.payload.playerId) {
              setPlayerId(message.payload.playerId);
            }
            if (pendingSessionStorageKeyRef.current) {
              activeSessionKeyRef.current = pendingSessionStorageKeyRef.current;
              rememberActiveSession(roomCodeRef.current, pendingSessionStorageKeyRef.current);
            }
            if (message.payload.sessionToken && pendingSessionStorageKeyRef.current) {
              writeToken(pendingSessionStorageKeyRef.current, message.payload.sessionToken);
              pendingSessionStorageKeyRef.current = null;
            }
            setError('');
            break;
          case 'ROOM_STATE':
            setRoomPlayers(message.payload.players.map((p) => ({ id: p.id, name: p.name, avatar: p.avatar, connected: p.connected })));
            break;
          case 'GAME_CATALOG':
            setCatalog(message.payload.games);
            setSelectedGameId(message.payload.selectedGameId);
            setContentTier(message.payload.contentTier);
            break;
          case 'GAME_STARTED':
            setActiveGameId(message.payload.gameId);
            break;
          case 'GAME_STATE_PUBLIC':
            setPublicState(message.payload.state);
            // A mid-game reconnect replays state but not GAME_STARTED.
            setActiveGameId((current) => current ?? message.payload.gameId);
            break;
          case 'PLAYER_STATE_PRIVATE':
            setPrivateState(message.payload.state);
            setActiveGameId((current) => current ?? message.payload.gameId);
            break;
          case 'GAME_ENDED':
            // Game over — back to the waiting screen, session kept.
            setActiveGameId(null);
            setPublicState(null);
            setPrivateState(null);
            break;
          case 'REACTION': {
            const key = (reactionKeyRef.current += 1);
            const entry: LiveReaction = { key, ...message.payload };
            setReactions((current) => [...current, entry]);
            setTimeout(() => setReactions((current) => current.filter((r) => r.key !== key)), REACTION_TTL_MS);
            break;
          }
          case 'ERROR':
            if (/INVALID_SESSION|PLAYER_NOT_FOUND/.test(message.payload.message)) {
              clearStoredSession(activeSessionKeyRef.current, roomCodeRef.current);
              activeSessionKeyRef.current = null;
              setPlayerId(null);
              setPrivateState(null);
            } else {
              showError(message.payload.message);
            }
            break;
          default:
            break;
        }
      };
    };

    connect();
    return () => {
      keepAlive = false;
      if (retryTimer) {
        clearTimeout(retryTimer);
      }
      if (errorTimerRef.current) {
        clearTimeout(errorTimerRef.current);
      }
      if (socketRef.current === ws) {
        socketRef.current = null;
      }
      ws?.close();
    };
  }, []);

  const send: Send = (type, payload = {}) => {
    socketRef.current?.send(JSON.stringify(makeMessage(type, payload)));
  };

  const joinOrReconnect = ({ playerName, avatar }: { playerName: string; avatar: AvatarSpec }): void => {
    const socket = socketRef.current;
    const base = playerName.trim();
    if (!socket || !roomCode || !base) {
      return;
    }

    const storageKey = sessionKeyFor(roomCode, base);
    activeSessionKeyRef.current = storageKey;
    rememberActiveSession(roomCode, storageKey);

    const token = readToken(storageKey);
    if (token) {
      socket.send(JSON.stringify(makeMessage('RECONNECT_SESSION', {
        roomCode: roomCode.toUpperCase(),
        sessionToken: token,
        role: 'player',
      })));
      return;
    }

    pendingSessionStorageKeyRef.current = storageKey;
    socket.send(JSON.stringify(makeMessage('JOIN_ROOM', {
      roomCode: roomCode.toUpperCase(),
      playerName: base,
      role: 'player',
      avatar,
    })));
  };

  return {
    roomCode,
    setRoomCode,
    playerId,
    connected,
    error,
    roomPlayers,
    catalog,
    selectedGameId,
    contentTier,
    activeGameId,
    publicState,
    privateState,
    reactions,
    send,
    joinOrReconnect,
  };
}
