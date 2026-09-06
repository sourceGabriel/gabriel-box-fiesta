import type { HostGameView } from './types';
import { UnoHostView } from './uno/UnoHostView';

/**
 * Maps a game id (from the server's GAME_CATALOG / the started game) to its host view.
 * Adding a game = one import + one entry. The shell knows nothing else about it.
 */
export const HOST_GAMES: Record<string, HostGameView> = {
  uno: UnoHostView,
};
