import type { ZapGameEvent } from '@party/shared';
import type { BroadcastItem } from '@party/ui';

/**
 * Zap! events → broadcast lower-thirds for the host TV. Big beats (a duel win, a
 * ZAP! sweep, the game winner) are `<Moment>`s driven from the public state in
 * the view — here we only narrate the quieter stuff.
 */
export const broadcastFor = (event: ZapGameEvent, nameOf: (id: string) => string): BroadcastItem | null => {
  switch (event.type) {
    case 'round_started':
      return event.roundKind === 'final'
        ? { tier: 'critical', graphic: 'headline', eyebrow: 'Rodada final', title: 'Última Chance — pontos triplos' }
        : { tier: 'important', graphic: 'headline', eyebrow: `Rodada ${event.round}/${event.totalRounds}`, title: 'Escrevam no celular' };
    case 'all_answers_in':
      return { tier: 'important', graphic: 'lower-third', eyebrow: 'Fechou', title: 'Todas as respostas chegaram' };
    case 'duel_started':
      return { tier: 'important', graphic: 'lower-third', eyebrow: 'Duelo', title: event.prompt };
    case 'answer_submitted':
      return { tier: 'ambient', graphic: 'lower-third', eyebrow: 'Pronto', title: `${nameOf(event.playerId)} respondeu`, playerId: event.playerId };
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
