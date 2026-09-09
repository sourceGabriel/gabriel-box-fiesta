import type { EvoceRoundKind } from '@party/shared';

/** É Você! (game #7, *That's You!*-inspired) tuning constants. */

export const MIN_PLAYERS = 3;
export const MAX_PLAYERS = 8;

/** The fixed round sequence. Length is TOTAL_ROUNDS; the last is always the "final". */
export const ROUND_PLAN: readonly EvoceRoundKind[] = ['enquete', 'legenda', 'rabisco', 'enquete', 'legenda', 'final'];
export const TOTAL_ROUNDS = ROUND_PLAN.length;

/** Phase windows, in ms — one server-ticked deadline per phase. */
export const ANSWERING_MS: Record<EvoceRoundKind, number> = {
  enquete: 25_000,
  legenda: 50_000,
  rabisco: 75_000,
  final: 75_000,
};
export const VOTING_MS = 25_000;
export const RESULTS_MS = 9_000;

/** enquete: points per OTHER player who voted for the same person as you. */
export const CONSENSUS_POINTS = 250;
/** legenda/rabisco/final: points per vote your submission receives. */
export const VOTE_POINTS = 300;
/** Small bonus for voting for the submission that ends up winning the round. */
export const PICK_WINNER_BONUS = 100;
/** The final round pays double (votes + bonus). */
export const FINAL_ROUND_MULTIPLIER = 2;

/** Each player starts with this many Curingas; a played Curinga doubles that enquete's points if your vote matched the group. */
export const JOKER_COUNT = 2;

/** Captions are trimmed then hard-clamped. */
export const MAX_CAPTION_LEN = 100;
/** Drawing payload guards (a doodle is well under these). */
export const MAX_STROKES = 500;
export const MAX_POINTS_PER_STROKE = 512;
/** Logical drawing canvas is a COORD_SPACE × COORD_SPACE square. */
export const COORD_SPACE = 1000;
