import type { SintoniaGameEvent } from '@party/shared';

/** A human line for the host event feed, or null for events not worth showing. */
export const describeEvent = (
  event: SintoniaGameEvent,
  nameOf: (id: string) => string,
): string | null => {
  switch (event.type) {
    case 'game_started':
      return `📻 Sintonia — ${event.totalRounds} rodadas`;
    case 'round_started':
      return `Rodada ${event.round} de ${event.totalRounds} · 🔮 ${nameOf(event.mediumId)} é o médium`;
    case 'clue_given':
      return `🔮 ${nameOf(event.mediumId)} deu a dica`;
    case 'clue_skipped':
      return '⌛ Sem dica — rodada pulada';
    case 'guessing_started':
      return '🎚️ Cada um puxa o próprio ponteiro';
    case 'guess_locked':
      return `🔒 ${nameOf(event.playerId)} travou o palpite`;
    case 'round_revealed':
      return event.bestPlayerId
        ? `🎯 Alvo em ${event.target} — ${nameOf(event.bestPlayerId)} chegou mais perto (+${event.bestPoints})`
        : `🎯 Alvo em ${event.target} — ninguém chegou perto`;
    case 'round_finished': {
      const top = event.standings[0];
      return top ? `Placar: ${nameOf(top.playerId)} lidera com ${top.score}` : 'Fim da rodada';
    }
    case 'game_finished':
      return event.winnerId === null ? '🤝 Empate!' : `🏆 ${nameOf(event.winnerId)} venceu!`;
    case 'game_paused':
      return '⏸ Partida pausada';
    case 'game_resumed':
      return '▶ Partida retomada';
    default:
      return null;
  }
};
