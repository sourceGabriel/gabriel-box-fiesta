import {
  ACTION_DEFINITIONS,
  ACTION_DISPLAY_NAMES,
  CHALLENGE_TIMER_MS,
  EXCHANGE_DRAW_COUNT,
  FORCED_COUP_THRESHOLD,
} from './constants';
import type { Game } from './game';
import type {
  ActionType,
  ChallengeState,
  Character,
  ExchangeState,
  InfluenceLossRequest,
  LogEventType,
  PendingAction,
  PendingBlock,
  TurnPhase,
} from './types';

/**
 * Pure rule resolver for classic Coup. Ported from the standalone repo's
 * `src/engine/ActionResolver.ts` with the Reformation expansion removed
 * (no Convert / Embezzle / Examine / Inquisitor / factions).
 *
 * Each method returns a `ResolverResult` (new phase + pending state + a list of
 * side effects) or `{ error }`. The `CoupGame` orchestrator applies the effects.
 */
export type SideEffect =
  | { type: 'give_coins'; playerId: string; amount: number }
  | { type: 'take_coins'; playerId: string; amount: number }
  | { type: 'transfer_coins'; fromId: string; toId: string; amount: number }
  | { type: 'reveal_influence'; playerId: string; influenceIndex: number }
  | { type: 'replace_influence'; playerId: string; oldCharacter: Character; newCharacter: Character }
  | { type: 'eliminate_check'; playerId: string }
  | { type: 'advance_turn' }
  | { type: 'set_timer'; durationMs: number }
  | { type: 'clear_timer' }
  | {
      type: 'log';
      message: string;
      eventType: LogEventType;
      character: Character | null;
      actorId: string | null;
      actorName: string | null;
      targetId?: string | null;
      wasBluff?: boolean;
    }
  | { type: 'start_exchange'; playerId: string; drawnCards: Character[] }
  | { type: 'win_check' }
  | {
      type: 'challenge_reveal';
      challengerId: string;
      challengedId: string;
      challengerName: string;
      challengedName: string;
      character: Character;
      wasGenuine: boolean;
      replacementDrawn?: boolean;
    };

export interface ResolverResult {
  newPhase: TurnPhase;
  pendingAction: PendingAction | null;
  pendingBlock: PendingBlock | null;
  challengeState: ChallengeState | null;
  influenceLossRequest: InfluenceLossRequest | null;
  exchangeState: ExchangeState | null;
  sideEffects: SideEffect[];
  /** Players auto-passed in the block phase (a challenger cannot also block). */
  blockAutoPassIds?: string[];
}

export class ActionResolver {
  private readonly timerMs: number;

  constructor(timerMs?: number) {
    this.timerMs = timerMs ?? CHALLENGE_TIMER_MS;
  }

  declareAction(
    game: Game,
    actorId: string,
    actionType: ActionType,
    targetId?: string,
  ): ResolverResult | { error: string } {
    const actor = game.getPlayer(actorId);
    if (!actor) return { error: 'Player not found' };
    if (!actor.isAlive) return { error: 'You are eliminated' };
    if (game.currentPlayer.id !== actorId) return { error: 'Not your turn' };
    if (game.turnPhase !== 'AwaitingAction') return { error: 'Not awaiting action' };

    const def = ACTION_DEFINITIONS[actionType];
    if (!def) return { error: 'Unknown action' };

    if (actor.coins >= FORCED_COUP_THRESHOLD && actionType !== 'Coup') {
      return { error: 'You must Coup when you have 10 or more coins' };
    }

    if (actor.coins < def.cost) {
      return { error: `Not enough coins (need ${def.cost}, have ${actor.coins})` };
    }

    if (def.requiresTarget) {
      if (!targetId) return { error: 'This action requires a target' };
      const target = game.getPlayer(targetId);
      if (!target) return { error: 'Target not found' };
      if (!target.isAlive) return { error: 'Target is eliminated' };
      if (targetId === actorId) return { error: 'Cannot target yourself' };
    }

    if (actionType === 'Steal') {
      const target = game.getPlayer(targetId!);
      if (target && target.coins === 0) {
        return { error: 'Target has no coins to steal' };
      }
    }

    const claimedCharacter = def.claimedCharacter ?? undefined;

    const pendingAction: PendingAction = { type: actionType, actorId, targetId, claimedCharacter };
    const sideEffects: SideEffect[] = [];

    // Pay cost immediately (refunded if the action is successfully challenged).
    if (def.cost > 0) {
      sideEffects.push({ type: 'take_coins', playerId: actorId, amount: def.cost });
    }

    if (actionType === 'Income') {
      sideEffects.push({ type: 'give_coins', playerId: actorId, amount: 1 });
      sideEffects.push({
        type: 'log',
        message: `${actor.name} takes Income (+1 coin).`,
        eventType: 'income',
        character: null,
        actorId,
        actorName: actor.name,
      });
      sideEffects.push({ type: 'advance_turn' });
      return this.resolved(sideEffects);
    }

    if (actionType === 'Coup') {
      sideEffects.push({
        type: 'log',
        message: `${actor.name} launches a Coup against ${game.getPlayer(targetId!)?.name}.`,
        eventType: 'coup',
        character: null,
        actorId,
        actorName: actor.name,
        targetId,
      });
      return {
        newPhase: 'AwaitingInfluenceLoss',
        pendingAction,
        pendingBlock: null,
        challengeState: null,
        influenceLossRequest: { playerId: targetId!, reason: 'coup' },
        exchangeState: null,
        sideEffects,
      };
    }

    const targetName = targetId ? game.getPlayer(targetId)?.name : null;
    if (claimedCharacter) {
      const targetPart = targetName ? ` targeting ${targetName}` : '';
      sideEffects.push({
        type: 'log',
        message: `${actor.name} claims ${claimedCharacter} to ${ACTION_DISPLAY_NAMES[actionType]}${targetPart}.`,
        eventType: 'claim_action',
        character: claimedCharacter,
        actorId,
        actorName: actor.name,
        targetId: targetId || null,
        wasBluff: !actor.hasCharacter(claimedCharacter),
      });
    } else {
      sideEffects.push({
        type: 'log',
        message: `${actor.name} declares ${ACTION_DISPLAY_NAMES[actionType]}.`,
        eventType: 'declare_action',
        character: null,
        actorId,
        actorName: actor.name,
        targetId: targetId || null,
      });
    }

    if (def.challengeable) {
      sideEffects.push({ type: 'set_timer', durationMs: this.timerMs });
      return {
        newPhase: 'AwaitingActionChallenge',
        pendingAction,
        pendingBlock: null,
        challengeState: {
          challengerId: '',
          challengedPlayerId: actorId,
          claimedCharacter: claimedCharacter!,
          passedPlayerIds: [actorId],
        },
        influenceLossRequest: null,
        exchangeState: null,
        sideEffects,
      };
    }

    // Non-challengeable but blockable (Foreign Aid only).
    if (def.blockedBy.length > 0) {
      sideEffects.push({ type: 'set_timer', durationMs: this.timerMs });
      return {
        newPhase: 'AwaitingBlock',
        pendingAction,
        pendingBlock: null,
        challengeState: null,
        influenceLossRequest: null,
        exchangeState: null,
        sideEffects,
      };
    }

    return this.resolved(sideEffects);
  }

  challenge(
    game: Game,
    challengerId: string,
    pendingAction: PendingAction,
    challengeState: ChallengeState,
  ): ResolverResult | { error: string } {
    const challenger = game.getPlayer(challengerId);
    if (!challenger || !challenger.isAlive) return { error: 'Invalid challenger' };
    if (challengerId === pendingAction.actorId) return { error: 'Cannot challenge your own action' };
    if (challengeState.passedPlayerIds.includes(challengerId)) return { error: 'You already passed' };

    const challenged = game.getPlayer(pendingAction.actorId)!;
    const claimedChar = pendingAction.claimedCharacter!;
    const sideEffects: SideEffect[] = [
      { type: 'clear_timer' },
      {
        type: 'log',
        message: `${challenger.name} challenges ${challenged.name}'s claim of ${claimedChar}!`,
        eventType: 'challenge',
        character: claimedChar,
        actorId: challengerId,
        actorName: challenger.name,
      },
    ];

    if (challenged.hasCharacter(claimedChar)) {
      // Challenge FAILS — challenger loses influence.
      const isGameEnding = challenger.aliveInfluenceCount === 1 && game.getAlivePlayers().length === 2;
      sideEffects.push({
        type: 'challenge_reveal',
        challengerId: challenger.id,
        challengedId: challenged.id,
        challengerName: challenger.name,
        challengedName: challenged.name,
        character: claimedChar,
        wasGenuine: true,
        replacementDrawn: !isGameEnding,
      });
      sideEffects.push({
        type: 'log',
        message: `${challenged.name} reveals ${claimedChar} — challenge fails! ${challenger.name} must lose an influence.`,
        eventType: 'challenge_fail',
        character: claimedChar,
        actorId: challenged.id,
        actorName: challenged.name,
      });

      if (!isGameEnding) {
        const newCard = game.deck.draw();
        if (newCard) {
          sideEffects.push({
            type: 'replace_influence',
            playerId: challenged.id,
            oldCharacter: claimedChar,
            newCharacter: newCard,
          });
        }
      }

      if (challenger.aliveInfluenceCount === 1) {
        const idx = challenger.influences.findIndex((inf) => !inf.revealed);
        sideEffects.push({ type: 'reveal_influence', playerId: challengerId, influenceIndex: idx });
        sideEffects.push({ type: 'eliminate_check', playerId: challengerId });

        if (isGameEnding) {
          sideEffects.push({ type: 'win_check' });
          sideEffects.push({ type: 'advance_turn' });
          return this.resolved(sideEffects);
        }

        return this.afterSuccessfulActionChallengeDefense(pendingAction, sideEffects, challengerId, game);
      }

      return {
        newPhase: 'AwaitingInfluenceLoss',
        pendingAction,
        pendingBlock: null,
        challengeState: { ...challengeState, challengerId },
        influenceLossRequest: { playerId: challengerId, reason: 'challenge_lost' },
        exchangeState: null,
        sideEffects,
      };
    }

    // Challenge SUCCEEDS — challenged player loses influence, action cancelled.
    sideEffects.push({
      type: 'challenge_reveal',
      challengerId: challenger.id,
      challengedId: challenged.id,
      challengerName: challenger.name,
      challengedName: challenged.name,
      character: claimedChar,
      wasGenuine: false,
      replacementDrawn: false,
    });
    sideEffects.push({
      type: 'log',
      message: `${challenged.name} does NOT have ${claimedChar} — challenge succeeds!`,
      eventType: 'challenge_success',
      character: claimedChar,
      actorId: challengerId,
      actorName: challenger.name,
      targetId: challenged.id,
    });

    // Refund the action cost — a successfully challenged action returns its cost.
    const def = ACTION_DEFINITIONS[pendingAction.type];
    if (def.cost > 0) {
      sideEffects.push({ type: 'give_coins', playerId: pendingAction.actorId, amount: def.cost });
    }

    if (challenged.aliveInfluenceCount === 1) {
      const idx = challenged.influences.findIndex((inf) => !inf.revealed);
      sideEffects.push({ type: 'reveal_influence', playerId: challenged.id, influenceIndex: idx });
      sideEffects.push({ type: 'eliminate_check', playerId: challenged.id });
      sideEffects.push({ type: 'win_check' });
      sideEffects.push({ type: 'advance_turn' });
      return this.resolved(sideEffects);
    }

    return {
      newPhase: 'AwaitingInfluenceLoss',
      pendingAction: null,
      pendingBlock: null,
      challengeState: { ...challengeState, challengerId },
      influenceLossRequest: { playerId: challenged.id, reason: 'challenge_failed_defense' },
      exchangeState: null,
      sideEffects,
    };
  }

  /**
   * After a challenge on the action fails (defender proved the card), the action
   * proceeds. The challenger cannot also block (challenge OR block, not both).
   */
  private afterSuccessfulActionChallengeDefense(
    pendingAction: PendingAction,
    sideEffects: SideEffect[],
    challengerId: string,
    game: Game,
  ): ResolverResult {
    const def = ACTION_DEFINITIONS[pendingAction.type];

    if (def.blockedBy.length > 0) {
      sideEffects.push({ type: 'set_timer', durationMs: this.timerMs });
      return {
        newPhase: 'AwaitingBlock',
        pendingAction,
        pendingBlock: null,
        challengeState: null,
        influenceLossRequest: null,
        exchangeState: null,
        sideEffects,
        blockAutoPassIds: [challengerId],
      };
    }

    return this.resolveAction(game, pendingAction, sideEffects);
  }

  allPassedChallenge(game: Game, pendingAction: PendingAction): ResolverResult {
    const def = ACTION_DEFINITIONS[pendingAction.type];
    const sideEffects: SideEffect[] = [{ type: 'clear_timer' }];

    if (def.blockedBy.length > 0) {
      sideEffects.push({ type: 'set_timer', durationMs: this.timerMs });
      return {
        newPhase: 'AwaitingBlock',
        pendingAction,
        pendingBlock: null,
        challengeState: null,
        influenceLossRequest: null,
        exchangeState: null,
        sideEffects,
      };
    }

    return this.resolveAction(game, pendingAction, sideEffects);
  }

  block(
    game: Game,
    blockerId: string,
    claimedCharacter: Character,
    pendingAction: PendingAction,
  ): ResolverResult | { error: string } {
    const blocker = game.getPlayer(blockerId);
    if (!blocker || !blocker.isAlive) return { error: 'Invalid blocker' };
    if (blockerId === pendingAction.actorId) return { error: 'Cannot block your own action' };

    const def = ACTION_DEFINITIONS[pendingAction.type];
    if (!def.blockedBy.includes(claimedCharacter)) {
      return { error: `${claimedCharacter} cannot block ${pendingAction.type}` };
    }

    if (pendingAction.type === 'Assassinate' && blockerId !== pendingAction.targetId) {
      return { error: 'Only the target can block an assassination' };
    }
    if (pendingAction.type === 'Steal' && blockerId !== pendingAction.targetId) {
      return { error: 'Only the target can block a steal' };
    }

    const sideEffects: SideEffect[] = [
      { type: 'clear_timer' },
      {
        type: 'log',
        message: `${blocker.name} blocks with ${claimedCharacter}!`,
        eventType: 'block',
        character: claimedCharacter,
        actorId: blockerId,
        actorName: blocker.name,
        wasBluff: !blocker.hasCharacter(claimedCharacter),
      },
      { type: 'set_timer', durationMs: this.timerMs },
    ];

    const pendingBlock: PendingBlock = { blockerId, claimedCharacter };

    // Only the blocker cannot challenge their own block.
    const passedPlayerIds = game
      .getAlivePlayers()
      .filter((p) => p.id === blockerId)
      .map((p) => p.id);

    return {
      newPhase: 'AwaitingBlockChallenge',
      pendingAction,
      pendingBlock,
      challengeState: {
        challengerId: '',
        challengedPlayerId: blockerId,
        claimedCharacter,
        passedPlayerIds,
      },
      influenceLossRequest: null,
      exchangeState: null,
      sideEffects,
    };
  }

  allPassedBlock(game: Game, pendingAction: PendingAction): ResolverResult {
    const sideEffects: SideEffect[] = [{ type: 'clear_timer' }];
    return this.resolveAction(game, pendingAction, sideEffects);
  }

  challengeBlock(
    game: Game,
    challengerId: string,
    pendingAction: PendingAction,
    pendingBlock: PendingBlock,
    challengeState: ChallengeState,
  ): ResolverResult | { error: string } {
    const challenger = game.getPlayer(challengerId);
    if (!challenger || !challenger.isAlive) return { error: 'Invalid challenger' };
    if (challengerId === pendingBlock.blockerId) return { error: 'Cannot challenge your own block' };

    const blocker = game.getPlayer(pendingBlock.blockerId)!;
    const claimedChar = pendingBlock.claimedCharacter;
    const sideEffects: SideEffect[] = [
      { type: 'clear_timer' },
      {
        type: 'log',
        message: `${challenger.name} challenges ${blocker.name}'s block with ${claimedChar}!`,
        eventType: 'block_challenge',
        character: claimedChar,
        actorId: challengerId,
        actorName: challenger.name,
      },
    ];

    if (blocker.hasCharacter(claimedChar)) {
      // Block challenge FAILS — blocker proves the card, action stays blocked, challenger loses influence.
      const isGameEnding = challenger.aliveInfluenceCount === 1 && game.getAlivePlayers().length === 2;
      sideEffects.push({
        type: 'challenge_reveal',
        challengerId: challenger.id,
        challengedId: blocker.id,
        challengerName: challenger.name,
        challengedName: blocker.name,
        character: claimedChar,
        wasGenuine: true,
        replacementDrawn: !isGameEnding,
      });
      sideEffects.push({
        type: 'log',
        message: `${blocker.name} reveals ${claimedChar} — block stands! ${challenger.name} must lose an influence.`,
        eventType: 'block_challenge_fail',
        character: claimedChar,
        actorId: blocker.id,
        actorName: blocker.name,
      });

      if (!isGameEnding) {
        const newCard = game.deck.draw();
        if (newCard) {
          sideEffects.push({
            type: 'replace_influence',
            playerId: blocker.id,
            oldCharacter: claimedChar,
            newCharacter: newCard,
          });
        }
      }

      if (challenger.aliveInfluenceCount === 1) {
        const idx = challenger.influences.findIndex((inf) => !inf.revealed);
        sideEffects.push({ type: 'reveal_influence', playerId: challengerId, influenceIndex: idx });
        sideEffects.push({ type: 'eliminate_check', playerId: challengerId });
        sideEffects.push({ type: 'win_check' });
        sideEffects.push({ type: 'advance_turn' });
        return this.resolved(sideEffects);
      }

      return {
        newPhase: 'AwaitingInfluenceLoss',
        pendingAction: null,
        pendingBlock,
        challengeState: { ...challengeState, challengerId },
        influenceLossRequest: { playerId: challengerId, reason: 'challenge_lost' },
        exchangeState: null,
        sideEffects,
      };
    }

    // Block challenge SUCCEEDS — blocker lied, action proceeds.
    sideEffects.push({
      type: 'challenge_reveal',
      challengerId: challenger.id,
      challengedId: blocker.id,
      challengerName: challenger.name,
      challengedName: blocker.name,
      character: claimedChar,
      wasGenuine: false,
      replacementDrawn: false,
    });
    sideEffects.push({
      type: 'log',
      message: `${blocker.name} does NOT have ${claimedChar} — block fails! Action proceeds.`,
      eventType: 'block_challenge_success',
      character: claimedChar,
      actorId: challengerId,
      actorName: challenger.name,
      targetId: blocker.id,
    });

    if (blocker.aliveInfluenceCount === 1) {
      const idx = blocker.influences.findIndex((inf) => !inf.revealed);
      sideEffects.push({ type: 'reveal_influence', playerId: blocker.id, influenceIndex: idx });
      sideEffects.push({ type: 'eliminate_check', playerId: blocker.id });
      return this.resolveAction(game, pendingAction, sideEffects);
    }

    return {
      newPhase: 'AwaitingInfluenceLoss',
      pendingAction,
      pendingBlock: null,
      challengeState: { ...challengeState, challengerId },
      influenceLossRequest: { playerId: blocker.id, reason: 'challenge_failed_defense' },
      exchangeState: null,
      sideEffects,
    };
  }

  allPassedBlockChallenge(_game: Game, _pendingAction: PendingAction): ResolverResult {
    const sideEffects: SideEffect[] = [
      { type: 'clear_timer' },
      {
        type: 'log',
        message: 'Block is not challenged — action is blocked.',
        eventType: 'block_unchallenged',
        character: null,
        actorId: null,
        actorName: null,
      },
      { type: 'advance_turn' },
    ];
    return this.resolved(sideEffects);
  }

  chooseInfluenceLoss(
    game: Game,
    playerId: string,
    influenceIndex: number,
    pendingAction: PendingAction | null,
    influenceLossRequest: InfluenceLossRequest,
  ): ResolverResult | { error: string } {
    const player = game.getPlayer(playerId);
    if (!player) return { error: 'Player not found' };
    if (influenceLossRequest.playerId !== playerId) return { error: 'Not your turn to lose influence' };

    if (influenceIndex < 0 || influenceIndex >= player.influences.length) {
      return { error: 'Invalid influence index' };
    }
    if (player.influences[influenceIndex].revealed) {
      return { error: 'That influence is already revealed' };
    }

    const revealedChar = player.influences[influenceIndex].character;
    const sideEffects: SideEffect[] = [
      { type: 'reveal_influence', playerId, influenceIndex },
      {
        type: 'log',
        message: `${player.name} loses ${revealedChar}.`,
        eventType: 'influence_loss',
        character: revealedChar,
        actorId: playerId,
        actorName: player.name,
      },
      { type: 'eliminate_check', playerId },
      { type: 'clear_timer' },
    ];

    const { reason } = influenceLossRequest;

    if (reason === 'coup') {
      sideEffects.push({ type: 'win_check' });
      sideEffects.push({ type: 'advance_turn' });
      return this.resolved(sideEffects);
    }

    if (reason === 'challenge_failed_defense') {
      if (pendingAction) {
        return this.resolveAction(game, pendingAction, sideEffects);
      }
      sideEffects.push({ type: 'win_check' });
      sideEffects.push({ type: 'advance_turn' });
      return this.resolved(sideEffects);
    }

    if (reason === 'challenge_lost') {
      if (pendingAction) {
        const def = ACTION_DEFINITIONS[pendingAction.type];
        if (def.blockedBy.length > 0) {
          const targetAlive = pendingAction.targetId
            ? (game.getPlayer(pendingAction.targetId)?.isAlive ?? false)
            : true;
          const challengerIsTarget = pendingAction.targetId === playerId;
          if (targetAlive && !challengerIsTarget) {
            sideEffects.push({ type: 'set_timer', durationMs: this.timerMs });
            return {
              newPhase: 'AwaitingBlock',
              pendingAction,
              pendingBlock: null,
              challengeState: null,
              influenceLossRequest: null,
              exchangeState: null,
              sideEffects,
              blockAutoPassIds: [playerId],
            };
          }
          if (challengerIsTarget) {
            return this.resolveAction(game, pendingAction, sideEffects);
          }
        }
        return this.resolveAction(game, pendingAction, sideEffects);
      }
      sideEffects.push({ type: 'advance_turn' });
      return this.resolved(sideEffects);
    }

    if (reason === 'assassination') {
      sideEffects.push({ type: 'win_check' });
      sideEffects.push({ type: 'advance_turn' });
      return this.resolved(sideEffects);
    }

    sideEffects.push({ type: 'win_check' });
    sideEffects.push({ type: 'advance_turn' });
    return this.resolved(sideEffects);
  }

  chooseExchange(
    game: Game,
    playerId: string,
    keepIndices: number[],
    exchangeState: ExchangeState,
    _pendingAction: PendingAction,
  ): ResolverResult | { error: string } {
    const player = game.getPlayer(playerId);
    if (!player) return { error: 'Player not found' };
    if (exchangeState.playerId !== playerId) return { error: 'Not your exchange' };

    const allCards = [...player.hiddenCharacters, ...exchangeState.drawnCards];
    const expectedKeep = player.aliveInfluenceCount;

    if (keepIndices.length !== expectedKeep) {
      return { error: `Must keep exactly ${expectedKeep} card(s)` };
    }
    for (const idx of keepIndices) {
      if (idx < 0 || idx >= allCards.length) {
        return { error: 'Invalid card index' };
      }
    }
    if (new Set(keepIndices).size !== keepIndices.length) {
      return { error: 'Duplicate card indices' };
    }

    const keptCards = keepIndices.map((i) => allCards[i]);
    const returnedCards = allCards.filter((_, i) => !keepIndices.includes(i));

    const sideEffects: SideEffect[] = [
      {
        type: 'log',
        message: `${player.name} completes the exchange.`,
        eventType: 'exchange',
        character: 'Ambassador',
        actorId: playerId,
        actorName: player.name,
      },
    ];

    for (const card of returnedCards) {
      game.deck.returnCard(card);
    }
    game.deck.shuffle();

    let keptIndex = 0;
    for (let i = 0; i < player.influences.length; i += 1) {
      if (!player.influences[i].revealed) {
        player.influences[i].character = keptCards[keptIndex];
        keptIndex += 1;
      }
    }

    sideEffects.push({ type: 'advance_turn' });
    return this.resolved(sideEffects);
  }

  private resolveAction(game: Game, pendingAction: PendingAction, existingEffects: SideEffect[]): ResolverResult {
    const sideEffects = [...existingEffects];
    const actor = game.getPlayer(pendingAction.actorId)!;

    switch (pendingAction.type) {
      case 'Tax':
        sideEffects.push({ type: 'give_coins', playerId: actor.id, amount: 3 });
        sideEffects.push({
          type: 'log',
          message: `${actor.name} collects Tax (+3 coins).`,
          eventType: 'action_resolve',
          character: 'Duke',
          actorId: actor.id,
          actorName: actor.name,
        });
        sideEffects.push({ type: 'advance_turn' });
        return this.resolved(sideEffects);

      case 'ForeignAid':
        sideEffects.push({ type: 'give_coins', playerId: actor.id, amount: 2 });
        sideEffects.push({
          type: 'log',
          message: `${actor.name} takes Foreign Aid (+2 coins).`,
          eventType: 'action_resolve',
          character: null,
          actorId: actor.id,
          actorName: actor.name,
        });
        sideEffects.push({ type: 'advance_turn' });
        return this.resolved(sideEffects);

      case 'Steal': {
        const target = game.getPlayer(pendingAction.targetId!)!;
        const stealAmount = Math.min(2, target.coins);
        sideEffects.push({ type: 'transfer_coins', fromId: target.id, toId: actor.id, amount: stealAmount });
        sideEffects.push({
          type: 'log',
          message: `${actor.name} steals ${stealAmount} coin(s) from ${target.name}.`,
          eventType: 'action_resolve',
          character: 'Captain',
          actorId: actor.id,
          actorName: actor.name,
          targetId: target.id,
        });
        sideEffects.push({ type: 'advance_turn' });
        return this.resolved(sideEffects);
      }

      case 'Assassinate': {
        const target = game.getPlayer(pendingAction.targetId!)!;
        if (!target.isAlive) {
          sideEffects.push({ type: 'advance_turn' });
          return this.resolved(sideEffects);
        }

        if (target.aliveInfluenceCount === 1) {
          const idx = target.influences.findIndex((inf) => !inf.revealed);
          sideEffects.push({ type: 'reveal_influence', playerId: target.id, influenceIndex: idx });
          sideEffects.push({
            type: 'log',
            message: `${target.name} loses an influence to assassination.`,
            eventType: 'assassination',
            character: 'Assassin',
            actorId: actor.id,
            actorName: actor.name,
            targetId: target.id,
          });
          sideEffects.push({ type: 'eliminate_check', playerId: target.id });
          sideEffects.push({ type: 'win_check' });
          sideEffects.push({ type: 'advance_turn' });
          return this.resolved(sideEffects);
        }

        sideEffects.push({
          type: 'log',
          message: `${target.name} must lose an influence to assassination.`,
          eventType: 'assassination',
          character: 'Assassin',
          actorId: actor.id,
          actorName: actor.name,
          targetId: target.id,
        });
        return {
          newPhase: 'AwaitingInfluenceLoss',
          pendingAction,
          pendingBlock: null,
          challengeState: null,
          influenceLossRequest: { playerId: target.id, reason: 'assassination' },
          exchangeState: null,
          sideEffects,
        };
      }

      case 'Exchange': {
        const drawnCards = game.deck.drawMultiple(EXCHANGE_DRAW_COUNT);
        if (drawnCards.length === 0) {
          sideEffects.push({
            type: 'log',
            message: `${actor.name} exchanges but the deck is empty.`,
            eventType: 'exchange',
            character: 'Ambassador',
            actorId: actor.id,
            actorName: actor.name,
          });
          sideEffects.push({ type: 'advance_turn' });
          return this.resolved(sideEffects);
        }
        sideEffects.push({ type: 'start_exchange', playerId: actor.id, drawnCards });
        return {
          newPhase: 'AwaitingExchange',
          pendingAction,
          pendingBlock: null,
          challengeState: null,
          influenceLossRequest: null,
          exchangeState: { playerId: actor.id, drawnCards },
          sideEffects,
        };
      }

      default:
        sideEffects.push({ type: 'advance_turn' });
        return this.resolved(sideEffects);
    }
  }

  private resolved(sideEffects: SideEffect[]): ResolverResult {
    return {
      newPhase: 'ActionResolved',
      pendingAction: null,
      pendingBlock: null,
      challengeState: null,
      influenceLossRequest: null,
      exchangeState: null,
      sideEffects,
    };
  }
}
