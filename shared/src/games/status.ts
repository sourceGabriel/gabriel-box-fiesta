/**
 * Generic, room-facing projection of a running game's lifecycle.
 * Replaces the UNO-specific `Phase` union at the core boundary — each plugin maps
 * its own internal phases onto one of these four so the `Room` can drive lifecycle
 * (enable NEXT_ROUND, show results, return to lobby) without knowing the game.
 *
 * `paused` is deliberately NOT here: pausing is a room concern, overlaid by the
 * send-boundary projector on top of whatever status the game reports.
 */
export type GameStatus =
  | 'setup'        // dealt / initialising, not yet accepting player actions
  | 'active'       // a round is in progress
  | 'intermission' // a round finished; owner may start the next one
  | 'complete';    // the match is over; a winner exists in the public state
