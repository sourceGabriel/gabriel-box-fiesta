import type { PlayerId } from '../../models/common';
import type { CoupActionType, CoupCharacter } from '../../models/coup';

/**
 * Domain events the Coup engine emits. They travel on the wire opaquely inside
 * `GAME_EVENT { gameId, event: unknown }`; only the Coup host/controller views
 * (and the Coup engine) know this shape. Mirrors `UnoGameEvent`.
 */
export type CoupGameEvent =
  | { type: 'game_started'; startingPlayerId: PlayerId }
  | { type: 'game_paused' }
  | { type: 'game_resumed' }
  | { type: 'turn_started'; playerId: PlayerId; turn: number }
  | {
      type: 'action_declared';
      actorId: PlayerId;
      action: CoupActionType;
      targetId: PlayerId | null;
      claimedCharacter: CoupCharacter | null;
    }
  | { type: 'action_resolved'; actorId: PlayerId; action: CoupActionType; targetId: PlayerId | null }
  | { type: 'action_cancelled'; actorId: PlayerId; action: CoupActionType }
  | { type: 'coins_changed'; playerId: PlayerId; delta: number; total: number }
  | { type: 'coins_transferred'; fromId: PlayerId; toId: PlayerId; amount: number }
  | { type: 'block_declared'; blockerId: PlayerId; claimedCharacter: CoupCharacter }
  | { type: 'block_succeeded'; blockerId: PlayerId }
  | { type: 'challenge_made'; challengerId: PlayerId; challengedId: PlayerId; claimedCharacter: CoupCharacter }
  | {
      type: 'challenge_resolved';
      challengerId: PlayerId;
      challengedId: PlayerId;
      character: CoupCharacter;
      /** `true` = the challenged player held the card (challenge failed, challenger loses influence). */
      challengedHeldCard: boolean;
    }
  | { type: 'card_replaced'; playerId: PlayerId }
  | { type: 'influence_revealed'; playerId: PlayerId; character: CoupCharacter }
  | { type: 'player_eliminated'; playerId: PlayerId }
  | { type: 'exchange_started'; playerId: PlayerId }
  | { type: 'exchange_completed'; playerId: PlayerId }
  | { type: 'game_finished'; winnerId: PlayerId };
