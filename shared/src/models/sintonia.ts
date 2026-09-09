import type { PlayerId, TurnTimer } from './common';

/**
 * Sintonia — wire model (game #9, inspired by *Wavelength*; clean-room, the
 * mechanic only). `shared/` stays types-only: these shapes travel opaquely inside
 * `GAME_STATE_PUBLIC` / `PLAYER_STATE_PRIVATE`; only the Sintonia engine and its
 * host/controller views know them.
 *
 * Loop of one round (individual, no teams):
 *  1. `cluing` — a **médium** (rotates by join order) sees a hidden `target` on a
 *     spectrum and types ONE short clue. No number in it.
 *  2. `guessing` — the clue shows on the TV. **Every other player** drags **their
 *     own** 0–100 dial and locks it. When all lock (or the backstop timer ends) →
 *     reveal.
 *  3. `reveal` — the cover lifts: each guesser scores by how close their dial
 *     landed (`|guess − target|`, banded — closer is worth more). The médium
 *     scores the rounded-down average of the guessers' points (a reward for a
 *     good clue).
 *  4. next round (new médium) → after N rounds: `gameover`.
 *
 * Score is **individual and cumulative**. Most points at the end wins.
 *
 * "Sintonia" is this game's own name — the rename point is
 * `sintoniaPlugin.meta.name` + the `BrandMark text` ("Sintonia"). `gameId` stays
 * `"sintonia"`.
 */

export type SintoniaPhase =
  | 'cluing' // the médium is picking a clue
  | 'guessing' // every non-médium is placing their own dial
  | 'reveal' // the cover is off; scores are in
  | 'gameover'
  | 'paused';

export type SintoniaRole = 'medium' | 'guesser' | 'idle';

/** One player's guess — value hidden from others until `reveal`. */
export type SintoniaGuess = {
  playerId: PlayerId;
  name: string;
  /** `null` until reveal (kept secret so guesses stay independent); the locked value at reveal. */
  value: number | null;
  locked: boolean;
};

/** One guesser's scored result at `reveal`. */
export type SintoniaResult = {
  playerId: PlayerId;
  name: string;
  value: number;
  distance: number;
  points: number;
};

export type SintoniaStanding = {
  playerId: PlayerId;
  name: string;
  /** Cumulative score — the ranking key. */
  score: number;
  /** Points earned in the round that just finished. */
  roundDelta: number;
};

export type SintoniaPublicPlayer = {
  id: PlayerId;
  name: string;
  connected: boolean;
  score: number;
};

export type SintoniaPublicState = {
  phase: SintoniaPhase;
  roomCode: string;
  round: number;
  totalRounds: number;
  mediumId: PlayerId | null;
  mediumName: string | null;
  /** `[left label, right label]` of the spectrum, e.g. `["Chato", "Divertido"]`. */
  spectrum: [string, string];
  /** `null` during `cluing`; the médium's clue from `guessing` on. */
  clue: string | null;
  /** `guessing`: who has locked (values stay `null`). `reveal`: everyone, with values. */
  guesses: SintoniaGuess[];
  guessersLockedCount: number;
  guessersTotalCount: number;
  /** `reveal` only: the hidden target (0–100). */
  target: number | null;
  /** `reveal` only: each guesser's scored result, best first. */
  results: SintoniaResult[];
  /** `reveal` only: the médium's points this round (avg of the guessers). */
  mediumPoints: number | null;
  /** `reveal` only: the médium never sent a clue — the round was skipped, nobody scored. */
  roundSkipped: boolean;
  players: SintoniaPublicPlayer[];
  /** Always present, sorted by score desc. */
  standings: SintoniaStanding[];
  timer: TurnTimer | null;
  /** `gameover`: the winner, or `null` on a tie. */
  winnerId: PlayerId | null;
  winnerName: string | null;
};

export type SintoniaPrivateState = {
  playerId: PlayerId;
  role: SintoniaRole;
  isMedium: boolean;
  /** The médium's hidden target (0–100) during `cluing` / `guessing`; `null` otherwise. */
  target: number | null;
  /** The clue (`null` until it is given). */
  clue: string | null;
  /** This guesser's current dial value (persisted server-side once moved). */
  myGuess: number | null;
  /** `true` once this guesser has locked their dial. */
  myLocked: boolean;
  /** `true` once this player has done their part (clue sent / dial locked). */
  done: boolean;
};

/**
 * Controller → server payloads, carried inside `GAME_ACTION { gameId, action }`.
 * Zod validation lives in `server/src/games/sintonia/action-schema.ts`; the engine
 * enforces role + clue legality (length, no digits).
 */
export type SintoniaAction =
  | { type: 'submitClue'; clue: string }
  | { type: 'setGuess'; value: number }
  | { type: 'lockGuess' }
  | { type: 'unlockGuess' };
