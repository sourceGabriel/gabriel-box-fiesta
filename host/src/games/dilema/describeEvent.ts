import type { DilemaGameEvent } from '@party/shared';

const TRACK_PT: Record<'left' | 'right', string> = { left: 'Trilho Esquerdo', right: 'Trilho Direito' };

/** A human line for the host event feed, or null for events not worth showing. */
export const describeEvent = (event: DilemaGameEvent, nameOf: (id: string) => string): string | null => {
  switch (event.type) {
    case 'game_started':
      return `🚋 Dilema nos Trilhos — ${event.totalRounds} rodadas`;
    case 'round_started':
      return `Rodada ${event.round} de ${event.totalRounds}`;
    case 'assignments_made':
      return `🎩 ${nameOf(event.conductorId)} é o Maquinista`;
    case 'playing_started':
      return '🃏 Montem os trilhos no celular';
    case 'card_played':
      return `${nameOf(event.playerId)} jogou ${
        event.cardType === 'innocent' ? 'um inocente' : event.cardType === 'guilty' ? 'um culpado' : 'um modificador'
      } no ${TRACK_PT[event.track].toLowerCase()}`;
    case 'player_passed':
      return `${nameOf(event.playerId)} está pronto`;
    case 'all_cards_in':
      return '✅ Trilhos fechados';
    case 'verdict_started':
      return `⚖️ ${nameOf(event.conductorId)} está decidindo…`;
    case 'verdict_cast':
      return event.auto
        ? `🪙 Tempo esgotado — a sorte atropelou o ${TRACK_PT[event.killedTrack].toLowerCase()}`
        : `🔧 Maquinista mandou o trólebus no ${TRACK_PT[event.killedTrack].toLowerCase()}`;
    case 'round_finished':
      return `🚋 ${TRACK_PT[event.sparedTrack]} sobreviveu`;
    case 'game_finished':
      return `🏆 ${nameOf(event.winnerId)} foi o mais poupado!`;
    case 'game_paused':
      return '⏸ Partida pausada';
    case 'game_resumed':
      return '▶ Partida retomada';
    default:
      return null;
  }
};
