import type { FdpGameEvent } from '@party/shared';
import type { BroadcastItem } from '@party/ui';

/**
 * FDP events → broadcast lower-thirds for the host TV. The round winner and a
 * sweep are `<Moment>`s driven from the public state in the view — here we
 * only narrate the quieter stuff.
 */
export const broadcastFor = (event: FdpGameEvent, nameOf: (id: string) => string): BroadcastItem | null => {
  switch (event.type) {
    case 'round_started':
      return event.roundKind === 'final'
        ? { tier: 'critical', graphic: 'headline', eyebrow: 'Rodada final', title: 'Final FDP — pontos em dobro' }
        : { tier: 'important', graphic: 'headline', eyebrow: `Rodada ${event.round}/${event.totalRounds}`, title: 'Completem no celular' };
    case 'all_answers_in':
      return { tier: 'important', graphic: 'lower-third', eyebrow: 'Fechou', title: 'Todas as respostas chegaram' };
    case 'voting_started':
      return { tier: 'important', graphic: 'lower-third', eyebrow: 'Na mesa', title: `${event.answerCount} respostas — votem na melhor` };
    case 'answer_submitted':
      return { tier: 'ambient', graphic: 'lower-third', eyebrow: 'Pronto', title: `${nameOf(event.playerId)} respondeu`, playerId: event.playerId };
    case 'game_paused':
      return { tier: 'critical', graphic: 'headline', title: 'Partida pausada' };
    default:
      return null;
  }
};
