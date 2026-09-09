import type { GameMeta } from '@party/shared';
import type { GamePlugin } from '../core/game-plugin';
import { unoPlugin } from './uno/plugin';
import { coupPlugin } from './coup/plugin';
import { zapPlugin } from './zap/plugin';
import { lorotaPlugin } from './lorota/plugin';
import { sabeTudoPlugin } from './sabetudo/plugin';
import { fdpPlugin } from './fdp/plugin';
import { evocePlugin } from './evoce/plugin';
import { dilemaPlugin } from './dilema/plugin';

/**
 * The platform's game catalog. Adding a game = one import + one entry here.
 * Nothing in `core/` or `websocket/` references a specific game.
 */
export const GAMES: Readonly<Record<string, GamePlugin>> = {
  [unoPlugin.meta.id]: unoPlugin,
  [coupPlugin.meta.id]: coupPlugin,
  [zapPlugin.meta.id]: zapPlugin,
  [lorotaPlugin.meta.id]: lorotaPlugin,
  [sabeTudoPlugin.meta.id]: sabeTudoPlugin,
  [fdpPlugin.meta.id]: fdpPlugin,
  [evocePlugin.meta.id]: evocePlugin,
  [dilemaPlugin.meta.id]: dilemaPlugin,
};

export const DEFAULT_GAME_ID = unoPlugin.meta.id;

export const gameCatalog = (): GameMeta[] => Object.values(GAMES).map((plugin) => plugin.meta);
