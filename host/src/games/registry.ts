import type { HostGameEntry } from './types';
import { UnoHostView } from './uno/UnoHostView';
import { UnoCover } from './uno/UnoCover';
import { personality as unoPersonality } from './uno/personality';
import { CoupHostView } from './coup/CoupHostView';
import { CoupCover } from './coup/CoupCover';
import { personality as coupPersonality } from './coup/personality';
import { ZapHostView } from './zap/ZapHostView';
import { ZapCover } from './zap/ZapCover';
import { personality as zapPersonality } from './zap/personality';
import { LorotaHostView } from './lorota/LorotaHostView';
import { LorotaCover } from './lorota/LorotaCover';
import { personality as lorotaPersonality } from './lorota/personality';
import { SabeTudoHostView } from './sabetudo/SabeTudoHostView';
import { SabeTudoCover } from './sabetudo/SabeTudoCover';
import { personality as sabetudoPersonality } from './sabetudo/personality';
import { FdpHostView } from './fdp/FdpHostView';
import { FdpCover } from './fdp/FdpCover';
import { personality as fdpPersonality } from './fdp/personality';
import { EvoceHostView } from './evoce/EvoceHostView';
import { EvoceCover } from './evoce/EvoceCover';
import { personality as evocePersonality } from './evoce/personality';

/**
 * Maps a game id (from the server's GAME_CATALOG / the started game) to its host
 * view + catalog cover + catalog personality. Adding a game = one import block +
 * one entry. The shell knows nothing else about it.
 */
export const HOST_GAMES: Record<string, HostGameEntry> = {
  uno: { View: UnoHostView, Cover: UnoCover, personality: unoPersonality },
  coup: { View: CoupHostView, Cover: CoupCover, personality: coupPersonality },
  zap: { View: ZapHostView, Cover: ZapCover, personality: zapPersonality },
  lorota: { View: LorotaHostView, Cover: LorotaCover, personality: lorotaPersonality },
  sabetudo: { View: SabeTudoHostView, Cover: SabeTudoCover, personality: sabetudoPersonality },
  fdp: { View: FdpHostView, Cover: FdpCover, personality: fdpPersonality },
  evoce: { View: EvoceHostView, Cover: EvoceCover, personality: evocePersonality },
};
