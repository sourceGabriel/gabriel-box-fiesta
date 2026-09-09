/** Sintonia (game #9, *Wavelength*-inspired) tuning. */

export const MIN_PLAYERS = 3;
export const MAX_PLAYERS = 8;

/** Default number of rounds; overridden by the lobby's `matchLength` picker. */
export const TOTAL_ROUNDS = 6;

/**
 * Phase windows, in ms — backstop deadlines the server ticks. `guessing` advances
 * early once every guesser has locked; the timer only matters if someone stalls.
 */
export const CLUING_MS = 45_000;
export const GUESSING_MS = 45_000;
export const REVEAL_MS = 11_000;

/** The médium's clue is trimmed then hard-clamped to this many characters. */
export const CLUE_MAX = 60;

/** The hidden target lands in `[TARGET_MIN, TARGET_MAX]`. */
export const TARGET_MIN = 4;
export const TARGET_MAX = 96;

/** Dial starts centred. */
export const DIAL_START = 50;

/**
 * Proximity bands, closest first: `|guess - target| <= dist` earns `points`.
 * Miss every band → 0. Closer is strictly worth more.
 */
export const BANDS: ReadonlyArray<readonly [dist: number, points: number]> = [
  [2, 10],
  [6, 7],
  [12, 5],
  [20, 3],
  [30, 2],
  [42, 1],
];
