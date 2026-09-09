import type { HostGameEntry } from './types';
import { UnoHostView } from './uno/UnoHostView';
import { UnoCover } from './uno/UnoCover';
import { personality as unoPersonality } from './uno/personality';
import unoLobbyBg from './uno/lobby-bg.webp';
import { CoupHostView } from './coup/CoupHostView';
import { CoupCover } from './coup/CoupCover';
import { personality as coupPersonality } from './coup/personality';
import coupLobbyBg from './coup/lobby-bg.webp';
import { ZapHostView } from './zap/ZapHostView';
import { ZapCover } from './zap/ZapCover';
import { personality as zapPersonality } from './zap/personality';
import zapLobbyBg from './zap/lobby-bg.webp';
import { LorotaHostView } from './lorota/LorotaHostView';
import { LorotaCover } from './lorota/LorotaCover';
import { personality as lorotaPersonality } from './lorota/personality';
import lorotaLobbyBg from './lorota/lobby-bg.webp';
import { SabeTudoHostView } from './sabetudo/SabeTudoHostView';
import { SabeTudoCover } from './sabetudo/SabeTudoCover';
import { personality as sabetudoPersonality } from './sabetudo/personality';
import sabetudoLobbyBg from './sabetudo/lobby-bg.webp';
import { FdpHostView } from './fdp/FdpHostView';
import { FdpCover } from './fdp/FdpCover';
import { personality as fdpPersonality } from './fdp/personality';
import fdpLobbyBg from './fdp/lobby-bg.webp';
import { EvoceHostView } from './evoce/EvoceHostView';
import { EvoceCover } from './evoce/EvoceCover';
import { personality as evocePersonality } from './evoce/personality';
import evoceLobbyBg from './evoce/lobby-bg.webp';
import { DilemaHostView } from './dilema/DilemaHostView';
import { DilemaCover } from './dilema/DilemaCover';
import { personality as dilemaPersonality } from './dilema/personality';
import dilemaLobbyBg from './dilema/lobby-bg.webp';

/**
 * Maps a game id (from the server's GAME_CATALOG / the started game) to its host
 * view + catalog cover + catalog personality. Adding a game = one import block +
 * one entry. The shell knows nothing else about it.
 */
export const HOST_GAMES: Record<string, HostGameEntry> = {
  uno: { View: UnoHostView, Cover: UnoCover, personality: unoPersonality, lobbyBg: unoLobbyBg },
  coup: { View: CoupHostView, Cover: CoupCover, personality: coupPersonality, lobbyBg: coupLobbyBg },
  zap: { View: ZapHostView, Cover: ZapCover, personality: zapPersonality, lobbyBg: zapLobbyBg },
  lorota: {
    View: LorotaHostView,
    Cover: LorotaCover,
    personality: lorotaPersonality,
    lobbyBg: lorotaLobbyBg,
  },
  sabetudo: {
    View: SabeTudoHostView,
    Cover: SabeTudoCover,
    personality: sabetudoPersonality,
    lobbyBg: sabetudoLobbyBg,
  },
  fdp: { View: FdpHostView, Cover: FdpCover, personality: fdpPersonality, lobbyBg: fdpLobbyBg },
  evoce: { View: EvoceHostView, Cover: EvoceCover, personality: evocePersonality, lobbyBg: evoceLobbyBg },
  dilema: {
    View: DilemaHostView,
    Cover: DilemaCover,
    personality: dilemaPersonality,
    lobbyBg: dilemaLobbyBg,
  },
};
