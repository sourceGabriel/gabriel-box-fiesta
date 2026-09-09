import type { FC } from 'react';
import type { Send } from '../shell/messages';
import type { BufferedEvent, LiveReaction, ShellPlayer } from '../shell/useRoomConnection';

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
  /** Emoji reactions currently on screen (auto-expire). Game-agnostic. */
  reactions: LiveReaction[];
  /** Room/owner commands: send('END_GAME'), send('NEXT_ROUND'), send('KICK_PLAYER', { targetPlayerId }), … */
  send: Send;
}

export type HostGameView = FC<HostGameViewProps>;

/**
 * A game's catalog "personality" — the acid one-liner and the accent colour that
 * tint the coverflow while this game is focused. Kept in the game's own folder
 * (`<id>/personality.ts`) so adding a game stays a one-folder job.
 */
export interface GamePersonality {
  /** Main accent colour (hex) — tints the focused frame, the ambient glow and the vibe tag. */
  accent: string;
  /** One-word mood, stamped over the card (e.g. "RAIVA", "TRAIÇÃO"). */
  vibe: string;
  /** Acid PT-BR one-liner shown under the focused card. */
  blurb: string;
}

/** One registered game on the host: its in-game view + its catalog cover art + its personality. */
export interface HostGameEntry {
  View: HostGameView;
  /** Catalog cover art — an inline SVG component, no external assets. */
  Cover: FC;
  /** Catalog personality — accent + vibe + acid blurb. */
  personality: GamePersonality;
}
