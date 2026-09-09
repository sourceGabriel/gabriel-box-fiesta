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
  /**
   * Lobby-adjustable match length (number of rounds / questions). Omit for a
   * fixed-length game. The host shows a picker; the chosen value reaches the
   * engine as `GameContext.matchLength`.
   */
  readonly lengthOptions?: {
    /** What the number counts, for the lobby label — e.g. `'Perguntas'`, `'Rodadas'`. */
    readonly label: string;
    /** Selectable values, ascending. */
    readonly values: readonly number[];
    /** Used when the host hasn't picked one. Must be in `values`. */
    readonly default: number;
  };
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
