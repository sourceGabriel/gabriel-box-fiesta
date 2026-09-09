import type { PlayerId, TurnTimer } from './common';

/**
 * Dilema nos Trilhos — wire model (game #8, inspired by the trolley problem /
 * *Trial by Trolley*). `shared/` stays types-only: these shapes travel opaquely
 * inside `GAME_STATE_PUBLIC` / `PLAYER_STATE_PRIVATE`; only the Dilema engine and
 * its host/controller views know them.
 *
 * Loop of one round (faithful to the tabletop turn order — innocents, then
 * guilty, then modifiers; couch play, so the whole team argues out loud and
 * agrees before anything locks):
 *  1. `assigning` — one player is the Maquinista (rotates by join order); the rest
 *     are re-split into Trilho Esquerdo / Direito. Each track gets one seed
 *     "innocent". Each team is dealt 3 innocent / 3 guilty / 3 modifier
 *     candidates. (4s, auto-advances.)
 *  2. `pickInnocent` — each team agrees on ONE innocent for its OWN track.
 *  3. `pickGuilty` — each team agrees on ONE guilty for the ENEMY track.
 *  4. `pickModifier` — each team agrees on ONE modifier + a base card (any track)
 *     to staple it onto.
 *     Steps 2–4 have NO timer: a member proposes a card, every connected team
 *     member confirms, the step locks; both teams locked → next step.
 *  5. `verdict` — the Maquinista looks at both tracks and picks which one the
 *     trolley runs over. NO timer — they must choose. (Safety: a disconnected
 *     Maquinista coin-flips.)
 *  6. `roundResults` — the spared track's players each score +1 "poupado". (8.5s.)
 *
 * There is no points economy — the score IS the count of rounds survived. `N`
 * rounds (lobby-configurable); the game crowns whoever was spared most.
 *
 * "Dilema nos Trilhos" is this game's own name — the rename point is
 * `dilemaPlugin.meta.name` + the `BrandMark text` ("Dilema"). `gameId` stays
 * `"dilema"`.
 */

export type DilemaPhase =
  | 'assigning' // Maquinista + track split just revealed; candidates dealt
  | 'pickInnocent' // both teams agreeing on one innocent for their own track
  | 'pickGuilty' // both teams agreeing on one guilty for the enemy track
  | 'pickModifier' // both teams agreeing on one modifier + its target card
  | 'verdict' // the Maquinista decides which track dies
  | 'roundResults' // the trolley took a track; the spared players scored
  | 'gameover'
  | 'paused';

/** The three pick steps, in play order. */
export type DilemaStep = 'innocent' | 'guilty' | 'modifier';

export type DilemaCardType = 'innocent' | 'guilty' | 'modifier';
export type DilemaTrack = 'left' | 'right';

/** A card resolved onto a track (public — the tracks are on the shared TV). */
export type DilemaTrackCard = {
  /** Stable id within the round, e.g. `"c3"`. Modifier `attachedTo` references this. */
  id: string;
  type: DilemaCardType;
  text: string;
  /** `null` for the seed innocents the game deals; otherwise the track that played it. */
  authorTrack: DilemaTrack | null;
  /** For `modifier` cards: the base-card id it is stapled to. `null` otherwise. */
  attachedTo: string | null;
  /** Populated in projection on base cards: the modifiers stapled onto this card. */
  modifiers: DilemaTrackCard[];
};

/** Live consensus state for one team on the current pick step (public). */
export type DilemaPickState = {
  /** Which step this reflects. */
  step: DilemaStep;
  /** The candidate id the team is currently proposing, or `null` if nobody has proposed. */
  proposalCardId: string | null;
  /** The proposed card's text (for the TV), or `null`. */
  proposalText: string | null;
  /** Modifier step only: the base-card id the modifier would staple onto. */
  proposalTargetId: string | null;
  /** How many connected team members have confirmed the current proposal. */
  confirmedCount: number;
  /** How many connected members the team has. */
  memberCount: number;
  /** `true` once the pick is locked in for this step. */
  locked: boolean;
};

export type DilemaTrackView = {
  side: DilemaTrack;
  /** Display label, e.g. `"Trilho Esquerdo"`. */
  label: string;
  /** The players defending this track this round. */
  memberIds: PlayerId[];
  memberNames: string[];
  /** Base cards (innocent / guilty), each carrying its own `.modifiers`. */
  cards: DilemaTrackCard[];
  /** Consensus progress for the current pick step (`null` outside the pick phases). */
  pick: DilemaPickState | null;
};

/** One candidate card a team can pick from on the current step (private). */
export type DilemaCandidate = {
  /** Stable id within the round for this team, e.g. `"cand2"`. */
  id: string;
  type: DilemaCardType;
  text: string;
};

/** A base card a modifier can staple onto (private, modifier step only). */
export type DilemaModifierTarget = {
  id: string;
  text: string;
  type: DilemaCardType;
  side: DilemaTrack;
};

export type DilemaPublicPlayer = {
  id: PlayerId;
  name: string;
  connected: boolean;
  /** Rounds this player's track has been spared. This is the score. */
  spared: number;
};

export type DilemaStanding = {
  playerId: PlayerId;
  name: string;
  /** Rounds spared — the ranking key. */
  spared: number;
  /** `1` if this player's track was spared in the round that just finished, else `0`. */
  roundDelta: number;
};

export type DilemaPublicState = {
  phase: DilemaPhase;
  roomCode: string;
  round: number;
  totalRounds: number;
  /** The current pick step, or `null` outside the pick phases. */
  step: DilemaStep | null;
  conductorId: PlayerId | null;
  conductorName: string | null;
  tracks: { left: DilemaTrackView; right: DilemaTrackView };
  /** `verdict` → `gameover`: which track the trolley took. `null` before the verdict. */
  killedTrack: DilemaTrack | null;
  /** `roundResults`+: the track that survived. */
  sparedTrack: DilemaTrack | null;
  /** Whether the verdict was a safety coin-flip (`true`, disconnected Maquinista) rather than a pick. */
  verdictWasAuto: boolean;
  players: DilemaPublicPlayer[];
  /** Present at `roundResults` and `gameover`, sorted by `spared` desc. */
  standings: DilemaStanding[];
  timer: TurnTimer | null;
  /** Most-spared player at `gameover`. */
  winnerId: PlayerId | null;
};

/** What a given controller is being asked to do right now. */
export type DilemaDecision =
  | 'propose' // non-Maquinista on the acting team, no team proposal yet
  | 'confirm' // non-Maquinista, a team proposal is on the table to confirm
  | 'decide' // the Maquinista, `verdict` phase
  | 'wait' // nothing to do (confirmed, other team, spectating)
  | null;

export type DilemaPrivateState = {
  playerId: PlayerId;
  isConductor: boolean;
  /** The track this player defends this round (`null` while Maquinista or between rounds). */
  myTrack: DilemaTrack | null;
  pendingDecision: DilemaDecision;
  /** The current pick step, or `null`. */
  step: DilemaStep | null;
  /** This team's candidates for the current step (empty for the Maquinista / outside picks). */
  candidates: DilemaCandidate[];
  /** Modifier step only: the base cards this team may staple onto. */
  modifierTargets: DilemaModifierTarget[];
  /** The card id this team is currently proposing, or `null`. */
  teamProposalCardId: string | null;
  /** Modifier step only: the base-card id the team's proposal would staple onto. */
  teamProposalTargetId: string | null;
  /** `true` once this player has confirmed the current proposal. */
  iConfirmed: boolean;
  /** Confirmed / total connected members of this player's team. */
  teamConfirmedCount: number;
  teamMemberCount: number;
};

/**
 * Controller → server payloads, carried inside `GAME_ACTION { gameId, action }`.
 * Zod validation lives in `server/src/games/dilema/action-schema.ts`.
 */
export type DilemaAction =
  | { type: 'propose'; cardId: string; targetCardId?: string }
  | { type: 'confirm' }
  | { type: 'unconfirm' }
  | { type: 'castVerdict'; killedTrack: DilemaTrack };
