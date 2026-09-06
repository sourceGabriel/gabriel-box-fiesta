import type { PlayerId } from '../../models/common';
import type { Direction, UnoCard, UnoColor } from '../../models/uno';

/**
 * Domain events the UNO engine emits. They travel on the wire opaquely inside
 * `GAME_EVENT { gameId, event: unknown }`; only the UNO host/controller views
 * (and the UNO engine) know this shape.
 */
export type UnoGameEvent =
  | { type: 'game_started' }
  | { type: 'game_paused' }
  | { type: 'game_resumed' }
  | { type: 'round_started'; round: number; startingPlayerId: PlayerId }
  | { type: 'timer_started'; playerId: PlayerId; turn: number; durationMs: number }
  | { type: 'turn_started'; playerId: PlayerId; turn: number }
  | { type: 'turn_ended'; playerId: PlayerId; turn: number }
  | { type: 'card_played'; playerId: PlayerId; card: UnoCard }
  | { type: 'card_drawn'; playerId: PlayerId; count: number }
  | { type: 'color_changed'; color: Exclude<UnoColor, 'wild'> }
  | { type: 'direction_changed'; direction: Direction }
  | { type: 'player_skipped'; playerId: PlayerId }
  | { type: 'uno_called'; playerId: PlayerId }
  | { type: 'uno_penalty_applied'; playerId: PlayerId; count: number }
  | { type: 'round_finished'; winnerPlayerId: PlayerId; roundScore: number }
  | { type: 'game_finished'; gameWinnerPlayerId: PlayerId };
