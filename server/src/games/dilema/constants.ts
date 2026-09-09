/** Dilema nos Trilhos (game #8, trolley-problem / *Trial by Trolley*-inspired) tuning. */

import type { DilemaStep } from '@party/shared';

export const MIN_PLAYERS = 3;
export const MAX_PLAYERS = 10;

/** Default number of rounds; overridden by the lobby's `matchLength` picker. */
export const TOTAL_ROUNDS = 5;

/**
 * Phase windows, in ms. Only the two NON-decision phases carry a deadline the
 * server ticks: `assigning` (a brief reveal) and `roundResults` (a recap). The
 * pick steps and the verdict have NO timer — couch play, the table argues out
 * loud and locks / pulls the lever when it is ready.
 */
export const ASSIGNING_MS = 4_000;
export const RESULTS_MS = 8_500;

/** Candidate cards dealt to each team, per pick step (they agree on one). */
export const CANDIDATES_PER_STEP = 3;

/** The pick steps, in tabletop play order. */
export const STEPS: readonly DilemaStep[] = ['innocent', 'guilty', 'modifier'];

/** Track display labels. */
export const TRACK_LABEL: Record<'left' | 'right', string> = {
  left: 'Trilho Esquerdo',
  right: 'Trilho Direito',
};
