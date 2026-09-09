import type { PlayerId } from '../../models/common';
import type { DilemaCardType, DilemaStanding, DilemaTrack } from '../../models/dilema';

/**
 * Domain events the Dilema nos Trilhos engine emits. They travel opaquely inside
 * `GAME_EVENT { gameId, event: unknown }`; only the Dilema host/controller views
 * (and the engine) know this shape. Mirrors `FdpGameEvent` / `LorotaGameEvent`.
 *
 * Events never carry card text — that stays in the projected public state so the
 * "what is on the TV" rules live in one place.
 */
export type DilemaGameEvent =
  | { type: 'game_started'; totalRounds: number }
  | { type: 'game_paused' }
  | { type: 'game_resumed' }
  | { type: 'round_started'; round: number; totalRounds: number; conductorId: PlayerId }
  | {
      type: 'assignments_made';
      round: number;
      conductorId: PlayerId;
      leftIds: PlayerId[];
      rightIds: PlayerId[];
    }
  | { type: 'playing_started'; round: number; durationMs: number }
  | { type: 'card_played'; playerId: PlayerId; cardType: DilemaCardType; track: DilemaTrack }
  | { type: 'player_passed'; playerId: PlayerId }
  | { type: 'all_cards_in'; round: number }
  | { type: 'verdict_started'; round: number; conductorId: PlayerId; durationMs: number }
  | {
      type: 'verdict_cast';
      round: number;
      conductorId: PlayerId;
      killedTrack: DilemaTrack;
      auto: boolean;
    }
  | {
      type: 'round_finished';
      round: number;
      killedTrack: DilemaTrack;
      sparedTrack: DilemaTrack;
      standings: DilemaStanding[];
    }
  | { type: 'game_finished'; winnerId: PlayerId; standings: DilemaStanding[] };
