import type { PlayerId } from '../../models/common';
import type { Fase10Card } from '../../models/fase10';

/**
 * Domain events the Fase 10 engine emits. They travel opaquely inside
 * `GAME_EVENT { gameId, event: unknown }`; only the Fase 10 host/controller
 * views (and the engine) know this shape. No hand contents ride on events.
 */
export type Fase10GameEvent =
  | { type: 'game_started'; targetPhase: number }
  | { type: 'game_paused' }
  | { type: 'game_resumed' }
  | { type: 'hand_started'; hand: number; startingPlayerId: PlayerId }
  | { type: 'turn_started'; playerId: PlayerId; turn: number }
  | { type: 'timer_started'; playerId: PlayerId; turn: number; durationMs: number }
  | { type: 'card_drawn'; playerId: PlayerId; source: 'pile' | 'discard' }
  | { type: 'phase_laid'; playerId: PlayerId; phaseIndex: number }
  | { type: 'hit_made'; playerId: PlayerId; targetOwnerId: PlayerId }
  | { type: 'card_discarded'; playerId: PlayerId; card: Fase10Card }
  | { type: 'player_skipped'; playerId: PlayerId; byPlayerId: PlayerId }
  | { type: 'hand_over'; winnerId: PlayerId | null; hand: number }
  | { type: 'game_over'; winnerId: PlayerId | null };
