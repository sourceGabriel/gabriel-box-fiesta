import type { ZapGameEvent } from '@party/shared';

/** A human line for the host event feed, or null for events not worth showing. */
export const describeEvent = (event: ZapGameEvent, nameOf: (id: string) => string): string | null => {
  switch (event.type) {
    case 'game_started':
      return `⚡ Zap! começou — ${event.totalRounds} rodadas`;
    case 'round_started':
      return event.roundKind === 'final'
        ? `🔥 Rodada ${event.round}: ÚLTIMA CHANCE (pontos triplos)`
        : `Rodada ${event.round} de ${event.totalRounds}`;
    case 'answering_started':
      return '✍️ Escrevam as respostas no celular';
    case 'all_answers_in':
      return '✅ Todas as respostas chegaram';
    case 'duel_started':
      return `🥊 Duelo: "${event.prompt}"`;
    case 'duel_revealed': {
      if (event.zap) return '⚡ ZAP! Levou todos os votos';
      if (event.winnerSlot === null) return '🤝 Empate no duelo';
      return `🏅 Votos: ${event.votes.join(' × ')}`;
    }
    case 'round_finished': {
      const top = event.standings[0];
      return top ? `Fim da rodada — ${nameOf(top.playerId)} lidera com ${top.score}` : 'Fim da rodada';
    }
    case 'game_finished':
      return `🏆 ${nameOf(event.winnerId)} venceu o Zap!`;
    case 'game_paused':
      return '⏸ Partida pausada';
    case 'game_resumed':
      return '▶ Partida retomada';
    default:
      return null;
  }
};
