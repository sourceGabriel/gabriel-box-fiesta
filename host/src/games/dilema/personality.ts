import type { GamePersonality } from '../types';

/** Dilema nos Trilhos' catalog personality — the trolley problem, weaponised. */
export const personality: GamePersonality = {
  accent: '#f97316',
  vibe: 'DILEMA',
  blurb: 'Você decide quem o trólebus atropela. Depois dorme com isso.',
  how: 'Em consenso, cada time põe um inocente no próprio trilho, um culpado no inimigo e um modificador. O Maquinista puxa a alavanca — o trilho poupado marca ponto.',
  tags: ['Decidam juntos', 'Puxe a alavanca'],
  duration: '~15 min',
  chaos: 'Consciência pesada',
  badge: 'Quem morre?',
};
