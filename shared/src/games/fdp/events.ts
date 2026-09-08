import type { PlayerId } from '../../models/common';
import type { FdpRoundKind, FdpStanding } from '../../models/fdp';

/**
 * Domain events the FDP engine emits. They travel opaquely inside
 * `GAME_EVENT { gameId, event: unknown }`; only the FDP host/controller views
 * (and the engine) know this shape. Mirrors `LorotaGameEvent`.
 *
 * Events never carry answer or vote text — that stays in the projected
 * public/private state so the privacy rules live in one place.
 */
export type FdpGameEvent =
  | { type: 'game_started'; totalRounds: number }
  | { type: 'game_paused' }
  | { type: 'game_resumed' }
  | { type: 'round_started'; round: number; totalRounds: number; roundKind: FdpRoundKind }
  | { type: 'writing_started'; round: number; durationMs: number }
  | { type: 'answer_submitted'; playerId: PlayerId }
  | { type: 'all_answers_in'; round: number }
  | { type: 'voting_started'; round: number; answerCount: number; durationMs: number }
  | { type: 'vote_cast'; playerId: PlayerId }
  | { type: 'results_started'; round: number }
  | { type: 'round_finished'; round: number; winnerId: PlayerId | null; standings: FdpStanding[] }
  | { type: 'game_finished'; winnerId: PlayerId; standings: FdpStanding[] };
