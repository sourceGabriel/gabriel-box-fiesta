import type { PlayerId, TurnTimer } from './common';

/**
 * Dilema nos Trilhos — wire model (game #8, inspired by the trolley problem /
 * *Trial by Trolley*). `shared/` stays types-only: these shapes travel opaquely
 * inside `GAME_STATE_PUBLIC` / `PLAYER_STATE_PRIVATE`; only the Dilema engine and
 * its host/controller views know them.
 *
 * Loop of one round:
 *  1. `assigning` — one player is the Maquinista (rotates by join order); the rest
 *     are re-split into Trilho Esquerdo / Direito. Each track gets one seed
 *     "innocent".
 *  2. `playing` — every non-Maquinista holds a hand of cards and plays as many as
 *     they want: `innocent` onto their OWN track, `guilty` onto the ENEMY track,
 *     `modifier` stapled onto a specific card on either track. Tap "pronto" to
 *     stop early.
 *  3. `verdict` — the Maquinista looks at both tracks and picks which one the
 *     trolley runs over.
 *  4. `roundResults` — the spared track's players each score +1 "poupado".
 *
 * There is no points economy — the score IS the count of rounds survived. `N`
 * rounds (lobby-configurable); the game crowns whoever was spared most.
 *
 * "Dilema nos Trilhos" is this game's own name — the rename point is
 * `dilemaPlugin.meta.name` + the `BrandMark text` ("Dilema"). `gameId` stays
 * `"dilema"`.
 */

export type DilemaPhase =
  | 'assigning' // Maquinista + track split just revealed
  | 'playing' // players are stacking cards onto the tracks
  | 'verdict' // the Maquinista decides which track dies
  | 'roundResults' // the trolley took a track; the spared players scored
  | 'gameover'
  | 'paused';

export type DilemaCardType = 'innocent' | 'guilty' | 'modifier';
export type DilemaTrack = 'left' | 'right';

/** A card resolved onto a track (public — the tracks are on the shared TV). */
export type DilemaTrackCard = {
  /** Stable id within the round, e.g. `"c3"`. Modifier `attachedTo` references this. */
  id: string;
  type: DilemaCardType;
  text: string;
  /** `null` for the seed innocents the game deals; otherwise the player who played it. */
  authorId: PlayerId | null;
  authorName: string | null;
  /** For `modifier` cards: the base-card id it is stapled to. `null` otherwise. */
  attachedTo: string | null;
  /** Populated in projection on base cards: the modifiers stapled onto this card. */
  modifiers: DilemaTrackCard[];
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
};

/** One card in a player's hand (private). */
export type DilemaHandCard = {
  /** Stable id within the round for this player, e.g. `"h2"`. */
  id: string;
  type: DilemaCardType;
  text: string;
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
  conductorId: PlayerId | null;
  conductorName: string | null;
  tracks: { left: DilemaTrackView; right: DilemaTrackView };
  /** `playing`: how many non-Maquinista players are done (hand empty or passed). */
  playersReadyCount: number;
  playersExpectedCount: number;
  /** `verdict` → `gameover`: which track the trolley took. `null` before the verdict. */
  killedTrack: DilemaTrack | null;
  /** `roundResults`+: the track that survived. */
  sparedTrack: DilemaTrack | null;
  /** Whether the verdict was the Maquinista's pick (`false`) or a timeout coin-flip (`true`). */
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
  | 'play' // non-Maquinista, `playing` phase, hand not empty and not passed
  | 'decide' // the Maquinista, `verdict` phase
  | 'wait' // nothing to do
  | null;

export type DilemaPrivateState = {
  playerId: PlayerId;
  isConductor: boolean;
  /** The track this player defends this round (`null` while Maquinista or between rounds). */
  myTrack: DilemaTrack | null;
  pendingDecision: DilemaDecision;
  /** Cards still in hand. Empty for the Maquinista and outside `playing`. */
  hand: DilemaHandCard[];
  /** How many cards this player has played this round. */
  cardsPlayed: number;
  /** `true` once the player taps "pronto" (or empties their hand). */
  passed: boolean;
};

/**
 * Controller → server payloads, carried inside `GAME_ACTION { gameId, action }`.
 * Zod validation lives in `server/src/games/dilema/action-schema.ts`.
 */
export type DilemaAction =
  | { type: 'playCard'; cardId: string; targetTrack: DilemaTrack; targetCardId?: string }
  | { type: 'pass' }
  | { type: 'castVerdict'; killedTrack: DilemaTrack };
