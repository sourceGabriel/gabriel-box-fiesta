import type { PlayerId, TurnTimer } from './common';

/**
 * É Você! wire model (game #7 — inspired by PlayStation's *That's You!*). `shared/`
 * stays types-only: these travel opaquely inside `GAME_STATE_PUBLIC` /
 * `PLAYER_STATE_PRIVATE`; only the É Você! engine and its host/controller views
 * know these shapes.
 *
 * A "how well do you know your friends" game. Rounds cycle through:
 *  - **enquete**  — "Quem de vocês…?" — everyone taps a player; points by consensus
 *    (the more of you agree, the more everyone in that group scores). A **Curinga**
 *    doubles your round points if your vote lands on the group's pick.
 *  - **legenda**  — complete a sentence about one player; vote the best.
 *  - **rabisco**  — draw over one player ("transforme [Nome] em…"); vote the best.
 *  - **final** ("A Obra-Prima") — draw yourself from a prompt; vote the best; ×2.
 *
 * No camera (LAN http blocks it): a player's "face" is their pixel `<Avatar>` and
 * drawings are captured as a light **stroke list**, not a bitmap.
 *
 * §47: "É Você!" is this game's own name — swap `evocePlugin.meta.name` + the
 * `BrandMark text`. `gameId` stays `"evoce"`.
 */

export type EvocePhase =
  | 'answering' // players are voting / writing / drawing for this round
  | 'voting' // (legenda/rabisco/final) the submissions are up; the room votes the best
  | 'roundResults' // reveal + points
  | 'gameover'
  | 'paused';

export type EvoceRoundKind = 'enquete' | 'legenda' | 'rabisco' | 'final';

/** One pen stroke. `points` is a flat `[x0,y0,x1,y1,…]` list in a 0…1000 square. */
export type EvoceStroke = { color: string; width: number; points: number[] };
export type EvoceDrawing = { strokes: EvoceStroke[] };

/** One creative submission (legenda caption or rabisco/final drawing). */
export type EvoceSubmission = {
  /** Stable id within the round. Vote payloads reference this. */
  id: string;
  authorId: PlayerId | null; // null while hidden (during `voting`)
  authorName: string | null;
  kind: 'caption' | 'drawing';
  text: string | null; // caption
  drawing: EvoceDrawing | null; // rabisco / final
  /** Vote count — revealed only at `roundResults`. */
  votes: number | null;
  voterNames: string[] | null;
  isRoundWinner: boolean;
};

export type EvocePublicPlayer = {
  id: PlayerId;
  name: string;
  connected: boolean;
  score: number;
  jokersLeft: number;
};

export type EvoceStanding = {
  playerId: PlayerId;
  name: string;
  score: number;
  roundPoints: number;
};

/** `roundResults` of an `enquete` round — how the vote split. */
export type EvocePollBar = { playerId: PlayerId; name: string; count: number };

export type EvocePublicState = {
  phase: EvocePhase;
  roomCode: string;
  round: number;
  totalRounds: number;
  roundKind: EvoceRoundKind;
  players: EvocePublicPlayer[];
  /** The question / sentence / draw instruction — target name already substituted in. */
  prompt: string | null;
  /** legenda / rabisco subject; `null` for enquete and final. */
  targetId: PlayerId | null;
  targetName: string | null;
  /** `answering`: how many players are in / expected. */
  answersInCount: number;
  answersExpectedCount: number;
  /** `roundResults` of an enquete: the bars + the group's pick. */
  pollBars: EvocePollBar[] | null;
  pollWinnerId: PlayerId | null;
  /** The shuffled submissions (legenda/rabisco/final). Empty during `answering`; authors/votes filled at `roundResults`. */
  submissions: EvoceSubmission[];
  /** `voting`: how many votes are in / expected. */
  votesInCount: number;
  votesExpectedCount: number;
  /** Present at `roundResults`/`gameover`, sorted by score desc. */
  standings: EvoceStanding[];
  /** Whose submission won the round (legenda/rabisco/final) — `null` on a tie. */
  roundWinnerId: PlayerId | null;
  timer: TurnTimer | null;
  winnerId: PlayerId | null;
};

/** What a given controller is being asked to do right now. */
export type EvoceDecision =
  | 'vote_player' // enquete: tap a player
  | 'write' // legenda: type a caption
  | 'draw' // rabisco/final: draw
  | 'vote_submission' // voting: pick the best
  | 'wait' // done — nothing to do (also: you are the rabisco model)
  | null;

export type EvocePrivateState = {
  playerId: PlayerId;
  pendingDecision: EvoceDecision;
  /** enquete: the player you voted for. */
  myPlayerVote: PlayerId | null;
  /** enquete: did you play a Curinga this round? */
  jokerPlayed: boolean;
  jokersLeft: number;
  /** legenda: your caption so far. */
  mySubmissionText: string | null;
  /** rabisco/final: your drawing so far. */
  mySubmissionDrawing: EvoceDrawing | null;
  /** rabisco: you are the model — you don't draw, just watch and vote. */
  isDrawTarget: boolean;
  /** `voting`: the submissions you may vote for (yours excluded). */
  voteOptions: { id: string; kind: 'caption' | 'drawing'; text: string | null; drawing: EvoceDrawing | null }[];
  myVoteId: string | null;
  /** `roundResults`: points you earned this round. */
  myRoundPoints: number;
  /** `roundResults` of an enquete: did your vote match the group's pick? */
  matchedGroup: boolean;
};

/**
 * Controller → server payloads, carried inside `GAME_ACTION { gameId, action }`.
 * Zod validation lives in `server/src/games/evoce/action-schema.ts`.
 */
export type EvoceAction =
  | { type: 'votePlayer'; targetId: string }
  | { type: 'playJoker' }
  | { type: 'submitCaption'; text: string }
  | { type: 'submitDrawing'; drawing: EvoceDrawing }
  | { type: 'castVote'; submissionId: string };
