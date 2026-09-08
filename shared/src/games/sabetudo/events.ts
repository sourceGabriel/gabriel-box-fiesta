import type { PlayerId } from '../../models/common';
import type { SabeTudoStanding } from '../../models/sabetudo';

/**
 * Domain events the Sabe-Tudo engine emits. They travel opaquely inside
 * `GAME_EVENT { gameId, event: unknown }`; only the Sabe-Tudo host/controller
 * views (and the engine) know this shape. Mirrors `LorotaGameEvent`.
 *
 * Events never carry the option a player picked — that stays in the projected
 * public/private state so the privacy rules live in one place.
 */
export type SabeTudoGameEvent =
  | { type: 'game_started'; totalRounds: number }
  | { type: 'game_paused' }
  | { type: 'game_resumed' }
  | { type: 'question_started'; round: number; totalRounds: number; category: string | null; durationMs: number }
  | { type: 'answer_submitted'; playerId: PlayerId }
  | { type: 'all_answers_in'; round: number }
  | { type: 'reveal_started'; round: number; correctIndex: number }
  | { type: 'round_finished'; round: number; standings: SabeTudoStanding[] }
  | { type: 'game_finished'; winnerId: PlayerId; standings: SabeTudoStanding[] };
