import type { PlayerId } from '../../models/common';
import type { SintoniaSide, SintoniaStanding, SintoniaTeamId } from '../../models/sintonia';

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
  | {
      type: 'round_started';
      round: number;
      totalRounds: number;
      activeTeamId: SintoniaTeamId;
      mediumId: PlayerId;
    }
  | { type: 'clue_given'; round: number; mediumId: PlayerId }
  | { type: 'clue_skipped'; round: number }
  | { type: 'guessing_started'; round: number; durationMs: number }
  | { type: 'dial_locked'; round: number; value: number }
  | {
      type: 'round_revealed';
      round: number;
      target: number;
      dialValue: number;
      bandPoints: number;
      activeTeamId: SintoniaTeamId;
      sideBet: SintoniaSide | null;
      sideCorrect: boolean;
      scores: [number, number];
    }
  | { type: 'round_finished'; round: number; standings: SintoniaStanding[] }
  | {
      type: 'game_finished';
      winnerTeamId: SintoniaTeamId | null;
      standings: SintoniaStanding[];
    };
