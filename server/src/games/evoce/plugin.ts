import type { GamePlugin } from '../../core/game-plugin';
import { parseEvoceAction } from './action-schema';
import { MAX_PLAYERS, MIN_PLAYERS } from './constants';
import { EvoceGame } from './evoce-game';

export const evocePlugin: GamePlugin = {
  meta: {
    id: 'evoce',
    // "É Você!" is this game's own name (inspired by PlayStation's That's You!).
    name: 'É Você!',
    tagline: 'Perguntas sobre vocês mesmos — quem conhece melhor a galera ganha',
    minPlayers: MIN_PLAYERS,
    maxPlayers: MAX_PLAYERS,
    capabilities: { rounds: false, turnTimer: true, pause: true },
  },
  create: (ctx) => new EvoceGame(ctx),
  parseAction: parseEvoceAction,
};
