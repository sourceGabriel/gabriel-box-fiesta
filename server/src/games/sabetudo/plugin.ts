import type { GamePlugin } from '../../core/game-plugin';
import { parseSabeTudoAction } from './action-schema';
import { MAX_PLAYERS, MIN_PLAYERS } from './constants';
import { SabeTudoGame } from './sabetudo-game';

export const sabeTudoPlugin: GamePlugin = {
  meta: {
    id: 'sabetudo',
    // §47: "Sabe-Tudo" is this game's own name (a fast trivia). Rename here + in BrandMark.
    name: 'Sabe-Tudo',
    tagline: 'Responda rápido, acerte mais que os outros e dispare no placar',
    minPlayers: MIN_PLAYERS,
    maxPlayers: MAX_PLAYERS,
    capabilities: { rounds: false, turnTimer: true, pause: true },
  },
  create: (ctx) => new SabeTudoGame(ctx),
  parseAction: parseSabeTudoAction,
};
