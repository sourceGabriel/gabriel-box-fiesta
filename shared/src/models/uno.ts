import type { Direction, Phase, PlayerId, TurnTimer } from './common';

export type UnoColor = 'red' | 'yellow' | 'green' | 'blue' | 'wild';
export type UnoCardType = 'number' | 'skip' | 'reverse' | 'draw_two' | 'wild' | 'wild_draw_four';

export type UnoCard = {
  id: string;
  color: UnoColor;
  type: UnoCardType;
  value: number | null;
};

export type UnoPlayerState = {
  id: PlayerId;
  name: string;
  connected: boolean;
  handCount: number;
  calledUno: boolean;
  score: number;
};

export type UnoPublicState = {
  phase: Phase;
  roomCode: string;
  players: UnoPlayerState[];
  currentPlayerId: PlayerId | null;
  direction: Direction;
  currentColor: Exclude<UnoColor, 'wild'> | null;
  topDiscard: UnoCard | null;
  topDrawPileCard: UnoCard | null;
  drawPileCount: number;
  pendingDraw: number;
  pendingDrawType: 'draw_two' | 'wild_draw_four' | null;
  turn: number;
  round: number;
  timer: TurnTimer | null;
  winnerPlayerId: PlayerId | null;
};

export type UnoPrivatePlayerState = {
  playerId: PlayerId;
  hand: UnoCard[];
  canPlay: boolean;
  selectableCardIds: string[];
};

export type UnoFullState = {
  phase: Phase;
  roomCode: string;
  playersOrder: PlayerId[];
  players: Record<PlayerId, UnoPlayerState>;
  hands: Record<PlayerId, UnoCard[]>;
  drawPile: UnoCard[];
  discardPile: UnoCard[];
  currentPlayerId: PlayerId | null;
  direction: Direction;
  currentColor: Exclude<UnoColor, 'wild'> | null;
  pendingDraw: number;
  pendingDrawType: 'draw_two' | 'wild_draw_four' | null;
  pendingColorChoiceBy: PlayerId | null;
  turn: number;
  round: number;
  timer: TurnTimer | null;
  winnerPlayerId: PlayerId | null;
  unoWindow: Record<PlayerId, number | null>;
};
