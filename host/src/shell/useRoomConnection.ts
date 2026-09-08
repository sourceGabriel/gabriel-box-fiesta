import { useEffect, useRef, useState } from 'react';
import type { AvatarSpec, ContentTier, GameMeta, ServerMessage } from '@party/shared';
import { makeMessage, serverOrigin, wsOrigin, type Send } from './messages';

export type ShellPlayer = { id: string; name: string; avatar?: AvatarSpec; connected: boolean };
export type BufferedEvent = { seq: number; event: unknown };
export type LiveReaction = { key: number; playerId: string; reaction: string; at: number };

const REACTION_TTL_MS = 4000;

export interface RoomConnection {
  roomCode: string;
  players: ShellPlayer[];
  joinUrl: string;
  joinQrDataUrl?: string;
  connected: boolean;
  lastError: string;
  /** Game catalog + current lobby selection (from GAME_CATALOG). */
  catalog: GameMeta[];
  selectedGameId: string;
  /** Room content intensity for the text games (from GAME_CATALOG). */
  contentTier: ContentTier;
  /** The id of the game currently in progress, or null in the lobby. */
  activeGameId: string | null;
  /** Latest GAME_STATE_PUBLIC payload (opaque here; the game view casts it). */
  publicState: unknown | null;
  /** Ordered game events since the current game started (capped). Monotonic `seq`. */
  events: BufferedEvent[];
  /** Emoji reactions currently on screen (auto-expire after a few seconds). */
  reactions: LiveReaction[];
  send: Send;
}

const EVENT_BUFFER = 24;

export function useRoomConnection(): RoomConnection {
  const socketRef = useRef<WebSocket | null>(null);
  const seqRef = useRef(0);

  const [roomCode, setRoomCode] = useState('');
  const [players, setPlayers] = useState<ShellPlayer[]>([]);
  const [joinUrl, setJoinUrl] = useState('');
  const [joinQrDataUrl, setJoinQrDataUrl] = useState<string | undefined>(undefined);
  const [connected, setConnected] = useState(false);
  const [lastError, setLastError] = useState('');
  const [catalog, setCatalog] = useState<GameMeta[]>([]);
  const [selectedGameId, setSelectedGameId] = useState('');
  const [contentTier, setContentTier] = useState<ContentTier>('pesado');
  const [activeGameId, setActiveGameId] = useState<string | null>(null);
  const [publicState, setPublicState] = useState<unknown | null>(null);
  const [events, setEvents] = useState<BufferedEvent[]>([]);
  const [reactions, setReactions] = useState<LiveReaction[]>([]);
  const reactionKeyRef = useRef(0);

  // Fetch the room code (with retry until the server is up).
  useEffect(() => {
    let mounted = true;
    let retry: ReturnType<typeof setTimeout> | null = null;
    const load = (): void => {
      fetch(`${serverOrigin}/room`)
        .then((r) => r.json())
        .then((json) => {
          if (mounted) {
            setRoomCode(json.code);
            setLastError('');
          }
        })
        .catch(() => {
          if (mounted) retry = setTimeout(load, 2000);
        });
    };
    load();
    return () => {
      mounted = false;
      if (retry) clearTimeout(retry);
    };
  }, []);

  // WebSocket with auto-reconnect + exponential backoff.
  useEffect(() => {
    if (!roomCode) return;

    let keepAlive = true;
    let ws: WebSocket | null = null;
    let retry: ReturnType<typeof setTimeout> | null = null;
    let attempts = 0;

    const connect = (): void => {
      ws = new WebSocket(`${wsOrigin}/ws`);
      socketRef.current = ws;

      ws.onopen = () => {
        attempts = 0;
        setConnected(true);
        setLastError('');
        ws?.send(JSON.stringify(makeMessage('JOIN_ROOM', { roomCode, playerName: 'HOST', role: 'host' })));
      };
      ws.onerror = () => {
        // The close handler owns reconnection.
      };
      ws.onclose = () => {
        setConnected(false);
        if (socketRef.current === ws) socketRef.current = null;
        if (!keepAlive) return;
        const delay = Math.min(1000 * 2 ** attempts, 5000);
        attempts += 1;
        retry = setTimeout(connect, delay);
      };
      ws.onmessage = (event) => {
        const message = JSON.parse(event.data as string) as ServerMessage;
        switch (message.type) {
          case 'ROOM_STATE':
            setPlayers(message.payload.players.map((p) => ({ id: p.id, name: p.name, avatar: p.avatar, connected: p.connected })));
            setJoinQrDataUrl(message.payload.joinQrDataUrl);
            setJoinUrl(message.payload.joinUrl);
            break;
          case 'GAME_CATALOG':
            setCatalog(message.payload.games);
            setSelectedGameId(message.payload.selectedGameId);
            setContentTier(message.payload.contentTier);
            break;
          case 'GAME_STATE_PUBLIC':
            setPublicState(message.payload.state);
            // A mid-game reconnect replays GAME_STATE_PUBLIC but not GAME_STARTED.
            setActiveGameId((current) => current ?? message.payload.gameId);
            break;
          case 'GAME_EVENT': {
            const seq = (seqRef.current += 1);
            setEvents((current) => [...current, { seq, event: message.payload.event }].slice(-EVENT_BUFFER));
            break;
          }
          case 'GAME_STARTED':
            setActiveGameId(message.payload.gameId);
            setEvents([]);
            break;
          case 'GAME_ENDED':
            setActiveGameId(null);
            setPublicState(null);
            setEvents([]);
            break;
          case 'REACTION': {
            const key = (reactionKeyRef.current += 1);
            const entry: LiveReaction = { key, ...message.payload };
            setReactions((current) => [...current, entry]);
            setTimeout(() => setReactions((current) => current.filter((r) => r.key !== key)), REACTION_TTL_MS);
            break;
          }
          case 'ERROR':
            setLastError(message.payload.message);
            break;
          default:
            break;
        }
      };
    };

    connect();
    return () => {
      keepAlive = false;
      if (retry) clearTimeout(retry);
      if (socketRef.current === ws) socketRef.current = null;
      ws?.close();
    };
  }, [roomCode]);

  const send: Send = (type, payload = {}) => {
    socketRef.current?.send(JSON.stringify(makeMessage(type, payload)));
  };

  return {
    roomCode,
    players,
    joinUrl,
    joinQrDataUrl,
    connected,
    lastError,
    catalog,
    selectedGameId,
    contentTier,
    activeGameId,
    publicState,
    events,
    reactions,
    send,
  };
}
