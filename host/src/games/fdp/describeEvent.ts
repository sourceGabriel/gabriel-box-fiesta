import type { FdpGameEvent } from '@party/shared';

/** A human line for the host event feed, or null for events not worth showing. */
export const describeEvent = (event: FdpGameEvent, nameOf: (id: string) => string): string | null => {
  switch (event.type) {
    case 'game_started':
      return `😈 FDP começou — ${event.totalRounds} rodadas`;
    case 'round_started':
      return event.roundKind === 'final'
        ? `🔥 Rodada ${event.round}: FINAL FDP (pontos em dobro)`
        : `Rodada ${event.round} de ${event.totalRounds}`;
    case 'writing_started':
      return '✍️ Completem a frase no celular';
    case 'answer_submitted':
      return `${nameOf(event.playerId)} mandou a resposta`;
    case 'all_answers_in':
      return '✅ Todas as respostas chegaram';
    case 'voting_started':
      return `🗳️ ${event.answerCount} respostas na mesa — votem na melhor`;
    case 'vote_cast':
      return `${nameOf(event.playerId)} votou`;
    case 'results_started':
      return '🎭 Revelando os autores…';
    case 'round_finished':
      return event.winnerId ? `👑 ${nameOf(event.winnerId)} ganhou a rodada` : 'Rodada empatada';
    case 'game_finished':
      return `🏆 ${nameOf(event.winnerId)} venceu o FDP!`;
    case 'game_paused':
      return '⏸ Partida pausada';
    case 'game_resumed':
      return '▶ Partida retomada';
    default:
      return null;
  }
};
