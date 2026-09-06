export type PlayerId = string;
export type RoomId = string;
export type SessionId = string;

/** Generic per-turn timer, reused by any turn-based game. */
export type TurnTimer = {
  startedAt: number;
  expiresAt: number;
  durationMs: number;
  // server timestamp to help clients synchronize clocks
  serverNow: number;
  // remaining milliseconds for the current turn (computed server-side)
  remainingMs: number;
};
