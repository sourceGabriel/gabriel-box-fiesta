import type { GamePlugin } from '../../core/game-plugin';
import { parseCoupAction } from './action-schema';
import { MAX_PLAYERS, MIN_PLAYERS } from './constants';
import { CoupGame } from './coup-game';

export const coupPlugin: GamePlugin = {
  meta: {
    id: 'coup',
    // Placeholder name — give it an original one before any public distribution (trademark).
    name: 'Coup',
    tagline: 'Blefe, desafie e seja o último com influência na corte',
    minPlayers: MIN_PLAYERS,
    maxPlayers: MAX_PLAYERS,
    capabilities: { rounds: false, turnTimer: true, pause: true },
  },
  create: (ctx) => new CoupGame(ctx),
  parseAction: parseCoupAction,
};
