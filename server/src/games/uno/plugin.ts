import type { GamePlugin } from '../../core/game-plugin';
import { parseUnoAction } from './action-schema';
import { UnoGame } from './uno-game';

export const unoPlugin: GamePlugin = {
  meta: {
    id: 'uno',
    // §47: replace with an original name before any distribution.
    name: 'UNO',
    tagline: 'Combine cor ou número e seja o primeiro a esvaziar a mão',
    minPlayers: 2,
    maxPlayers: 8,
    capabilities: { rounds: true, turnTimer: true, pause: true },
  },
  create: (ctx) => new UnoGame(ctx),
  parseAction: parseUnoAction,
};
