import type { HostGameEntry } from './types';
import { UnoHostView } from './uno/UnoHostView';
import { UnoCover } from './uno/UnoCover';
import { CoupHostView } from './coup/CoupHostView';
import { CoupCover } from './coup/CoupCover';
import { ZapHostView } from './zap/ZapHostView';
import { ZapCover } from './zap/ZapCover';
import { LorotaHostView } from './lorota/LorotaHostView';
import { LorotaCover } from './lorota/LorotaCover';
import { SabeTudoHostView } from './sabetudo/SabeTudoHostView';
import { SabeTudoCover } from './sabetudo/SabeTudoCover';
import { FdpHostView } from './fdp/FdpHostView';
import { FdpCover } from './fdp/FdpCover';

/**
 * Maps a game id (from the server's GAME_CATALOG / the started game) to its host
 * view + catalog cover. Adding a game = one import + one entry. The shell knows
 * nothing else about it.
 */
export const HOST_GAMES: Record<string, HostGameEntry> = {
  uno: { View: UnoHostView, Cover: UnoCover },
  coup: { View: CoupHostView, Cover: CoupCover },
  zap: { View: ZapHostView, Cover: ZapCover },
  lorota: { View: LorotaHostView, Cover: LorotaCover },
  sabetudo: { View: SabeTudoHostView, Cover: SabeTudoCover },
  fdp: { View: FdpHostView, Cover: FdpCover },
};
