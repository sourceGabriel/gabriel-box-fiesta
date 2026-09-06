import type { CoupActionType, CoupCharacter } from '@party/shared';

/**
 * Internal engine types for Coup (classic ruleset). Ported from the standalone
 * repo's `src/shared/types.ts`, trimmed to the classic game (no Reformation:
 * factions / Convert / Embezzle / Examine / Inquisitor are out of v1).
 *
 * Character / action string values match `@party/shared`'s wire unions verbatim,
 * so `getPublicState` is a straight pass-through.
 */

export type Character = CoupCharacter;
export type ActionType = CoupActionType;

export const CHARACTERS: readonly Character[] = ['Duke', 'Assassin', 'Captain', 'Ambassador', 'Contessa'];

export type TurnPhase =
  | 'AwaitingAction'
  | 'AwaitingActionChallenge'
  | 'AwaitingBlock'
  | 'AwaitingBlockChallenge'
  | 'AwaitingInfluenceLoss'
  | 'AwaitingExchange'
  | 'ActionResolved'
  | 'GameOver';

export type GameStatus = 'Lobby' | 'InProgress' | 'Finished';

export interface Influence {
  character: Character;
  revealed: boolean;
}

export interface PendingAction {
  type: ActionType;
  actorId: string;
  targetId?: string;
  /** Character claimed for this action (e.g. Duke for Tax). */
  claimedCharacter?: Character;
}

export interface PendingBlock {
  blockerId: string;
  claimedCharacter: Character;
}

export interface ChallengeState {
  challengerId: string;
  challengedPlayerId: string;
  claimedCharacter: Character;
  /** Players who have passed on challenging during the current window. */
  passedPlayerIds: string[];
}

export interface InfluenceLossRequest {
  playerId: string;
  reason: 'challenge_lost' | 'assassination' | 'coup' | 'challenge_failed_defense';
}

export interface ExchangeState {
  playerId: string;
  drawnCards: Character[];
}

export type LogEventType =
  | 'game_start'
  | 'turn_start'
  | 'income'
  | 'coup'
  | 'claim_action'
  | 'declare_action'
  | 'challenge'
  | 'challenge_fail'
  | 'challenge_success'
  | 'block'
  | 'block_challenge'
  | 'block_challenge_fail'
  | 'block_challenge_success'
  | 'block_unchallenged'
  | 'influence_loss'
  | 'exchange'
  | 'exchange_draw'
  | 'action_resolve'
  | 'assassination'
  | 'elimination'
  | 'win';

export interface LogEntry {
  message: string;
  timestamp: number;
  eventType: LogEventType;
  character: Character | null;
  turnNumber: number;
  actorId: string | null;
  actorName: string | null;
  targetId?: string | null;
  wasBluff?: boolean;
}
