/** Sabe-Tudo (game #5, multiple-choice trivia) tuning constants. */

export const MIN_PLAYERS = 2;
export const MAX_PLAYERS = 8;

/** A match is this many questions. */
export const TOTAL_ROUNDS = 8;

/** Phase windows, in ms — one server-ticked deadline per phase. */
export const QUESTION_MS = 22_000;
export const REVEAL_MS = 7_000;

/** Flat points for a correct answer. */
export const CORRECT_POINTS = 500;
/** Extra points for speed — the full bonus for an instant answer, decaying linearly to 0 as the clock runs out. */
export const SPEED_BONUS_MAX = 500;
/** Each consecutive correct answer past the first adds this much, up to STREAK_MAX_STEPS. */
export const STREAK_STEP = 100;
export const STREAK_MAX_STEPS = 5;

/** Every question has exactly this many options. */
export const OPTION_COUNT = 4;
