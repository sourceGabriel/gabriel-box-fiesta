import type { DilemaGameEvent, DilemaStep } from '@party/shared';

const TRACK_PT: Record<'left' | 'right', string> = { left: 'Trilho Esquerdo', right: 'Trilho Direito' };
const STEP_PT: Record<DilemaStep, string> = { innocent: 'inocente', guilty: 'culpado', modifier: 'modificador' };

/** A human line for the host event feed, or null for events not worth showing. */
export const describeEvent = (event: DilemaGameEvent, nameOf: (id: string) => string): string | null => {
  switch (event.type) {
    case 'game_started':
      return `🚋 Dilema nos Trilhos — ${event.totalRounds} rodadas`;
    case 'round_started':
      return `Rodada ${event.round} de ${event.totalRounds}`;
    case 'assignments_made':
      return `🎩 ${nameOf(event.conductorId)} é o Maquinista`;
    case 'pick_step_started':
      return `🃏 Escolham o ${STEP_PT[event.step]} — em consenso`;
    case 'team_proposed':
      return null; // the live pick-status panel already shows the proposal — no feed spam on every re-propose
    case 'team_locked':
      return `✅ ${TRACK_PT[event.side]} travou o ${STEP_PT[event.step]}`;
    case 'both_locked':
      return null;
    case 'verdict_started':
      return `⚖️ ${nameOf(event.conductorId)} decide…`;
    case 'verdict_cast':
      return event.auto
        ? `🪙 Maquinista fora — a sorte atropelou o ${TRACK_PT[event.killedTrack].toLowerCase()}`
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
