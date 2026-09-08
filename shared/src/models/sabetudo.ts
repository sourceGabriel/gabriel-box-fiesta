import type { PlayerId, TurnTimer } from './common';

/**
 * Sabe-Tudo wire model (game #5 — a fast multiple-choice trivia). `shared/` stays
 * types-only: these travel opaquely inside `GAME_STATE_PUBLIC` /
 * `PLAYER_STATE_PRIVATE`; only the Sabe-Tudo engine and its host/controller views
 * know these shapes.
 *
 * Loop: a question with four options on the TV → each player taps one option on
 * the phone → whoever is right scores a base + a speed bonus (faster = more) + a
 * streak bonus → the correct answer and the points land on screen → next
 * question. A match is `totalRounds` questions; the top score wins.
 *
 * §47: "Sabe-Tudo" is this game's own name — swap `sabeTudoPlugin.meta.name` +
 * `BrandMark text` to rename. `gameId` stays `"sabetudo"`.
 */

export type SabeTudoPhase =
  | 'question' // the question + options are up; players are tapping an answer
  | 'reveal' // the correct option + who-picked-what + points are on screen
  | 'gameover'
  | 'paused';

export type SabeTudoPublicPlayer = {
  id: PlayerId;
  name: string;
  connected: boolean;
  score: number;
};

export type SabeTudoStanding = {
  playerId: PlayerId;
  name: string;
  score: number;
  /** Points earned in the question that just finished (0 outside `reveal`/`gameover`). */
  roundPoints: number;
  /** Consecutive correct answers going into the next question. */
  streak: number;
};

/** `reveal`: how a single option did. */
export type SabeTudoOptionResult = {
  index: number;
  correct: boolean;
  count: number;
  pickedBy: { playerId: PlayerId; name: string }[];
};

export type SabeTudoPublicState = {
  phase: SabeTudoPhase;
  roomCode: string;
  round: number;
  totalRounds: number;
  players: SabeTudoPublicPlayer[];
  /** Loose category label for flavour — shown during `question` and `reveal`. */
  category: string | null;
  /** The question text — shown during `question` and `reveal`. */
  question: string | null;
  /** The four options, in the order shown this question. Empty outside `question`/`reveal`. */
  options: string[];
  /** `question`: how many answers are in / expected. */
  answersInCount: number;
  answersExpectedCount: number;
  /** Revealed only at `reveal`. */
  correctIndex: number | null;
  /** Per-option tally + who picked it — `null` until `reveal`. */
  optionResults: SabeTudoOptionResult[] | null;
  /** Present at `reveal` and `gameover`, sorted by score desc. */
  standings: SabeTudoStanding[];
  timer: TurnTimer | null;
  winnerId: PlayerId | null;
};

/** What a given controller is being asked to do right now. */
export type SabeTudoDecision =
  | 'answer' // may still pick an option
  | 'wait' // answered — nothing to do
  | null;

export type SabeTudoPrivateState = {
  playerId: PlayerId;
  pendingDecision: SabeTudoDecision;
  /** The option this player picked this question, or `null`. Locked once set. */
  myAnswerIndex: number | null;
  /** `reveal`: was this player's pick correct? `null` if they did not answer. */
  lastAnswerCorrect: boolean | null;
  /** Consecutive correct answers so far. */
  streak: number;
};

/**
 * Controller → server payloads, carried inside `GAME_ACTION { gameId, action }`.
 * Zod validation lives in `server/src/games/sabetudo/action-schema.ts`.
 */
export type SabeTudoAction = { type: 'submitAnswer'; optionIndex: number };
