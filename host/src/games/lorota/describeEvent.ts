import type { LorotaGameEvent } from '@party/shared';
import type { BroadcastItem } from '@party/ui';

/**
 * Lorota! events → broadcast lower-thirds for the host TV. The truth reveal and
 * the round-end standings are `<Moment>`s driven from the public state in the
 * view — here we only narrate the quieter stuff.
 */
export const broadcastFor = (event: LorotaGameEvent, nameOf: (id: string) => string): BroadcastItem | null => {
  switch (event.type) {
    case 'round_started':
      return event.roundKind === 'final'
        ? { tier: 'critical', graphic: 'headline', eyebrow: 'Rodada final', title: 'Lorota Final — pontos em dobro' }
        : { tier: 'important', graphic: 'headline', eyebrow: `Rodada ${event.round}/${event.totalRounds}`, title: 'Inventem uma mentira' };
    case 'all_lies_in':
      return { tier: 'important', graphic: 'lower-third', eyebrow: 'Fechou', title: 'Todas as mentiras chegaram' };
    case 'guessing_started':
      return { tier: 'important', graphic: 'lower-third', eyebrow: 'Na mesa', title: `${event.optionCount} opções — achem a verdade` };
    case 'lie_submitted':
      return { tier: 'ambient', graphic: 'lower-third', eyebrow: 'Pronto', title: `${nameOf(event.playerId)} mentiu`, playerId: event.playerId };
    case 'round_finished': {
      const top = event.standings[0];
      return top
        ? { tier: 'important', graphic: 'lower-third', eyebrow: 'Placar', title: `${nameOf(top.playerId)} lidera com ${top.score}`, playerId: top.playerId }
        : null;
    }
    case 'game_paused':
      return { tier: 'critical', graphic: 'headline', title: 'Partida pausada' };
    default:
      return null;
  }
};
