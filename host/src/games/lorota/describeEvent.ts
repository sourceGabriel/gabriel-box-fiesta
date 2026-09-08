import type { LorotaGameEvent } from '@party/shared';

/** A human line for the host event feed, or null for events not worth showing. */
export const describeEvent = (event: LorotaGameEvent, nameOf: (id: string) => string): string | null => {
  switch (event.type) {
    case 'game_started':
      return `🤥 Lorota! começou — ${event.totalRounds} rodadas`;
    case 'round_started':
      return event.roundKind === 'final'
        ? `🔥 Rodada ${event.round}: LOROTA FINAL (pontos em dobro)`
        : `Rodada ${event.round} de ${event.totalRounds}`;
    case 'lying_started':
      return '✍️ Inventem uma resposta falsa no celular';
    case 'lie_submitted':
      return `${nameOf(event.playerId)} enviou a mentira`;
    case 'all_lies_in':
      return '✅ Todas as mentiras chegaram';
    case 'guessing_started':
      return `🔎 ${event.optionCount} opções na mesa — achem a verdade`;
    case 'guess_submitted':
      return `${nameOf(event.playerId)} deu o palpite`;
    case 'reveal_started':
      return '🎭 Revelando…';
    case 'round_finished': {
      const top = event.standings[0];
      return top ? `Fim da rodada — ${nameOf(top.playerId)} lidera com ${top.score}` : 'Fim da rodada';
    }
    case 'game_finished':
      return `🏆 ${nameOf(event.winnerId)} venceu a Lorota!`;
    case 'game_paused':
      return '⏸ Partida pausada';
    case 'game_resumed':
      return '▶ Partida retomada';
    default:
      return null;
  }
};
