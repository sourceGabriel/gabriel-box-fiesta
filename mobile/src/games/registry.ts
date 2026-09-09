import type { FC } from 'react';
import type { ControllerGameView } from './types';
import { UnoControllerView } from './uno/UnoControllerView';
import { CoupControllerView } from './coup/CoupControllerView';
import { ZapControllerView } from './zap/ZapControllerView';
import { LorotaControllerView } from './lorota/LorotaControllerView';
import { SabeTudoControllerView } from './sabetudo/SabeTudoControllerView';
import { FdpControllerView } from './fdp/FdpControllerView';
import { EvoceControllerView } from './evoce/EvoceControllerView';
import { DilemaControllerView } from './dilema/DilemaControllerView';
import { HowToPlay as CoupHowToPlay } from './coup/HowToPlay';
import { HowToPlay as ZapHowToPlay } from './zap/HowToPlay';
import { HowToPlay as LorotaHowToPlay } from './lorota/HowToPlay';
import { HowToPlay as SabeTudoHowToPlay } from './sabetudo/HowToPlay';
import { HowToPlay as FdpHowToPlay } from './fdp/HowToPlay';
import { HowToPlay as EvoceHowToPlay } from './evoce/HowToPlay';
import { HowToPlay as DilemaHowToPlay } from './dilema/HowToPlay';

/**
 * Maps a game id (from GAME_CATALOG / the started game) to its phone-controller view.
 * Adding a game = one import + one entry. The shell knows nothing else about it.
 */
export const CONTROLLER_GAMES: Record<string, ControllerGameView> = {
  uno: UnoControllerView,
  coup: CoupControllerView,
  zap: ZapControllerView,
  lorota: LorotaControllerView,
  sabetudo: SabeTudoControllerView,
  fdp: FdpControllerView,
  evoce: EvoceControllerView,
  dilema: DilemaControllerView,
};

/**
 * A game's standalone "how to play" overlay (`{ onClose }`), so the shell can offer
 * it on the waiting screen — players read the rules while the host sets up. UNO has
 * no overlay. The scoped CSS ships with each controller view (all statically imported).
 */
export const CONTROLLER_HOW_TO_PLAY: Record<string, FC<{ onClose: () => void }>> = {
  coup: CoupHowToPlay,
  zap: ZapHowToPlay,
  lorota: LorotaHowToPlay,
  sabetudo: SabeTudoHowToPlay,
  fdp: FdpHowToPlay,
  evoce: EvoceHowToPlay,
  dilema: DilemaHowToPlay,
};
