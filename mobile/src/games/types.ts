import type { FC } from 'react';
import type { Send } from '../shell/messages';
import type { LiveReaction, ShellPlayer } from '../shell/useRoomConnection';

/**
 * What every game's phone-controller view receives from the shell. `publicState`
 * and `privateState` are opaque here — each game view casts them to its own types.
 * Game actions go out as `send('GAME_ACTION', { action: { type: … } })` (A5); in
 * A4 the UNO view still emits the legacy verbs.
 */
export interface ControllerGameViewProps {
  publicState: unknown;
  privateState: unknown;
  playerId: string;
  connected: boolean;
  roomCode: string;
  /** Lobby roster (from ROOM_STATE) — game-agnostic, carries names + avatars. */
  roomPlayers: ShellPlayer[];
  /** Emoji reactions currently on screen (auto-expire). Game-agnostic. */
  reactions: LiveReaction[];
  send: Send;
}

export type ControllerGameView = FC<ControllerGameViewProps>;
