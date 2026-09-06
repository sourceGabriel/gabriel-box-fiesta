import type { ActionType, Character } from './types';

/** Classic Coup constants. Ported from the standalone repo's `src/shared/constants.ts`. */

export const MIN_PLAYERS = 2;
export const MAX_PLAYERS = 6;
export const STARTING_COINS = 2;
export const CARDS_PER_CHARACTER = 3;
export const STARTING_HAND_SIZE = 2;
export const COUP_COST = 7;
export const ASSASSINATE_COST = 3;
export const FORCED_COUP_THRESHOLD = 10;
export const EXCHANGE_DRAW_COUNT = 2;
export const TOTAL_COINS = 50;

/** Reaction window (challenge / block) and turn/decision window, in ms. */
export const CHALLENGE_TIMER_MS = 15_000;
export const TURN_TIMER_MS = 30_000;

export const ACTION_DISPLAY_NAMES: Record<ActionType, string> = {
  Income: 'Income',
  ForeignAid: 'Foreign Aid',
  Coup: 'Coup',
  Tax: 'Tax',
  Assassinate: 'Assassinate',
  Steal: 'Steal',
  Exchange: 'Exchange',
};

export interface ActionDefinition {
  type: ActionType;
  /** Character that must be claimed (null = no claim needed). */
  claimedCharacter: Character | null;
  cost: number;
  requiresTarget: boolean;
  challengeable: boolean;
  /** Which characters can block this action. */
  blockedBy: Character[];
}

export const ACTION_DEFINITIONS: Record<ActionType, ActionDefinition> = {
  Income: { type: 'Income', claimedCharacter: null, cost: 0, requiresTarget: false, challengeable: false, blockedBy: [] },
  ForeignAid: { type: 'ForeignAid', claimedCharacter: null, cost: 0, requiresTarget: false, challengeable: false, blockedBy: ['Duke'] },
  Coup: { type: 'Coup', claimedCharacter: null, cost: COUP_COST, requiresTarget: true, challengeable: false, blockedBy: [] },
  Tax: { type: 'Tax', claimedCharacter: 'Duke', cost: 0, requiresTarget: false, challengeable: true, blockedBy: [] },
  Assassinate: {
    type: 'Assassinate',
    claimedCharacter: 'Assassin',
    cost: ASSASSINATE_COST,
    requiresTarget: true,
    challengeable: true,
    blockedBy: ['Contessa'],
  },
  Steal: {
    type: 'Steal',
    claimedCharacter: 'Captain',
    cost: 0,
    requiresTarget: true,
    challengeable: true,
    blockedBy: ['Captain', 'Ambassador'],
  },
  Exchange: { type: 'Exchange', claimedCharacter: 'Ambassador', cost: 0, requiresTarget: false, challengeable: true, blockedBy: [] },
};

export const CHARACTER_DESCRIPTIONS: Record<Character, string> = {
  Duke: 'Taxa: pega 3 moedas. Bloqueia Ajuda Externa.',
  Assassin: 'Assassinar: paga 3 moedas, o alvo perde uma influência.',
  Captain: 'Extorquir: rouba 2 moedas do alvo. Bloqueia Extorsão.',
  Ambassador: 'Trocar: compra 2 cartas, devolve 2. Bloqueia Extorsão.',
  Contessa: 'Bloqueia Assassinato.',
};
