import type { PlayerId } from '../../models/common';
import type { EvoceRoundKind, EvoceStanding } from '../../models/evoce';

/**
 * Domain events the É Você! engine emits. They travel opaquely inside
 * `GAME_EVENT { gameId, event: unknown }`; only the É Você! host/controller views
 * (and the engine) know this shape. Mirrors `FdpGameEvent`.
 *
 * Events never carry caption / drawing / vote content — that stays in the
 * projected public/private state so the privacy rules live in one place.
 */
export type EvoceGameEvent =
  | { type: 'game_started'; totalRounds: number }
  | { type: 'game_paused' }
  | { type: 'game_resumed' }
  | { type: 'round_started'; round: number; totalRounds: number; roundKind: EvoceRoundKind; targetId: PlayerId | null }
  | { type: 'answering_started'; round: number; roundKind: EvoceRoundKind; durationMs: number }
  | { type: 'player_answered'; playerId: PlayerId }
  | { type: 'joker_played'; playerId: PlayerId }
  | { type: 'all_answers_in'; round: number }
  | { type: 'voting_started'; round: number; submissionCount: number; durationMs: number }
  | { type: 'vote_cast'; playerId: PlayerId }
  | { type: 'results_started'; round: number }
  | { type: 'round_finished'; round: number; winnerId: PlayerId | null; standings: EvoceStanding[] }
  | { type: 'game_finished'; winnerId: PlayerId; standings: EvoceStanding[] };
