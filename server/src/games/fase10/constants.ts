/** Fase 10 (game #10, *Phase 10*-inspired contract rummy) tuning. */

export const MIN_PLAYERS = 2;
export const MAX_PLAYERS = 6;

/** Cards dealt to each player at the start of every hand. */
export const HAND_SIZE = 10;

/** Phases a player must complete to win. Overridden by the lobby `matchLength` picker. */
export const DEFAULT_TARGET_PHASE = 7;
export const TARGET_PHASE_OPTIONS = [5, 7, 10] as const;

/** One turn's soft deadline (ms) — building a phase takes longer than playing UNO. */
export const TURN_MS = 45_000;

/** How long the hand-over scoreboard stays up is a host concern; the engine waits for NEXT_ROUND. */

/** Penalty points for a card left in hand when the hand ends. */
export const cardPenalty = (card: { kind: 'number' | 'wild' | 'skip'; value?: number }): number => {
  if (card.kind === 'wild') return 25;
  if (card.kind === 'skip') return 15;
  return (card.value ?? 0) <= 9 ? 5 : 10;
};
