import type { PlayerId, TurnTimer } from './common';

/**
 * FDP — Foi De Propósito — wire model (game #6, Cards-Against-Humanity-inspired).
 * `shared/` stays types-only: these travel opaquely inside `GAME_STATE_PUBLIC` /
 * `PLAYER_STATE_PRIVATE`; only the FDP engine and its host/controller views know
 * these shapes.
 *
 * Loop: one shared prompt (usually a sentence with a blank) on the TV → every
 * player writes ONE answer on the phone → the TV shows all answers, shuffled and
 * anonymous → everyone votes for the best one (never their own) → +100 per vote,
 * plus a sweep bonus → 5 rounds, the last ("Final FDP") worth double.
 *
 * §47: "FDP — Foi De Propósito" is this game's own name — swap `fdpPlugin.meta.name`
 * + the `BrandMark text` ("FDP") to rename. `gameId` stays `"fdp"`.
 */

export type FdpPhase =
  | 'writing' // players are writing their answer to the shared prompt
  | 'voting' // every answer is on screen, shuffled + anonymous; the room votes
  | 'roundResults' // votes, authors and points are on screen
  | 'gameover'
  | 'paused';

export type FdpRoundKind = 'normal' | 'final';

/** One submitted answer. `authorId`/`votes` are `null` while hidden (during `voting`). */
export type FdpAnswer = {
  /** Stable id within the round. Vote payloads reference this. */
  id: string;
  text: string;
  authorId: PlayerId | null;
  authorName: string | null;
  /** Vote count — revealed only at `roundResults`. */
  votes: number | null;
  /** Names of the players who voted for this answer. `null` until `roundResults`. */
  voterNames: string[] | null;
  /** `true` at `roundResults` when this answer won the round (most votes, no tie). */
  isRoundWinner: boolean;
  /** `true` at `roundResults` when this answer swept every eligible vote. */
  sweptVotes: boolean;
};

export type FdpPublicPlayer = {
  id: PlayerId;
  name: string;
  connected: boolean;
  score: number;
};

export type FdpStanding = {
  playerId: PlayerId;
  name: string;
  score: number;
  /** Points earned in the round that just finished (0 outside `roundResults`/`gameover`). */
  roundPoints: number;
};

export type FdpPublicState = {
  phase: FdpPhase;
  roomCode: string;
  round: number;
  totalRounds: number;
  roundKind: FdpRoundKind;
  players: FdpPublicPlayer[];
  /** The shared prompt — shown during `writing`, `voting` and `roundResults`. */
  prompt: string | null;
  /** `writing`: how many answers are in / expected. */
  answersInCount: number;
  answersExpectedCount: number;
  /** The shuffled answers. Empty during `writing`; authors/votes filled only at `roundResults`. */
  answers: FdpAnswer[];
  /** `voting`: how many votes are in / expected. */
  votesInCount: number;
  votesExpectedCount: number;
  /** Present at `roundResults` and `gameover`, sorted by score desc. */
  standings: FdpStanding[];
  /** The player whose answer won the round — set at `roundResults`, `null` on a tie. */
  roundWinnerId: PlayerId | null;
  timer: TurnTimer | null;
  winnerId: PlayerId | null;
};

/** What a given controller is being asked to do right now. */
export type FdpDecision =
  | 'write' // still owes an answer this round
  | 'vote' // may vote for an answer
  | 'wait' // submitted / voted — nothing to do
  | null;

export type FdpPrivateState = {
  playerId: PlayerId;
  pendingDecision: FdpDecision;
  /** The answer this player submitted this round (`null` if none). Only meaningful during `writing`. */
  myAnswer: string | null;
  /** The answers this player may vote for — the round's answers minus their own. Empty outside `voting`. */
  voteOptions: { id: string; text: string }[];
  /** Which answer this player voted for, or `null`. */
  myVoteId: string | null;
  /** `roundResults`: how many votes this player's answer got this round. */
  myRoundVotes: number;
};

/**
 * Controller → server payloads, carried inside `GAME_ACTION { gameId, action }`.
 * Zod validation lives in `server/src/games/fdp/action-schema.ts`.
 */
export type FdpAction =
  | { type: 'submitAnswer'; text: string }
  | { type: 'castVote'; answerId: string };
