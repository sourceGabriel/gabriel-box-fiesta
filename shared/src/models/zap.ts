import type { PlayerId, TurnTimer } from './common';

/**
 * Zap! wire model (game #3 — Quiplash-inspired). `shared/` stays types-only:
 * these travel opaquely inside `GAME_STATE_PUBLIC` / `PLAYER_STATE_PRIVATE`; only
 * the Zap! engine and the Zap! host/controller views know these shapes.
 *
 * Loop: a prompt on the TV → each player writes answers on the phone → the TV
 * shows head-to-head duels (2 answers to the same prompt) → the room votes on
 * each duel → round scores → 3 rounds, the last one ("Última Chance") worth 3×.
 */

/**
 * Turn-flow phase. `'paused'` is a Room overlay (like UNO/Coup), not a real
 * engine phase — the engine never sets it.
 */
export type ZapPhase =
  | 'answering' // players are writing answers to their assigned prompts
  | 'voting' // the room votes, one duel at a time (`currentDuelIndex`)
  | 'roundResults' // the round's scores are on screen before the next round
  | 'gameover' // the match is over; `winnerId` is set
  | 'paused';

/** How many normal rounds precede the final "Última Chance" round. */
export type ZapRoundKind = 'normal' | 'final';

/** One answer inside a duel. `authorId` is `null` while hidden (during voting). */
export type ZapDuelAnswer = {
  /** Stable 0-based slot within the duel. Vote payloads reference this. */
  slot: number;
  text: string;
  /** Revealed only once the duel's vote closes. */
  authorId: PlayerId | null;
  authorName: string | null;
  /** `true` when the player never submitted and the engine filled a blank. */
  isBlank: boolean;
};

export type ZapDuelResult = {
  /** Votes per slot, index-aligned with the duel's `answers`. */
  votes: number[];
  /** Winning slot, or `null` on a tie. */
  winnerSlot: number | null;
  /** `true` when the winner swept every vote (a "ZAP!" — bonus points). Only meaningful for a 2-way duel. */
  zap: boolean;
  pointsAwarded: ZapPointsAward[];
};

export type ZapPointsAward = {
  playerId: PlayerId;
  /** Total points this player got from this duel (votes × per-vote, ×3 on the final round, + sweep bonus). */
  points: number;
  votes: number;
};

export type ZapDuel = {
  /** Position of this duel within the round (0-based). */
  index: number;
  prompt: string;
  /**
   * The competing answers, order already shuffled (join order is not observable).
   * Length 2 on a normal round; on the final round there is a single duel holding
   * every player's answer.
   */
  answers: ZapDuelAnswer[];
  /** Populated once this duel's vote window closes; `null` before that. */
  result: ZapDuelResult | null;
};

export type ZapPublicPlayer = {
  id: PlayerId;
  name: string;
  connected: boolean;
  /** Cumulative match score. */
  score: number;
};

export type ZapStanding = {
  playerId: PlayerId;
  name: string;
  score: number;
  /** Points earned in the round that just finished (0 outside `roundResults`/`gameover`). */
  roundPoints: number;
};

export type ZapPublicState = {
  phase: ZapPhase;
  roomCode: string;
  round: number;
  totalRounds: number;
  roundKind: ZapRoundKind;
  players: ZapPublicPlayer[];
  /**
   * The prompt on screen during `answering`. On a normal round every player has
   * their own two prompts, so this is `null`; on the final round it is the one
   * shared prompt. `null` in every other phase.
   */
  activePrompt: string | null;
  /** `answering`: how many of the expected answers are in. */
  answersInCount: number;
  answersExpectedCount: number;
  /** The round's duels. During `voting` only duels up to `currentDuelIndex` carry a `result`. */
  duels: ZapDuel[];
  /** Which duel the room is voting on / looking at right now. */
  currentDuelIndex: number;
  /** `voting`: votes in / expected for the current duel. */
  votesInCount: number;
  votesExpectedCount: number;
  /** Present in `roundResults` and `gameover`, sorted by score desc. */
  standings: ZapStanding[];
  timer: TurnTimer | null;
  winnerId: PlayerId | null;
};

/** What a given controller is being asked to do right now. */
export type ZapDecision =
  | 'answer' // still owes at least one answer this round
  | 'vote' // may vote on the current duel
  | 'wait' // submitted / voted / is a contestant in the current duel — nothing to do
  | null;

/** One prompt this player must answer this round (1 on the final round, 2 otherwise). */
export type ZapAssignment = {
  /** Stable index into this player's assignment list (the `slot` in `submitAnswer`). */
  slot: number;
  prompt: string;
  /** What the player has submitted so far, or `null`. */
  answer: string | null;
};

/** The ballot for the duel currently being voted on. Absent when the player can't vote. */
export type ZapBallot = {
  duelIndex: number;
  prompt: string;
  /** The answers this player may vote for — texts only, authors hidden, own answer excluded. */
  options: { slot: number; text: string }[];
  /** Which slot this player voted for, or `null`. */
  votedSlot: number | null;
};

export type ZapPrivateState = {
  playerId: PlayerId;
  pendingDecision: ZapDecision;
  /** Prompts to answer this round (empty outside `answering`). */
  assignments: ZapAssignment[];
  submittedAll: boolean;
  /** Set only while this player has a duel to vote on. */
  ballot: ZapBallot | null;
};

/**
 * Controller → server payloads, carried inside `GAME_ACTION { gameId, action }`.
 * Zod validation of these lives in `server/src/games/zap/action-schema.ts`.
 */
export type ZapAction =
  | { type: 'submitAnswer'; slot: number; text: string }
  | { type: 'castVote'; duelIndex: number; slot: number };
