/** Lorota! (game #4, Fibbage-inspired) tuning constants. */

export const MIN_PLAYERS = 3;
export const MAX_PLAYERS = 8;

/** Rounds 1..TOTAL_ROUNDS-1 are normal; the last is the "Lorota Final" (double points). */
export const TOTAL_ROUNDS = 3;

/** Phase windows, in ms — one server-ticked deadline per phase. */
export const LYING_MS = 50_000;
export const GUESSING_MS = 30_000;
export const REVEAL_MS = 10_000;

/** Points for guessing the real answer. */
export const TRUTH_POINTS = 1_000;
/** Points for every player your lie fooled. */
export const FOOL_POINTS = 500;
/** The final round pays double. */
export const FINAL_ROUND_MULTIPLIER = 2;

/** Lies are trimmed then hard-clamped to this many characters. */
export const MAX_LIE_LEN = 90;
