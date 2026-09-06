import type { CoupCharacter } from '@party/shared';

/** Character presentation for Coup — emoji + colour token, no image assets (§47 identity deferred). */
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
