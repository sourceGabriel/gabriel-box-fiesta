/**
 * Static description of a game the platform can run. One `GameMeta` per plugin.
 * Lives in `shared/` so the host catalog and the server registry agree on the contract.
 */
export interface GameMeta {
  /** Registry key and wire value (e.g. `'uno'`). Stable, lowercase, url-safe. */
  readonly id: string;
  /** Display name shown in the lobby catalog. */
  readonly name: string;
  /** One-line pitch shown under the name. */
  readonly tagline?: string;
  readonly minPlayers: number;
  readonly maxPlayers: number;
  /** Which optional lifecycle features the game engine implements. */
  readonly capabilities: {
    /** Supports multiple rounds / `NEXT_ROUND` and an intermission between them. */
    readonly rounds: boolean;
    /** Runs an authoritative per-turn timer the server ticks. */
    readonly turnTimer: boolean;
    /** Supports `PAUSE_GAME` / `RESUME_GAME`. */
    readonly pause: boolean;
  };
}
