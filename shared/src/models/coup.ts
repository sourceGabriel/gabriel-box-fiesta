import type { PlayerId, TurnTimer } from './common';

/**
 * Coup wire model. `shared/` stays types-only — these travel opaquely inside
 * `GAME_STATE_PUBLIC` / `PLAYER_STATE_PRIVATE`; only the Coup engine and the
 * Coup host/controller views know these shapes.
 *
 * String values match the server engine's internal `Character` / `ActionType`
 * enum values verbatim, so serialization is a straight pass-through.
 */

export type CoupCharacter = 'Duke' | 'Assassin' | 'Captain' | 'Ambassador' | 'Contessa';

/** The 7 classic actions (Reformation's Convert/Embezzle/Examine are out of v1). */
export type CoupActionType =
  | 'Income'
  | 'ForeignAid'
  | 'Coup'
  | 'Tax'
  | 'Assassinate'
  | 'Steal'
  | 'Exchange';

/**
 * Turn-flow phase, projected from the engine's `TurnPhase`. `'paused'` is a Room
 * overlay (like UNO), not a real engine phase.
 */
export type CoupPhase =
  | 'awaiting_action'
  | 'awaiting_action_challenge'
  | 'awaiting_block'
  | 'awaiting_block_challenge'
  | 'awaiting_influence_loss'
  | 'awaiting_exchange'
  | 'game_over'
  | 'paused';

/** One influence card. `character` is `null` when the card is hidden from the viewer. */
export type CoupInfluence = {
  character: CoupCharacter | null;
  revealed: boolean;
};

export type CoupPublicPlayer = {
  id: PlayerId;
  name: string;
  connected: boolean;
  coins: number;
  /** Total influence cards still in front of the player (hidden + revealed). */
  influenceCount: number;
  /** Cards this player has already lost — face-up for everyone. */
  revealedCharacters: CoupCharacter[];
  isAlive: boolean;
  /** Turn-order seat (0-based). */
  seatIndex: number;
};

export type CoupPendingAction = {
  type: CoupActionType;
  actorId: PlayerId;
  targetId: PlayerId | null;
  /** Character the actor is claiming (e.g. `'Duke'` for Tax), or `null` for unclaimed actions. */
  claimedCharacter: CoupCharacter | null;
};

export type CoupPendingBlock = {
  blockerId: PlayerId;
  claimedCharacter: CoupCharacter;
};

/** An open challenge window — an action-claim or a block-claim awaiting responses. */
export type CoupChallengeWindow = {
  /** Whose claim is on the table. */
  challengedPlayerId: PlayerId;
  claimedCharacter: CoupCharacter;
  /** Players who have already passed (lets the TV show "waiting on N"). */
  passedPlayerIds: PlayerId[];
};

/** Shown for a few seconds after a challenge resolves — drives the reveal overlay. */
export type CoupRevealOutcome = {
  challengerId: PlayerId;
  challengedId: PlayerId;
  character: CoupCharacter;
  /** `true` = the challenged player actually held the card (the challenge failed). */
  challengedHeldCard: boolean;
};

export type CoupPublicState = {
  phase: CoupPhase;
  roomCode: string;
  turnNumber: number;
  currentPlayerId: PlayerId | null;
  players: CoupPublicPlayer[];
  deckCount: number;
  treasury: number;
  pendingAction: CoupPendingAction | null;
  pendingBlock: CoupPendingBlock | null;
  challenge: CoupChallengeWindow | null;
  /** Who must pick a card to lose (phase `'awaiting_influence_loss'`). */
  influenceLossPlayerId: PlayerId | null;
  /** Who is currently exchanging (phase `'awaiting_exchange'`). */
  exchangingPlayerId: PlayerId | null;
  timer: TurnTimer | null;
  winnerId: PlayerId | null;
  /** Set only briefly, right after a challenge resolves. */
  lastReveal: CoupRevealOutcome | null;
};

/** The single decision a given controller is being asked to make right now. */
export type CoupDecision =
  | 'action'
  | 'challenge'
  | 'block'
  | 'block_challenge'
  | 'influence_loss'
  | 'exchange'
  | null;

export type CoupPrivateState = {
  playerId: PlayerId;
  /** This player's real influences (own hidden cards visible). */
  influences: CoupInfluence[];
  /** What this controller must do now — everything else derives from the public state. */
  pendingDecision: CoupDecision;
  /** Legal blocking characters when `pendingDecision === 'block'`. */
  blockOptions: CoupCharacter[];
  /** Present only while it is this player's exchange. */
  exchange: { drawnCards: CoupCharacter[]; keepCount: number } | null;
};
