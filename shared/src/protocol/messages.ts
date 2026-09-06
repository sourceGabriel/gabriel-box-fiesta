import type { GameEvent } from '../events/game-events';
import type { GameMeta, LifecycleEvent } from '../games';
import type { UnoPrivatePlayerState, UnoPublicState } from '../models/uno';

export type ClientMessageType =
  | 'JOIN_ROOM'
  | 'RECONNECT_SESSION'
  | 'SELECT_GAME'
  | 'START_GAME'
  | 'END_GAME'
  | 'NEXT_ROUND'
  | 'GAME_ACTION'
  // UNO-specific verbs — superseded by GAME_ACTION, removed in a later phase.
  | 'PLAY_CARD'
  | 'DRAW_CARD'
  | 'CHOOSE_COLOR'
  | 'UNO_CALL'
  | 'UNO_CHALLENGE'
  | 'PAUSE_GAME'
  | 'RESUME_GAME'
  | 'KICK_PLAYER'
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
  | Envelope<'JOIN_ROOM', { roomCode: string; playerName: string; role: 'player' | 'host' }>
  | Envelope<'RECONNECT_SESSION', { roomCode: string; sessionToken: string; role: 'player' | 'host' }>
  | Envelope<'SELECT_GAME', { gameId: string }>
  | Envelope<'START_GAME', { gameId?: string }>
  | Envelope<'END_GAME', {}>
  | Envelope<'NEXT_ROUND', {}>
  /** Generic per-game action. The active game plugin validates `action`. */
  | Envelope<'GAME_ACTION', { action: unknown }>
  | Envelope<'PLAY_CARD', { cardId: string; chosenColor?: 'red' | 'yellow' | 'green' | 'blue' }>
  | Envelope<'DRAW_CARD', { playDrawnCardId?: string; chosenColor?: 'red' | 'yellow' | 'green' | 'blue' }>
  | Envelope<'CHOOSE_COLOR', { color: 'red' | 'yellow' | 'green' | 'blue' }>
  | Envelope<'UNO_CALL', {}>
  | Envelope<'UNO_CHALLENGE', { targetPlayerId: string }>
  | Envelope<'PAUSE_GAME', {}>
  | Envelope<'RESUME_GAME', {}>
  | Envelope<'KICK_PLAYER', { targetPlayerId: string }>
  | Envelope<'PING', {}>;

export type ServerMessage =
  | Envelope<'ROOM_JOINED', { roomCode: string; role: 'player' | 'host'; playerId?: string; ownerPlayerId: string | null; sessionToken?: string }>
  | Envelope<'ROOM_STATE', { roomCode: string; ownerPlayerId: string | null; joinUrl: string; joinQrDataUrl?: string; players: { id: string; name: string; connected: boolean; handCount: number }[] }>
  | Envelope<'GAME_CATALOG', { games: GameMeta[]; selectedGameId: string }>
  | Envelope<'PLAYER_JOINED', { playerId: string; name: string }>
  | Envelope<'PLAYER_RECONNECTED', { playerId: string }>
  | Envelope<'PLAYER_LEFT', { playerId: string }>
  | Envelope<'OWNER_CHANGED', { ownerPlayerId: string | null }>
  | Envelope<'GAME_STARTED', {}>
  | Envelope<'GAME_ENDED', {}>
  | Envelope<'GAME_STATE_PUBLIC', { state: UnoPublicState; stateVersion: number }>
  | Envelope<'PLAYER_STATE_PRIVATE', { state: UnoPrivatePlayerState; stateVersion: number }>
  | Envelope<'GAME_EVENT', { event: GameEvent; stateVersion: number }>
  | Envelope<'LIFECYCLE_EVENT', { event: LifecycleEvent; stateVersion: number }>
  | Envelope<'ERROR', { code: string; message: string; recoverable: boolean }>
  | Envelope<'PONG', {}>;
