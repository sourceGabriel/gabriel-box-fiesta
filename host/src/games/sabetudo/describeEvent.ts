import type { SabeTudoGameEvent } from '@party/shared';

const LETTERS = ['A', 'B', 'C', 'D'];

/** A human line for the host event feed, or null for events not worth showing. */
export const describeEvent = (event: SabeTudoGameEvent, nameOf: (id: string) => string): string | null => {
  switch (event.type) {
    case 'game_started':
      return `🧠 Sabe-Tudo começou — ${event.totalRounds} perguntas`;
    case 'question_started':
      return `Pergunta ${event.round} de ${event.totalRounds}${event.category ? ` · ${event.category}` : ''}`;
    case 'answer_submitted':
      return `${nameOf(event.playerId)} respondeu`;
    case 'all_answers_in':
      return '✅ Todo mundo respondeu';
    case 'reveal_started':
      return `🎯 A resposta certa era a ${LETTERS[event.correctIndex] ?? '?'}`;
    case 'round_finished': {
      const top = event.standings[0];
      return top ? `${nameOf(top.playerId)} lidera com ${top.score}` : 'Fim da pergunta';
    }
    case 'game_finished':
      return `🏆 ${nameOf(event.winnerId)} venceu o Sabe-Tudo!`;
    case 'game_paused':
      return '⏸ Partida pausada';
    case 'game_resumed':
      return '▶ Partida retomada';
    default:
      return null;
  }
};
