import type { PlayerId, TurnTimer } from './common';

/**
 * Lorota! wire model (game #4 — Fibbage-inspired bluffing trivia). `shared/`
 * stays types-only: these travel opaquely inside `GAME_STATE_PUBLIC` /
 * `PLAYER_STATE_PRIVATE`; only the Lorota! engine and its host/controller views
 * know these shapes.
 *
 * Loop: a fact with a blank on the TV → each player secretly writes a fake
 * answer (a lorota) on the phone → the server shuffles the lies in with the real
 * answer → everyone hunts for the truth → points for finding the truth, and for
 * every player your lie fooled. 3 rounds; the last ("Lorota Final") pays double.
 *
 * "Lorota!" is this game's own name — the rename point is `lorotaPlugin.meta.name` +
 * `BrandMark text` to rename. `gameId` stays `"lorota"`.
 */

export type LorotaPhase =
  | 'lying' // players are writing their fake answers
  | 'guessing' // the shuffled options are up; everyone hunts the truth
  | 'reveal' // the truth + who-fooled-whom + points are on screen
  | 'gameover'
  | 'paused';

export type LorotaRoundKind = 'normal' | 'final';

/** One answer in the guessing list — a player's lie or the real answer. */
export type LorotaOption = {
  /** Stable id within the round. Guess payloads reference this. */
  id: string;
  text: string;
  /** Revealed only at `reveal`. */
  isTruth: boolean | null;
  /** Authors of this lie (more than one if identical lies collapsed); `[]` for the truth. `null` until reveal. */
  authorIds: PlayerId[] | null;
  authorNames: string[] | null;
  /** Players who guessed this option. `null` until reveal. */
  pickedBy: { playerId: PlayerId; name: string }[] | null;
};

export type LorotaPublicPlayer = {
  id: PlayerId;
  name: string;
  connected: boolean;
  score: number;
};

export type LorotaStanding = {
  playerId: PlayerId;
  name: string;
  score: number;
  /** Points earned in the round that just finished (0 outside `reveal`/`gameover`). */
  roundPoints: number;
};

export type LorotaPublicState = {
  phase: LorotaPhase;
  roomCode: string;
  round: number;
  totalRounds: number;
  roundKind: LorotaRoundKind;
  players: LorotaPublicPlayer[];
  /** The fact with the blank — shown during `lying`, `guessing` and `reveal`. */
  prompt: string | null;
  /** `lying`: how many lies are in / expected. */
  liesInCount: number;
  liesExpectedCount: number;
  /** The shuffled options (lies + truth). Empty during `lying`; authors/pickedBy filled only at `reveal`. */
  options: LorotaOption[];
  /** `guessing`: how many guesses are in / expected. */
  guessesInCount: number;
  guessesExpectedCount: number;
  /** Present at `reveal` and `gameover`, sorted by score desc. */
  standings: LorotaStanding[];
  /** The real answer — revealed at `reveal`/`gameover`, `null` before. */
  truthText: string | null;
  timer: TurnTimer | null;
  winnerId: PlayerId | null;
};

/** What a given controller is being asked to do right now. */
export type LorotaDecision =
  | 'lie' // still owes a lie this round
  | 'guess' // may pick an option
  | 'wait' // submitted / guessed — nothing to do
  | null;

export type LorotaPrivateState = {
  playerId: PlayerId;
  pendingDecision: LorotaDecision;
  /** The lie this player has submitted so far (`null` if none). Only meaningful during `lying`. */
  myLie: string | null;
  /** Set when the player's last attempt was actually the truth — they must try another. */
  lieWasTheTruth: boolean;
  /** The options this player may pick — the round's options minus any they authored. Empty outside `guessing`. */
  guessOptions: { id: string; text: string }[];
  /** Which option this player guessed, or `null`. */
  myGuessId: string | null;
  /** `reveal`: did this player find the truth? */
  foundTruth: boolean;
};

/**
 * Controller → server payloads, carried inside `GAME_ACTION { gameId, action }`.
 * Zod validation lives in `server/src/games/lorota/action-schema.ts`.
 */
export type LorotaAction =
  | { type: 'submitLie'; text: string }
  | { type: 'submitGuess'; optionId: string };
