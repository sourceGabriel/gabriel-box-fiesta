/** FDP — Foi De Propósito (game #6, Cards-Against-Humanity-inspired) tuning constants. */

export const MIN_PLAYERS = 3;
export const MAX_PLAYERS = 8;

/** Rounds 1..TOTAL_ROUNDS-1 are normal; the last is the "Final FDP" (double points). */
export const TOTAL_ROUNDS = 5;

/** Phase windows, in ms — one server-ticked deadline per phase. */
export const WRITING_MS = 60_000;
export const VOTING_MS = 25_000;
export const RESULTS_MS = 9_000;

/** Points for every vote your answer receives. */
export const VOTE_POINTS = 100;
/** Bonus when your answer takes every eligible vote in the round. */
export const SWEEP_BONUS = 150;
/** The final round pays double (votes + sweep). */
export const FINAL_ROUND_MULTIPLIER = 2;

/** Answers are trimmed then hard-clamped to this many characters. */
export const MAX_ANSWER_LEN = 100;
