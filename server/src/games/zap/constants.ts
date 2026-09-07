/** Zap! (game #3, Quiplash-inspired) tuning constants. */

export const MIN_PLAYERS = 3;
export const MAX_PLAYERS = 8;

/** Rounds 1..TOTAL_ROUNDS-1 are duel rounds; the last is "Última Chance". */
export const TOTAL_ROUNDS = 3;

/** Phase windows, in ms. Every phase carries a single server-ticked deadline. */
export const ANSWER_MS = 60_000;
export const VOTE_MS = 20_000;
export const ROUND_RESULTS_MS = 8_000;

export const POINTS_PER_VOTE = 100;
/** "Última Chance" — the final round pays triple. */
export const FINAL_ROUND_MULTIPLIER = 3;
/** Bonus for sweeping every vote in a 2-way duel (a "ZAP!"). */
export const SWEEP_BONUS = 50;

/** Answers are trimmed then hard-clamped to this many characters. */
export const MAX_ANSWER_LEN = 80;

/** Filler stored for an assignment a player never answered. */
export const BLANK_ANSWER = '(sem resposta)';
