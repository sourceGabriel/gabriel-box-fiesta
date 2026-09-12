import type { PlayerId, TurnTimer } from './common';

/**
 * Fase 10 (game #10) — a clean-room reimplementation of the *Phase 10* contract
 * rummy. Types only; the engine lives in `server/src/games/fase10/`.
 */

export type Fase10Color = 'red' | 'yellow' | 'green' | 'blue';

export type Fase10Card =
  | { id: string; kind: 'number'; color: Fase10Color; value: number }
  | { id: string; kind: 'wild' }
  | { id: string; kind: 'skip' };

/** One grouping requirement inside a phase. */
export type Fase10GroupReq =
  | { type: 'set'; size: number }
  | { type: 'run'; size: number }
  | { type: 'color'; size: number };

export interface Fase10PhaseSpec {
  /** 1..10 */
  index: number;
  /** Short PT-BR label, e.g. `'2 grupos de 3'`. */
  label: string;
  groups: Fase10GroupReq[];
}

/**
 * The 10 canonical phases. This is functional data (what cards a phase needs),
 * not Mattel's copyrighted rulebook text — the labels are our own wording.
 */
export const FASE10_PHASES: readonly Fase10PhaseSpec[] = [
  { index: 1, label: '2 grupos de 3', groups: [{ type: 'set', size: 3 }, { type: 'set', size: 3 }] },
  { index: 2, label: '1 grupo de 3 + 1 sequência de 4', groups: [{ type: 'set', size: 3 }, { type: 'run', size: 4 }] },
  { index: 3, label: '1 grupo de 4 + 1 sequência de 4', groups: [{ type: 'set', size: 4 }, { type: 'run', size: 4 }] },
  { index: 4, label: '1 sequência de 7', groups: [{ type: 'run', size: 7 }] },
  { index: 5, label: '1 sequência de 8', groups: [{ type: 'run', size: 8 }] },
  { index: 6, label: '1 sequência de 9', groups: [{ type: 'run', size: 9 }] },
  { index: 7, label: '2 grupos de 4', groups: [{ type: 'set', size: 4 }, { type: 'set', size: 4 }] },
  { index: 8, label: '7 cartas da mesma cor', groups: [{ type: 'color', size: 7 }] },
  { index: 9, label: '1 grupo de 5 + 1 grupo de 2', groups: [{ type: 'set', size: 5 }, { type: 'set', size: 2 }] },
  { index: 10, label: '1 grupo de 5 + 1 grupo de 3', groups: [{ type: 'set', size: 5 }, { type: 'set', size: 3 }] },
] as const;

/** A grouping laid face-up on the table, with every wild resolved to a concrete value/colour. */
export interface Fase10LaidGroup {
  id: string;
  ownerId: PlayerId;
  req: Fase10GroupReq;
  /** For a `run`, ordered ascending by resolved value. */
  cards: Fase10Card[];
  /** Parallel to `cards` — the value each slot stands for (wild resolved). `null` for a `color` group. */
  values: (number | null)[];
  /** A `color` group's colour (a wild in it counts as this). `null` for set/run groups. */
  color: Fase10Color | null;
}

/** Engine phase. `'paused'` is a projector overlay, not a real engine phase. */
export type Fase10Phase = 'dealing' | 'turn' | 'handOver' | 'gameOver';

export interface Fase10PublicPlayer {
  id: PlayerId;
  name: string;
  connected: boolean;
  /** Phase they're attempting this hand (1..10). Persists across hands. */
  phaseIndex: number;
  /** Cumulative penalty points — lower is better. */
  score: number;
  handCount: number;
  /** Has laid their phase down this hand (⇒ may hit). */
  laid: boolean;
  /** Will miss their next turn. */
  skipped: boolean;
}

export interface Fase10HandResultRow {
  playerId: PlayerId;
  name: string;
  /** Penalty points gained this hand (from cards left in hand). */
  gained: number;
  /** Completed their phase this hand. */
  advanced: boolean;
  /** Phase index after settling this hand. */
  phaseIndex: number;
}

export interface Fase10PublicState {
  phase: Fase10Phase | 'paused';
  roomCode: string;
  players: Fase10PublicPlayer[];
  currentPlayerId: PlayerId | null;
  /** The current player has drawn and may now lay / hit / discard. */
  hasDrawn: boolean;
  topDiscard: Fase10Card | null;
  /** The discard top can be taken (it is a number card). */
  discardDrawable: boolean;
  drawPileCount: number;
  /** Every laid group on the table this hand, any owner. */
  table: Fase10LaidGroup[];
  turn: number;
  hand: number;
  timer: TurnTimer | null;
  /** Phases a player must complete to win (5 / 7 / 10). */
  targetPhase: number;
  /** Populated while `phase === 'handOver'`. */
  handResult: Fase10HandResultRow[] | null;
  handWinnerId: PlayerId | null;
  /** Set while `phase === 'gameOver'`; `null` = tie with no single winner. */
  gameWinnerId: PlayerId | null;
  /** The 10 phase specs, so the TV can render each player's current target. */
  phaseSpecs: readonly Fase10PhaseSpec[];
}

export interface Fase10PrivatePlayerState {
  playerId: PlayerId;
  hand: Fase10Card[];
  phaseIndex: number;
  phaseSpec: Fase10PhaseSpec;
  /** It's my turn and the game isn't paused. */
  canAct: boolean;
  /** It's my turn and I still have to draw. */
  mustDraw: boolean;
  /** I've laid my phase down this hand (⇒ I can hit onto any laid group). */
  laid: boolean;
}
