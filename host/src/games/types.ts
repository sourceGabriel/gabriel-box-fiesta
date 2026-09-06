import type { FC } from 'react';
import type { Send } from '../shell/messages';
import type { BufferedEvent, ShellPlayer } from '../shell/useRoomConnection';

/**
 * What every game's host view receives from the shell. `publicState` is opaque
 * here — each game view casts it to its own public-state type.
 */
export interface HostGameViewProps {
  publicState: unknown;
  /** Ordered game events since this game started (for feeds / animations). */
  events: BufferedEvent[];
  players: ShellPlayer[];
  connected: boolean;
  /** Room/owner commands: send('END_GAME'), send('NEXT_ROUND'), send('KICK_PLAYER', { targetPlayerId }), … */
  send: Send;
}

export type HostGameView = FC<HostGameViewProps>;
