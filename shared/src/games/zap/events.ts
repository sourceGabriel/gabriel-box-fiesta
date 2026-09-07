import type { PlayerId } from '../../models/common';
import type { ZapRoundKind, ZapStanding } from '../../models/zap';

/**
 * Domain events the Zap! engine emits. They travel on the wire opaquely inside
 * `GAME_EVENT { gameId, event: unknown }`; only the Zap! host/controller views
 * (and the Zap! engine) know this shape. Mirrors `CoupGameEvent` / `UnoGameEvent`.
 *
 * Events never carry answer or vote text/targets — those stay in the projected
 * public/private state so privacy rules live in one place.
 */
export type ZapGameEvent =
  | { type: 'game_started'; totalRounds: number }
  | { type: 'game_paused' }
  | { type: 'game_resumed' }
  | { type: 'round_started'; round: number; totalRounds: number; roundKind: ZapRoundKind }
  | { type: 'answering_started'; round: number; durationMs: number }
  | { type: 'answer_submitted'; playerId: PlayerId; slot: number }
  | { type: 'all_answers_in'; round: number }
  | { type: 'duel_started'; round: number; duelIndex: number; prompt: string; durationMs: number }
  | { type: 'vote_cast'; playerId: PlayerId; duelIndex: number }
  | {
      type: 'duel_revealed';
      round: number;
      duelIndex: number;
      votes: number[];
      winnerSlot: number | null;
      zap: boolean;
    }
  | { type: 'round_finished'; round: number; standings: ZapStanding[] }
  | { type: 'game_finished'; winnerId: PlayerId; standings: ZapStanding[] };
