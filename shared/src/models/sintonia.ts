import type { PlayerId, TurnTimer } from './common';

/**
 * Sintonia — wire model (game #9, inspired by *Wavelength*; clean-room, the
 * mechanic only). `shared/` stays types-only: these shapes travel opaquely inside
 * `GAME_STATE_PUBLIC` / `PLAYER_STATE_PRIVATE`; only the Sintonia engine and its
 * host/controller views know them.
 *
 * Loop of one round:
 *  1. `cluing` — the room is split into two teams (re-split every round). One team
 *     is active: a **médium** (rotates by join order) sees a hidden `target` on a
 *     spectrum and types ONE short clue.
 *  2. `guessing` — the clue shows on the TV. The active team (minus the médium)
 *     drags a 0–100 dial; the other team bets which side of the dial the target
 *     is on ("⬅️ / ➡️").
 *  3. `reveal` — the cover lifts: the active team scores 4/3/2/0 by how close the
 *     dial landed; the other team scores 1 for calling the side right.
 *  4. next round (alternating spectrum + médium) → after N rounds: `gameover`.
 *
 * Score is by TEAM. Individual `standings` inherit their team's score (so
 * `RoundScoreboard` works) plus a `roundDelta` for the pop-in.
 *
 * "Sintonia" is this game's own name — the rename point is
 * `sintoniaPlugin.meta.name` + the `BrandMark text` ("Sintonia"). `gameId` stays
 * `"sintonia"`.
 */

export type SintoniaPhase =
  | 'cluing' // the médium is picking a clue
  | 'guessing' // dial + side-bet are live
  | 'reveal' // the cover is off; scores are in
  | 'gameover'
  | 'paused';

export type SintoniaTeamId = 0 | 1;
export type SintoniaSide = 'left' | 'right';
export type SintoniaRole = 'medium' | 'dial' | 'sideBet' | 'idle';

export type SintoniaTeamView = {
  id: SintoniaTeamId;
  name: string;
  memberIds: PlayerId[];
  memberNames: string[];
  /** Running score across the match. */
  score: number;
  /** Holds the médium this round. */
  isActive: boolean;
};

export type SintoniaStanding = {
  playerId: PlayerId;
  name: string;
  teamId: SintoniaTeamId;
  /** Mirrors the player's team score — the ranking key. */
  score: number;
  /** Team points earned in the round that just finished. */
  roundDelta: number;
};

export type SintoniaPublicState = {
  phase: SintoniaPhase;
  roomCode: string;
  round: number;
  totalRounds: number;
  activeTeamId: SintoniaTeamId;
  mediumId: PlayerId | null;
  mediumName: string | null;
  /** `[left label, right label]` of the spectrum, e.g. `["Chato", "Divertido"]`. */
  spectrum: [string, string];
  /** `null` during `cluing`; the médium's clue from `guessing` on. */
  clue: string | null;
  /** Live 0–100 dial position (the active team drags it). */
  dialValue: number;
  /** `reveal` only: the hidden target (0–100). */
  target: number | null;
  /** `reveal` only: points the active team earned this round (4/3/2/0). */
  bandPoints: number | null;
  /** `reveal` only: the other team's resolved side call, or `null` if they were split / silent. */
  sideBet: SintoniaSide | null;
  /** `reveal` only: whether that side call was right. */
  sideCorrect: boolean | null;
  /** `reveal` only: the médium never sent a clue — the round was skipped, nobody scored. */
  roundSkipped: boolean;
  teams: [SintoniaTeamView, SintoniaTeamView];
  /** Always present, sorted by score desc. */
  standings: SintoniaStanding[];
  timer: TurnTimer | null;
  /** `gameover`: the winning team, or `null` on a tie. */
  winnerTeamId: SintoniaTeamId | null;
  /** `gameover`: the winning team's captain (first member by join order), for the victory splash. */
  winnerName: string | null;
};

export type SintoniaPrivateState = {
  playerId: PlayerId;
  teamId: SintoniaTeamId | null;
  role: SintoniaRole;
  /** The médium's hidden target (0–100) during `cluing` / `guessing`; `null` otherwise. */
  target: number | null;
  /** The clue this player's side is working with (`null` until it is given). */
  clue: string | null;
  /** Side-bet players: their current call, or `null`. */
  myBet: SintoniaSide | null;
  /** `true` once this player has done their part (clue sent / bet locked). */
  done: boolean;
};

/**
 * Controller → server payloads, carried inside `GAME_ACTION { gameId, action }`.
 * Zod validation lives in `server/src/games/sintonia/action-schema.ts`; the engine
 * enforces role + clue legality (length, no digits) and rejects with a toast.
 */
export type SintoniaAction =
  | { type: 'submitClue'; clue: string }
  | { type: 'moveDial'; value: number }
  | { type: 'betSide'; side: SintoniaSide };
