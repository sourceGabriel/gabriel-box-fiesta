import type { GamePlugin } from '../../core/game-plugin';
import { parseSintoniaAction } from './action-schema';
import { MAX_PLAYERS, MIN_PLAYERS, TOTAL_ROUNDS } from './constants';
import { SintoniaGame } from './sintonia-game';

export const sintoniaPlugin: GamePlugin = {
  meta: {
    id: 'sintonia',
    // "Sintonia" is this game's own name (*Wavelength*-inspired, clean-room).
    // Rename here + in BrandMark ("Sintonia").
    name: 'Sintonia',
    tagline: 'Uma dica, um dial escondido — o quão em sintonia vocês estão?',
    minPlayers: MIN_PLAYERS,
    maxPlayers: MAX_PLAYERS,
    lengthOptions: { label: 'Rodadas', values: [4, 6, 8], default: TOTAL_ROUNDS },
    capabilities: { rounds: false, turnTimer: true, pause: true },
  },
  create: (ctx) => new SintoniaGame(ctx),
  parseAction: parseSintoniaAction,
};
