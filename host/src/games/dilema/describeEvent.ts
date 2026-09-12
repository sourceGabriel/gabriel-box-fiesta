import type { DilemaGameEvent, DilemaStep } from '@party/shared';
import type { BroadcastItem } from '@party/ui';

const TRACK_PT: Record<'left' | 'right', string> = { left: 'Trilho Esquerdo', right: 'Trilho Direito' };
const STEP_PT: Record<DilemaStep, string> = { innocent: 'inocente', guilty: 'culpado', modifier: 'modificador' };

/**
 * Dilema events → broadcast lower-thirds for the host TV. The Maquinista reveal
 * is a `<Moment>` driven from the public state in the view; the verdict itself
 * is the trolley-crash animation baked into the persistent track board (not a
 * `<Moment>` — a full-screen overlay would fight the board's own drama). Here
 * we only narrate the quieter stuff.
 */
export const broadcastFor = (event: DilemaGameEvent, nameOf: (id: string) => string): BroadcastItem | null => {
  switch (event.type) {
    case 'round_started':
      return { tier: 'important', graphic: 'headline', eyebrow: `Rodada ${event.round}/${event.totalRounds}`, title: 'Formando os times' };
    case 'pick_step_started':
      return { tier: 'important', graphic: 'lower-third', eyebrow: 'Passo', title: `Escolham o ${STEP_PT[event.step]}` };
    case 'team_locked':
      return { tier: 'ambient', graphic: 'lower-third', eyebrow: 'Travou', title: `${TRACK_PT[event.side]} travou o ${STEP_PT[event.step]}` };
    case 'verdict_started':
      return { tier: 'important', graphic: 'headline', eyebrow: 'Veredito', title: `${nameOf(event.conductorId)} decide…` };
    case 'game_paused':
      return { tier: 'critical', graphic: 'headline', title: 'Partida pausada' };
    default:
      return null;
  }
};
