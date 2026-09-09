import type { GamePlugin } from '../../core/game-plugin';
import { parseLorotaAction } from './action-schema';
import { MAX_PLAYERS, MIN_PLAYERS } from './constants';
import { LorotaGame } from './lorota-game';

export const lorotaPlugin: GamePlugin = {
  meta: {
    id: 'lorota',
    // "Lorota!" is this game's own name (Fibbage-inspired). Rename here + in BrandMark.
    name: 'Lorota!',
    tagline: 'Invente uma resposta falsa e ache a verdadeira no meio das mentiras',
    minPlayers: MIN_PLAYERS,
    maxPlayers: MAX_PLAYERS,
    lengthOptions: { label: 'Rodadas', values: [3, 5, 7], default: 3 },
    capabilities: { rounds: false, turnTimer: true, pause: true },
  },
  create: (ctx) => new LorotaGame(ctx),
  parseAction: parseLorotaAction,
};
