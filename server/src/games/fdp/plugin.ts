import type { GamePlugin } from '../../core/game-plugin';
import { parseFdpAction } from './action-schema';
import { MAX_PLAYERS, MIN_PLAYERS } from './constants';
import { FdpGame } from './fdp-game';

export const fdpPlugin: GamePlugin = {
  meta: {
    id: 'fdp',
    // §47: "FDP — Foi De Propósito" is this game's own name (Cards-Against-Humanity-style).
    // Rename here + in BrandMark (which shows the short "FDP").
    name: 'FDP — Foi De Propósito',
    tagline: 'Complete a frase mais safada e roube os votos da sala (+18)',
    minPlayers: MIN_PLAYERS,
    maxPlayers: MAX_PLAYERS,
    capabilities: { rounds: false, turnTimer: true, pause: true },
  },
  create: (ctx) => new FdpGame(ctx),
  parseAction: parseFdpAction,
};
