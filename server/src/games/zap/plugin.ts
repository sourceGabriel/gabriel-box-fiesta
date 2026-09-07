import type { GamePlugin } from '../../core/game-plugin';
import { parseZapAction } from './action-schema';
import { MAX_PLAYERS, MIN_PLAYERS } from './constants';
import { ZapGame } from './zap-game';

export const zapPlugin: GamePlugin = {
  meta: {
    id: 'zap',
    // §47: "Zap!" is this game's own name (decided with the user 2026-09-07).
    name: 'Zap!',
    tagline: 'Responda o prompt, encare o duelo e roube os votos da sala',
    minPlayers: MIN_PLAYERS,
    maxPlayers: MAX_PLAYERS,
    capabilities: { rounds: false, turnTimer: true, pause: true },
  },
  create: (ctx) => new ZapGame(ctx),
  parseAction: parseZapAction,
};
