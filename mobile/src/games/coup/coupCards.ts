import type { CoupActionType, CoupCharacter } from '@party/shared';

export const CHARACTER_META: Record<CoupCharacter, { label: string; emoji: string; color: string }> = {
  Duke: { label: 'Duque', emoji: '👑', color: '#9b59b6' },
  Assassin: { label: 'Assassino', emoji: '🗡️', color: '#475569' },
  Captain: { label: 'Capitão', emoji: '⚓', color: '#2980b9' },
  Ambassador: { label: 'Embaixador', emoji: '📜', color: '#27ae60' },
  Contessa: { label: 'Condessa', emoji: '🌹', color: '#e74c3c' },
};

export const ACTION_LABEL: Record<string, string> = {
  Income: 'Renda',
  ForeignAid: 'Ajuda Externa',
  Coup: 'Golpe',
  Tax: 'Taxar',
  Assassinate: 'Assassinar',
  Steal: 'Extorquir',
  Exchange: 'Trocar',
};

export type ActionSpec = {
  type: CoupActionType;
  label: string;
  detail: string;
  cost: number;
  target: boolean;
};

/** Emoji reactions offered on the controller (sent as generic REACTION). */
export const REACTION_EMOJIS = ['👍', '😂', '😮', '😡', '🤔', '🧂', '🔥', '🎭'] as const;

export const ACTIONS: ActionSpec[] = [
  { type: 'Income', label: 'Renda', detail: '+1 moeda', cost: 0, target: false },
  { type: 'ForeignAid', label: 'Ajuda Externa', detail: '+2 · bloqueável por Duque', cost: 0, target: false },
  { type: 'Tax', label: 'Taxar', detail: '+3 · alega Duque', cost: 0, target: false },
  { type: 'Steal', label: 'Extorquir', detail: 'rouba 2 · alega Capitão', cost: 0, target: true },
  { type: 'Assassinate', label: 'Assassinar', detail: '−3 · alega Assassino', cost: 3, target: true },
  { type: 'Exchange', label: 'Trocar', detail: 'troca cartas · alega Embaixador', cost: 0, target: false },
  { type: 'Coup', label: 'Golpe', detail: '−7 · sem bloqueio/desafio', cost: 7, target: true },
];
