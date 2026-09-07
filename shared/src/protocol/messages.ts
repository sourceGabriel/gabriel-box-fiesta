import type { AvatarSpec } from '../models/avatar';
import type { GameMeta, LifecycleEvent } from '../games';

export type ClientMessageType =
  | 'JOIN_ROOM'
  | 'RECONNECT_SESSION'
  | 'SELECT_GAME'
  | 'START_GAME'
  | 'END_GAME'
  | 'NEXT_ROUND'
  | 'GAME_ACTION'
  | 'PAUSE_GAME'
  | 'RESUME_GAME'
  | 'KICK_PLAYER'
  | 'SEND_REACTION'
  | 'PING';

export type ServerMessageType =
  | 'ROOM_JOINED'
  | 'ROOM_STATE'
  | 'GAME_CATALOG'
  | 'PLAYER_JOINED'
  | 'PLAYER_RECONNECTED'
  | 'PLAYER_LEFT'
  | 'OWNER_CHANGED'
  | 'GAME_STARTED'
  | 'GAME_ENDED'
  | 'GAME_STATE_PUBLIC'
  | 'PLAYER_STATE_PRIVATE'
  | 'GAME_EVENT'
  | 'LIFECYCLE_EVENT'
  | 'REACTION'
  | 'ERROR'
  | 'PONG';

export type Envelope<TType extends string, TPayload> = {
  messageId: string;
  clientSeq?: number;
  protocolVersion: 1;
  type: TType;
  payload: TPayload;
  sentAt: number;
};

export type ClientMessage =
  | Envelope<'JOIN_ROOM', { roomCode: string; playerName: string; role: 'player' | 'host'; avatar?: AvatarSpec }>
  | Envelope<'RECONNECT_SESSION', { roomCode: string; sessionToken: string; role: 'player' | 'host' }>
  | Envelope<'SELECT_GAME', { gameId: string }>
  | Envelope<'START_GAME', { gameId?: string }>
  | Envelope<'END_GAME', {}>
  | Envelope<'NEXT_ROUND', {}>
  /** Generic per-game action. The active game plugin validates `action`. */
  | Envelope<'GAME_ACTION', { action: unknown }>
  | Envelope<'PAUSE_GAME', {}>
  | Envelope<'RESUME_GAME', {}>
  | Envelope<'KICK_PLAYER', { targetPlayerId: string }>
  /** Generic emoji reaction — the server rebroadcasts it to the room as REACTION. */
  | Envelope<'SEND_REACTION', { reaction: string }>
  | Envelope<'PING', {}>;

export type ServerMessage =
  | Envelope<'ROOM_JOINED', { roomCode: string; role: 'player' | 'host'; playerId?: string; ownerPlayerId: string | null; sessionToken?: string }>
  | Envelope<'ROOM_STATE', { roomCode: string; ownerPlayerId: string | null; joinUrl: string; joinQrDataUrl?: string; players: { id: string; name: string; avatar: AvatarSpec; connected: boolean }[] }>
  | Envelope<'GAME_CATALOG', { games: GameMeta[]; selectedGameId: string }>
  | Envelope<'PLAYER_JOINED', { playerId: string; name: string; avatar: AvatarSpec }>
  | Envelope<'PLAYER_RECONNECTED', { playerId: string }>
  | Envelope<'PLAYER_LEFT', { playerId: string }>
  | Envelope<'OWNER_CHANGED', { ownerPlayerId: string | null }>
  | Envelope<'GAME_STARTED', { gameId: string }>
  | Envelope<'GAME_ENDED', {}>
  /** Public game state — opaque; the active game's views cast it to their own type. */
  | Envelope<'GAME_STATE_PUBLIC', { gameId: string; state: unknown; stateVersion: number }>
  | Envelope<'PLAYER_STATE_PRIVATE', { gameId: string; state: unknown; stateVersion: number }>
  | Envelope<'GAME_EVENT', { gameId: string; event: unknown; stateVersion: number }>
  | Envelope<'LIFECYCLE_EVENT', { event: LifecycleEvent; stateVersion: number }>
  /** Someone in the room sent an emoji reaction. Game-agnostic; views render it however they like. */
  | Envelope<'REACTION', { playerId: string; reaction: string; at: number }>
  | Envelope<'ERROR', { code: string; message: string; recoverable: boolean }>
  | Envelope<'PONG', {}>;
