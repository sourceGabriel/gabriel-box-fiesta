import type { SabeTudoGameEvent } from '@party/shared';
import type { BroadcastItem } from '@party/ui';

const LETTERS = ['A', 'B', 'C', 'D'];

/**
 * Sabe-Tudo events → broadcast lower-thirds for the host TV. The correct
 * answer and a hot streak are `<Moment>`s driven from the public state in the
 * view — here we only narrate the quieter stuff.
 */
export const broadcastFor = (event: SabeTudoGameEvent, nameOf: (id: string) => string): BroadcastItem | null => {
  switch (event.type) {
    case 'question_started':
      return {
        tier: 'important',
        graphic: 'headline',
        eyebrow: `Pergunta ${event.round}/${event.totalRounds}${event.category ? ` · ${event.category}` : ''}`,
        title: 'Respondam no celular',
      };
    case 'all_answers_in':
      return { tier: 'important', graphic: 'lower-third', eyebrow: 'Fechou', title: 'Todo mundo respondeu' };
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

/** Used by the `reveal` <Moment> title — kept here so the host view doesn't own the letters. */
export const letterFor = (index: number): string => LETTERS[index] ?? '?';
