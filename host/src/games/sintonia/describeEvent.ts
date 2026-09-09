import type { SintoniaGameEvent } from '@party/shared';

const TEAM_PT = ['Time Turquesa', 'Time Coral'] as const;

/** A human line for the host event feed, or null for events not worth showing. */
export const describeEvent = (
  event: SintoniaGameEvent,
  nameOf: (id: string) => string,
): string | null => {
  switch (event.type) {
    case 'game_started':
      return `📻 Sintonia — ${event.totalRounds} rodadas`;
    case 'round_started':
      return `Rodada ${event.round} de ${event.totalRounds} · ${TEAM_PT[event.activeTeamId]} sintoniza`;
    case 'clue_given':
      return `🔮 ${nameOf(event.mediumId)} deu a dica`;
    case 'clue_skipped':
      return '⌛ Sem dica — rodada pulada';
    case 'guessing_started':
      return '🎚️ Girem o dial no celular';
    case 'dial_locked':
      return `🔒 Dial travado em ${event.value}`;
    case 'round_revealed': {
      const band =
        event.bandPoints > 0 ? `+${event.bandPoints} pro ${TEAM_PT[event.activeTeamId]}` : 'errou feio';
      const side = event.sideCorrect ? ' · lado certo +1' : '';
      return `🎯 Alvo em ${event.target} (dial ${event.dialValue}) — ${band}${side}`;
    }
    case 'round_finished': {
      const top = event.standings[0];
      return top ? `Fim da rodada — ${nameOf(top.playerId)} lidera com ${top.score}` : 'Fim da rodada';
    }
    case 'game_finished':
      return event.winnerTeamId === null
        ? '🤝 Empate!'
        : `🏆 ${TEAM_PT[event.winnerTeamId]} venceu!`;
    case 'game_paused':
      return '⏸ Partida pausada';
    case 'game_resumed':
      return '▶ Partida retomada';
    default:
      return null;
  }
};
