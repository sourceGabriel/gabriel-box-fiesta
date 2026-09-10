import type { GamePlugin } from '../../core/game-plugin';
import { parseFase10Action } from './action-schema';
import { DEFAULT_TARGET_PHASE, MAX_PLAYERS, MIN_PLAYERS, TARGET_PHASE_OPTIONS } from './constants';
import { Fase10Game } from './fase10-game';

export const fase10Plugin: GamePlugin = {
  meta: {
    id: 'fase10',
    // Placeholder name — literal like "UNO"/"Coup". Rename here + in BrandMark
    // ("Fase 10") before any public distribution (Phase 10 is a Mattel trademark).
    name: 'Fase 10',
    tagline: 'Complete as 10 fases — grupos e sequências — antes de todo mundo.',
    minPlayers: MIN_PLAYERS,
    maxPlayers: MAX_PLAYERS,
    lengthOptions: {
      label: 'Fases para vencer',
      values: [...TARGET_PHASE_OPTIONS],
      default: DEFAULT_TARGET_PHASE,
    },
    capabilities: { rounds: true, turnTimer: true, pause: true },
  },
  create: (ctx) => new Fase10Game(ctx),
  parseAction: parseFase10Action,
};
