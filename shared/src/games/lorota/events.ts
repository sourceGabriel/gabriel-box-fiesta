import type { PlayerId } from '../../models/common';
import type { LorotaRoundKind, LorotaStanding } from '../../models/lorota';

/**
 * Domain events the Lorota! engine emits. They travel opaquely inside
 * `GAME_EVENT { gameId, event: unknown }`; only the Lorota! host/controller
 * views (and the engine) know this shape. Mirrors `ZapGameEvent`.
 *
 * Events never carry lie or guess text — that stays in the projected
 * public/private state so the privacy rules live in one place.
 */
export type LorotaGameEvent =
  | { type: 'game_started'; totalRounds: number }
  | { type: 'game_paused' }
  | { type: 'game_resumed' }
  | { type: 'round_started'; round: number; totalRounds: number; roundKind: LorotaRoundKind }
  | { type: 'lying_started'; round: number; durationMs: number }
  | { type: 'lie_submitted'; playerId: PlayerId }
  | { type: 'all_lies_in'; round: number }
  | { type: 'guessing_started'; round: number; optionCount: number; durationMs: number }
  | { type: 'guess_submitted'; playerId: PlayerId }
  | { type: 'reveal_started'; round: number }
  | { type: 'round_finished'; round: number; standings: LorotaStanding[] }
  | { type: 'game_finished'; winnerId: PlayerId; standings: LorotaStanding[] };
