export type PlayerId = string;
export type RoomId = string;
export type SessionId = string;

export type Direction = 1 | -1;

export type TurnTimer = {
  startedAt: number;
  expiresAt: number;
  durationMs: number;
};

export type Phase =
  | 'waiting_players'
  | 'ready'
  | 'round_active'
  | 'awaiting_color_choice'
  | 'round_finished'
  | 'game_finished'
  | 'paused';
