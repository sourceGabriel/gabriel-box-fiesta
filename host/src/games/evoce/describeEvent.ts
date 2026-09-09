import type { EvoceGameEvent } from '@party/shared';

const KIND_LABEL: Record<string, string> = {
  enquete: 'Enquete',
  legenda: 'Legenda',
  rabisco: 'Rabisco',
  final: 'A Obra-Prima',
};

/** A human line for the host event feed, or null for events not worth showing. */
export const describeEvent = (event: EvoceGameEvent, nameOf: (id: string) => string): string | null => {
  switch (event.type) {
    case 'game_started':
      return `👉 É Você! começou — ${event.totalRounds} rodadas`;
    case 'round_started': {
      const label = KIND_LABEL[event.roundKind] ?? event.roundKind;
      const who = event.targetId ? ` sobre ${nameOf(event.targetId)}` : '';
      return `Rodada ${event.round}: ${label}${who}`;
    }
    case 'answering_started':
      if (event.roundKind === 'enquete') return '🗳️ Votem no celular';
      if (event.roundKind === 'legenda') return '✍️ Completem a frase no celular';
      return '🎨 Desenhem no celular';
    case 'player_answered':
      return `${nameOf(event.playerId)} respondeu`;
    case 'joker_played':
      return `🃏 ${nameOf(event.playerId)} jogou um Curinga`;
    case 'all_answers_in':
      return '✅ Todas as respostas chegaram';
    case 'voting_started':
      return `🗳️ ${event.submissionCount} na mesa — votem na melhor`;
    case 'vote_cast':
      return `${nameOf(event.playerId)} votou`;
    case 'results_started':
      return '🎭 Revelando…';
    case 'round_finished':
      return event.winnerId ? `👑 ${nameOf(event.winnerId)} levou a rodada` : 'Rodada empatada';
    case 'game_finished':
      return `🏆 ${nameOf(event.winnerId)} venceu o É Você!`;
    case 'game_paused':
      return '⏸ Partida pausada';
    case 'game_resumed':
      return '▶ Partida retomada';
    default:
      return null;
  }
};
