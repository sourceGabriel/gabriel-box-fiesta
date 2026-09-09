/** Dilema nos Trilhos (game #8, trolley-problem / *Trial by Trolley*-inspired) tuning. */

export const MIN_PLAYERS = 3;
export const MAX_PLAYERS = 10;

/** Default number of rounds; overridden by the lobby's `matchLength` picker. */
export const TOTAL_ROUNDS = 5;

/** Phase windows, in ms — one server-ticked deadline per phase. */
export const ASSIGNING_MS = 4_000;
export const PLAYING_MS = 75_000;
export const VERDICT_MS = 30_000;
export const RESULTS_MS = 8_500;

/** Cards dealt to each non-Maquinista at the start of a round. */
export const HAND_SIZE = 5;
/** Rough composition of a hand — the rest of the slots are filled at random. */
export const HAND_INNOCENTS = 2;
export const HAND_GUILTY = 2;
export const HAND_MODIFIERS = 1;

/** Player card text is trimmed then hard-clamped to this many characters (unused — cards are from the bank, kept for parity). */
export const MAX_CARD_LEN = 120;

/** Track display labels. */
export const TRACK_LABEL: Record<'left' | 'right', string> = {
  left: 'Trilho Esquerdo',
  right: 'Trilho Direito',
};
