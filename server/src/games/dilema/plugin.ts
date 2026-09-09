import type { GamePlugin } from '../../core/game-plugin';
import { parseDilemaAction } from './action-schema';
import { MAX_PLAYERS, MIN_PLAYERS, TOTAL_ROUNDS } from './constants';
import { DilemaGame } from './dilema-game';

export const dilemaPlugin: GamePlugin = {
  meta: {
    id: 'dilema',
    // "Dilema nos Trilhos" is this game's own name (trolley problem / Trial by
    // Trolley-inspired). Rename here + in BrandMark (which shows the short "Dilema").
    name: 'Dilema nos Trilhos',
    tagline: 'Seu time escolhe as cartas em consenso — e reza pro Maquinista.',
    minPlayers: MIN_PLAYERS,
    maxPlayers: MAX_PLAYERS,
    lengthOptions: { label: 'Rodadas', values: [3, 5, 7], default: TOTAL_ROUNDS },
    capabilities: { rounds: false, turnTimer: true, pause: true },
  },
  create: (ctx) => new DilemaGame(ctx),
  parseAction: parseDilemaAction,
};
