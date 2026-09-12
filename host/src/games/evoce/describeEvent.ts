import type { EvoceGameEvent } from '@party/shared';
import type { BroadcastItem } from '@party/ui';

const KIND_LABEL: Record<string, string> = {
  enquete: 'Enquete',
  legenda: 'Legenda',
  rabisco: 'Rabisco',
  final: 'A Obra-Prima',
};

/**
 * É Você! events → broadcast lower-thirds for the host TV. The round result
 * (poll winner / caption / artist) is a `<Moment>` driven from the public
 * state in the view — here we only narrate the quieter stuff.
 */
export const broadcastFor = (event: EvoceGameEvent, nameOf: (id: string) => string): BroadcastItem | null => {
  switch (event.type) {
    case 'round_started': {
      const label = KIND_LABEL[event.roundKind] ?? event.roundKind;
      const who = event.targetId ? ` sobre ${nameOf(event.targetId)}` : '';
      return { tier: 'important', graphic: 'headline', eyebrow: `Rodada ${event.round}/${event.totalRounds}`, title: `${label}${who}` };
    }
    case 'all_answers_in':
      return { tier: 'important', graphic: 'lower-third', eyebrow: 'Fechou', title: 'Todas as respostas chegaram' };
    case 'voting_started':
      return { tier: 'important', graphic: 'lower-third', eyebrow: 'Na mesa', title: `${event.submissionCount} respostas — votem na melhor` };
    case 'joker_played':
      return { tier: 'ambient', graphic: 'lower-third', eyebrow: '🃏 Curinga', title: `${nameOf(event.playerId)} jogou um curinga`, playerId: event.playerId };
    case 'game_paused':
      return { tier: 'critical', graphic: 'headline', title: 'Partida pausada' };
    default:
      return null;
  }
};
