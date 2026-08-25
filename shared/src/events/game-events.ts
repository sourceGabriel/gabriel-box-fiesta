import type { PlayerId } from '../models/common';
import type { UnoCard, UnoColor } from '../models/uno';

export type GameEvent =
  | { type: 'player_joined'; playerId: PlayerId; name: string }
  | { type: 'player_reconnected'; playerId: PlayerId }
  | { type: 'player_disconnected'; playerId: PlayerId }
  | { type: 'owner_changed'; playerId: PlayerId | null }
  | { type: 'game_started' }
  | { type: 'turn_started'; playerId: PlayerId; turn: number }
  | { type: 'turn_ended'; playerId: PlayerId; turn: number }
  | { type: 'card_played'; playerId: PlayerId; card: UnoCard }
  | { type: 'card_drawn'; playerId: PlayerId; count: number }
  | { type: 'color_changed'; color: Exclude<UnoColor, 'wild'> }
  | { type: 'direction_changed'; direction: 1 | -1 }
  | { type: 'player_skipped'; playerId: PlayerId }
  | { type: 'uno_called'; playerId: PlayerId }
  | { type: 'uno_penalty_applied'; playerId: PlayerId; count: number }
  | { type: 'round_finished'; winnerPlayerId: PlayerId };
