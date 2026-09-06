/**
 * Shell-level lifecycle events the SERVER emits itself (via `LIFECYCLE_EVENT`).
 * Distinct from a game plugin's own event stream (`consumeEvents()` → `GAME_EVENT`),
 * which the core treats as opaque.
 */
export type LifecycleEvent =
  | { type: 'game_selected'; gameId: string }
  | { type: 'game_started'; gameId: string }
  | { type: 'round_advanced'; round: number }
  | { type: 'game_completed' }
  | { type: 'returned_to_lobby' };
