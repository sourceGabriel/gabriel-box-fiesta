/** Sintonia (game #9, *Wavelength*-inspired) tuning. */

export const MIN_PLAYERS = 3;
export const MAX_PLAYERS = 8;

/** Default number of rounds; overridden by the lobby's `matchLength` picker. */
export const TOTAL_ROUNDS = 6;

/** Phase windows, in ms — one server-ticked deadline per phase. */
export const CLUING_MS = 45_000;
export const GUESSING_MS = 40_000;
export const REVEAL_MS = 9_000;

/** The médium's clue is trimmed then hard-clamped to this many characters. */
export const CLUE_MAX = 60;

/** The hidden target lands in `[TARGET_MIN, TARGET_MAX]` so a band always fits on the arc. */
export const TARGET_MIN = 4;
export const TARGET_MAX = 96;

/** Dial starts centred. */
export const DIAL_START = 50;

/**
 * Scoring bands, widest last: `|dial - target| <= dist` earns `points`. Miss
 * every band → 0. (±6 → 4, ±14 → 3, ±22 → 2.)
 */
export const BANDS: ReadonlyArray<readonly [dist: number, points: number]> = [
  [6, 4],
  [14, 3],
  [22, 2],
];

/** Point the other team earns for calling the dial's side of the target right. */
export const SIDE_POINTS = 1;

/** Team display names. */
export const TEAM_NAMES = ['Time Turquesa', 'Time Coral'] as const;
