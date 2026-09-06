import type { GamePlugin } from '../../core/game-plugin';
import { parseCoupAction } from './action-schema';
import { MAX_PLAYERS, MIN_PLAYERS } from './constants';
import { CoupGame } from './coup-game';

export const coupPlugin: GamePlugin = {
  meta: {
    id: 'coup',
    // §47: replace with an original name before any distribution.
    name: 'Coup',
    tagline: 'Blefe, desafie e seja o último com influência na corte',
    minPlayers: MIN_PLAYERS,
    maxPlayers: MAX_PLAYERS,
    capabilities: { rounds: false, turnTimer: true, pause: true },
  },
  create: (ctx) => new CoupGame(ctx),
  parseAction: parseCoupAction,
};
