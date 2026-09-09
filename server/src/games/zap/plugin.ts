import type { GamePlugin } from '../../core/game-plugin';
import { parseZapAction } from './action-schema';
import { MAX_PLAYERS, MIN_PLAYERS } from './constants';
import { ZapGame } from './zap-game';

export const zapPlugin: GamePlugin = {
  meta: {
    id: 'zap',
    // "Zap!" is this game's own name (decided with the user 2026-09-07).
    name: 'Zap!',
    tagline: 'Responda o prompt, encare o duelo e roube os votos da sala',
    minPlayers: MIN_PLAYERS,
    maxPlayers: MAX_PLAYERS,
    lengthOptions: { label: 'Rodadas', values: [3, 5, 7], default: 3 },
    capabilities: { rounds: false, turnTimer: true, pause: true },
  },
  create: (ctx) => new ZapGame(ctx),
  parseAction: parseZapAction,
};
