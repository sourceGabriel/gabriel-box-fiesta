import type { HostGameEntry } from './types';
import { UnoHostView } from './uno/UnoHostView';
import { UnoCover } from './uno/UnoCover';

/**
 * Maps a game id (from the server's GAME_CATALOG / the started game) to its host
 * view + catalog cover. Adding a game = one import + one entry. The shell knows
 * nothing else about it.
 */
export const HOST_GAMES: Record<string, HostGameEntry> = {
  uno: { View: UnoHostView, Cover: UnoCover },
};
