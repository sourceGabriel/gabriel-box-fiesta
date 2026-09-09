import type { PlayerId } from '../../models/common';
import type { SintoniaStanding } from '../../models/sintonia';

/**
 * Domain events the Sintonia engine emits. They travel opaquely inside
 * `GAME_EVENT { gameId, event: unknown }`; only the Sintonia host/controller
 * views (and the engine) know this shape. Mirrors `DilemaGameEvent`.
 *
 * Events never carry the clue text — that stays in the projected public state so
 * the "what is on the TV" rules live in one place.
 */
export type SintoniaGameEvent =
  | { type: 'game_started'; totalRounds: number }
  | { type: 'game_paused' }
  | { type: 'game_resumed' }
  | { type: 'round_started'; round: number; totalRounds: number; mediumId: PlayerId }
  | { type: 'clue_given'; round: number; mediumId: PlayerId }
  | { type: 'clue_skipped'; round: number }
  | { type: 'guessing_started'; round: number; durationMs: number }
  | { type: 'guess_locked'; round: number; playerId: PlayerId }
  | {
      type: 'round_revealed';
      round: number;
      target: number;
      bestPlayerId: PlayerId | null;
      bestPoints: number;
    }
  | { type: 'round_finished'; round: number; standings: SintoniaStanding[] }
  | { type: 'game_finished'; winnerId: PlayerId | null; standings: SintoniaStanding[] };
