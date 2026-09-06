import type { ControllerGameView } from './types';
import { UnoControllerView } from './uno/UnoControllerView';
import { CoupControllerView } from './coup/CoupControllerView';

/**
 * Maps a game id (from GAME_CATALOG / the started game) to its phone-controller view.
 * Adding a game = one import + one entry. The shell knows nothing else about it.
 */
export const CONTROLLER_GAMES: Record<string, ControllerGameView> = {
  uno: UnoControllerView,
  coup: CoupControllerView,
};
