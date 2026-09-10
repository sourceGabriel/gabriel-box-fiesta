import type { GamePersonality } from '../types';

/** Fase 10's catalog personality — the long climb up ten hands of rummy. */
export const personality: GamePersonality = {
  accent: '#a855f7',
  vibe: 'ESCADA',
  blurb: 'Dez fases, uma de cada vez. Trinca, sequência, sete de uma cor — e a Pula na cara de quem tá quase lá.',
  how: 'Cada mão você tenta montar a sua fase atual (grupos e sequências). Conseguiu, sobe pra próxima; não conseguiu, repete. Ganha quem fecha a última.',
  tags: ['Monte a fase', 'Encaixe', 'Suba a escada'],
  duration: '~25 min',
  chaos: 'Rivalidade lenta',
  badge: '10 fases',
};
