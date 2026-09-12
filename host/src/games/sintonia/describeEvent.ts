import type { SintoniaGameEvent } from '@party/shared';
import type { BroadcastItem } from '@party/ui';

/**
 * Sintonia events → broadcast lower-thirds for the host TV. The best-guess
 * spotlight is a `<Moment>` driven from the public state in the view — here we
 * only narrate the quieter stuff.
 */
export const broadcastFor = (event: SintoniaGameEvent, nameOf: (id: string) => string): BroadcastItem | null => {
  switch (event.type) {
    case 'round_started':
      return { tier: 'important', graphic: 'headline', eyebrow: `Rodada ${event.round}/${event.totalRounds}`, title: `🔮 ${nameOf(event.mediumId)} é o médium` };
    case 'clue_given':
      return { tier: 'important', graphic: 'lower-third', eyebrow: 'Dica dada', title: 'Cada um puxa o próprio ponteiro' };
    case 'clue_skipped':
      return { tier: 'important', graphic: 'headline', title: 'Sem dica — rodada pulada' };
    case 'guess_locked':
      return { tier: 'ambient', graphic: 'lower-third', eyebrow: '🔒 Travou', title: `${nameOf(event.playerId)} travou o palpite`, playerId: event.playerId };
    case 'game_paused':
      return { tier: 'critical', graphic: 'headline', title: 'Partida pausada' };
    default:
      return null;
  }
};
