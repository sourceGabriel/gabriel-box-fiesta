import type {
  CoupActionType,
  CoupCharacter,
  CoupDecision,
  CoupGameEvent,
  CoupPrivateState,
  CoupPublicState,
  CoupRevealOutcome,
  GameStatus as PlatformGameStatus,
  TurnTimer,
} from '@party/shared';
import type { GameContext, PausableGame, TurnTimedGame } from '../../core/game-plugin';
import { ActionResolver, type ResolverResult, type SideEffect } from './action-resolver';
import { parseCoupAction } from './action-schema';
import { ACTION_DEFINITIONS, CHALLENGE_TIMER_MS, FORCED_COUP_THRESHOLD, MAX_PLAYERS, MIN_PLAYERS, TURN_TIMER_MS } from './constants';
import { Game } from './game';
import type {
  ChallengeState,
  Character,
  ExchangeState,
  InfluenceLossRequest,
  PendingAction,
  PendingBlock,
} from './types';

function assertCondition(condition: unknown, code: string, message: string): asserts condition {
  if (!condition) {
    throw new Error(`${code}:${message}`);
  }
}

/**
 * Coup orchestrator — the platform `GameInstance` for classic Coup. Absorbs the
 * standalone repo's `GameEngine`: it drives the `ActionResolver`, interprets the
 * resulting `SideEffect`s, projects public/private state, and emits
 * `CoupGameEvent`s. All wall-clock timers are expressed as a single stored
 * deadline (`getTimer()` / `onTurnTimeout()`), ticked by the platform server.
 */
export class CoupGame implements PausableGame, TurnTimedGame {
  private readonly game: Game;
  private readonly resolver: ActionResolver;
  private readonly now: () => number;
  private readonly random: () => number;
  private readonly connected = new Map<string, boolean>();

  // Turn-specific state (mirrors ResolverResult).
  private pendingAction: PendingAction | null = null;
  private pendingBlock: PendingBlock | null = null;
  private challengeState: ChallengeState | null = null;
  private influenceLossRequest: InfluenceLossRequest | null = null;
  private exchangeState: ExchangeState | null = null;
  private blockPassedPlayerIds: Set<string> | null = null;
  private lastReveal: CoupRevealOutcome | null = null;

  // Single wall-clock timer, ticked by the server against `getTimer().expiresAt`.
  private timerStartedAt: number | null = null;
  private timerDurationMs: number | null = null;
  private timerExpiresAt: number | null = null;

  private paused = false;
  private pausedRemainingMs: number | null = null;

  private readonly events: CoupGameEvent[] = [];

  constructor(ctx: GameContext) {
    this.now = ctx.now;
    this.random = ctx.random;
    this.game = new Game(ctx.roomCode, ctx.random, ctx.now);
    this.resolver = new ActionResolver(CHALLENGE_TIMER_MS);
    for (const p of ctx.players) {
      this.connected.set(p.id, true);
    }
    this.pendingPlayers = ctx.players.map((p) => ({ id: p.id, name: p.name }));
  }

  private readonly pendingPlayers: Array<{ id: string; name: string }>;

  start(): void {
    assertCondition(
      this.pendingPlayers.length >= MIN_PLAYERS && this.pendingPlayers.length <= MAX_PLAYERS,
      'INVALID_PLAYER_COUNT',
      `Coup requires ${MIN_PLAYERS}-${MAX_PLAYERS} players`,
    );
    this.game.initialize(this.pendingPlayers);
    this.setTimer(TURN_TIMER_MS);
    this.emit({ type: 'game_started', startingPlayerId: this.game.currentPlayer.id });
    this.emit({ type: 'turn_started', playerId: this.game.currentPlayer.id, turn: this.game.turnNumber });
  }

  setPlayerConnected(playerId: string, connected: boolean): void {
    if (this.connected.has(playerId)) {
      this.connected.set(playerId, connected);
    }
  }

  // ─── Capability: pause ───

  isPaused(): boolean {
    return this.paused;
  }

  pause(now: number): void {
    if (this.paused || this.game.turnPhase === 'GameOver') {
      return;
    }
    this.pausedRemainingMs = this.timerExpiresAt !== null ? Math.max(0, this.timerExpiresAt - now) : null;
    this.clearTimer();
    this.paused = true;
    this.emit({ type: 'game_paused' });
  }

  resume(now: number): void {
    if (!this.paused) {
      return;
    }
    this.paused = false;
    if (this.pausedRemainingMs !== null) {
      this.timerStartedAt = now;
      this.timerDurationMs = this.pausedRemainingMs;
      this.timerExpiresAt = now + this.pausedRemainingMs;
    }
    this.pausedRemainingMs = null;
    this.emit({ type: 'game_resumed' });
  }

  // ─── Capability: turn timer ───

  getTimer(): TurnTimer | null {
    if (this.paused || this.timerExpiresAt === null || this.game.turnPhase === 'GameOver') {
      return null;
    }
    const now = this.now();
    return {
      startedAt: this.timerStartedAt ?? now,
      expiresAt: this.timerExpiresAt,
      durationMs: this.timerDurationMs ?? TURN_TIMER_MS,
      serverNow: now,
      remainingMs: Math.max(0, this.timerExpiresAt - now),
    };
  }

  onTurnTimeout(): void {
    if (this.paused) {
      return;
    }
    const phase = this.game.turnPhase;

    if (phase === 'AwaitingActionChallenge' && this.pendingAction) {
      this.applyResult(this.resolver.allPassedChallenge(this.game, this.pendingAction));
      return;
    }
    if (phase === 'AwaitingBlock' && this.pendingAction) {
      this.applyResult(this.resolver.allPassedBlock(this.game, this.pendingAction));
      return;
    }
    if (phase === 'AwaitingBlockChallenge' && this.pendingAction) {
      this.applyResult(this.resolver.allPassedBlockChallenge(this.game, this.pendingAction));
      return;
    }
    if (phase === 'AwaitingAction') {
      this.autoTurnAction();
      return;
    }
    if (phase === 'AwaitingExchange' && this.exchangeState) {
      const player = this.game.getPlayer(this.exchangeState.playerId);
      if (player) {
        const keep = Array.from({ length: player.aliveInfluenceCount }, (_, i) => i);
        this.dispatchChooseExchange(this.exchangeState.playerId, keep);
      }
      return;
    }
    if (phase === 'AwaitingInfluenceLoss' && this.influenceLossRequest) {
      const player = this.game.getPlayer(this.influenceLossRequest.playerId);
      if (player) {
        const idx = player.influences.findIndex((inf) => !inf.revealed);
        if (idx >= 0) {
          this.dispatchChooseInfluenceLoss(this.influenceLossRequest.playerId, idx);
        }
      }
    }
  }

  private autoTurnAction(): void {
    const actor = this.game.currentPlayer;
    if (!actor || !actor.isAlive) {
      return;
    }
    if (actor.coins >= FORCED_COUP_THRESHOLD) {
      const targets = this.game.getAlivePlayers().filter((p) => p.id !== actor.id);
      if (targets.length === 0) {
        return;
      }
      const target = targets[Math.floor(this.random() * targets.length)];
      const err = this.dispatchDeclare(actor.id, 'Coup', target.id);
      if (err) {
        this.dispatchDeclare(actor.id, 'Income');
      }
      return;
    }
    this.dispatchDeclare(actor.id, 'Income');
  }

  // ─── Room-facing lifecycle projection ───

  getStatus(): PlatformGameStatus {
    switch (this.game.status) {
      case 'InProgress':
        return 'active';
      case 'Finished':
        return 'complete';
      default:
        return 'setup';
    }
  }

  // ─── Action entry ───

  handleAction(playerId: string, action: unknown): void {
    assertCondition(!this.paused, 'GAME_PAUSED', 'Game is paused');
    const input = parseCoupAction(action);

    let error: string | null = null;
    switch (input.kind) {
      case 'declare_action':
        error = this.dispatchDeclare(playerId, input.action, input.targetId);
        break;
      case 'challenge':
        error = this.dispatchChallenge(playerId);
        break;
      case 'pass_challenge':
        error = this.dispatchPassChallenge(playerId);
        break;
      case 'block':
        error = this.dispatchBlock(playerId, input.character);
        break;
      case 'pass_block':
        error = this.dispatchPassBlock(playerId);
        break;
      case 'challenge_block':
        error = this.dispatchChallengeBlock(playerId);
        break;
      case 'pass_challenge_block':
        error = this.dispatchPassChallengeBlock(playerId);
        break;
      case 'lose_influence':
        error = this.dispatchChooseInfluenceLoss(playerId, input.influenceIndex);
        break;
      case 'exchange':
        error = this.dispatchChooseExchange(playerId, input.keepIndices);
        break;
      default:
        error = 'Unknown action';
    }

    if (error) {
      throw new Error(`REJECTED:${error}`);
    }
  }

  private dispatchDeclare(actorId: string, actionType: CoupActionType, targetId?: string): string | null {
    const result = this.resolver.declareAction(this.game, actorId, actionType, targetId);
    if ('error' in result) return result.error;
    const def = ACTION_DEFINITIONS[actionType];
    this.emit({
      type: 'action_declared',
      actorId,
      action: actionType,
      targetId: targetId ?? null,
      claimedCharacter: (def.claimedCharacter as CoupCharacter | null) ?? null,
    });
    this.applyResult(result);
    return null;
  }

  private dispatchChallenge(challengerId: string): string | null {
    if (!this.pendingAction || !this.challengeState) return 'No pending challenge';
    if (this.game.turnPhase !== 'AwaitingActionChallenge') return 'Not in challenge phase';
    this.emit({
      type: 'challenge_made',
      challengerId,
      challengedId: this.pendingAction.actorId,
      claimedCharacter: this.challengeState.claimedCharacter as CoupCharacter,
    });
    const result = this.resolver.challenge(this.game, challengerId, this.pendingAction, this.challengeState);
    if ('error' in result) return result.error;
    this.applyResult(result);
    return null;
  }

  private dispatchPassChallenge(playerId: string): string | null {
    if (!this.challengeState || !this.pendingAction) return 'No pending challenge';
    if (this.game.turnPhase !== 'AwaitingActionChallenge') return 'Not in challenge phase';

    const player = this.game.getPlayer(playerId);
    if (!player || !player.isAlive) return 'Invalid player';
    if (this.challengeState.passedPlayerIds.includes(playerId)) return 'Already passed';

    this.challengeState.passedPlayerIds.push(playerId);
    const allPassed = this.game.getAlivePlayers().every((p) => this.challengeState!.passedPlayerIds.includes(p.id));
    if (allPassed) {
      this.applyResult(this.resolver.allPassedChallenge(this.game, this.pendingAction));
    }
    return null;
  }

  private dispatchBlock(blockerId: string, character: CoupCharacter): string | null {
    if (!this.pendingAction) return 'No pending action';
    if (this.game.turnPhase !== 'AwaitingBlock') return 'Not in block phase';
    const result = this.resolver.block(this.game, blockerId, character as Character, this.pendingAction);
    if ('error' in result) return result.error;
    this.emit({ type: 'block_declared', blockerId, claimedCharacter: character });
    this.applyResult(result);
    return null;
  }

  private dispatchPassBlock(playerId: string): string | null {
    if (!this.pendingAction) return 'No pending action';
    if (this.game.turnPhase !== 'AwaitingBlock') return 'Not in block phase';

    const player = this.game.getPlayer(playerId);
    if (!player || !player.isAlive) return 'Invalid player';
    if (playerId === this.pendingAction.actorId) return 'Actor cannot pass on their own block phase';

    if (!this.blockPassedPlayerIds) {
      this.blockPassedPlayerIds = new Set([this.pendingAction.actorId]);
    }
    if (this.blockPassedPlayerIds.has(playerId)) return 'Already passed';
    this.blockPassedPlayerIds.add(playerId);

    const potentialBlockers =
      this.pendingAction.type === 'ForeignAid'
        ? this.game.getAlivePlayers()
            .filter((p) => p.id !== this.pendingAction!.actorId)
            .map((p) => p.id)
        : this.pendingAction.targetId
          ? [this.pendingAction.targetId]
          : [];

    const allPassed = potentialBlockers.every((id) => this.blockPassedPlayerIds!.has(id));
    if (allPassed) {
      this.applyResult(this.resolver.allPassedBlock(this.game, this.pendingAction));
    }
    return null;
  }

  private dispatchChallengeBlock(challengerId: string): string | null {
    if (!this.pendingAction || !this.pendingBlock || !this.challengeState) return 'No pending block challenge';
    if (this.game.turnPhase !== 'AwaitingBlockChallenge') return 'Not in block challenge phase';
    this.emit({
      type: 'challenge_made',
      challengerId,
      challengedId: this.pendingBlock.blockerId,
      claimedCharacter: this.pendingBlock.claimedCharacter as CoupCharacter,
    });
    const result = this.resolver.challengeBlock(
      this.game,
      challengerId,
      this.pendingAction,
      this.pendingBlock,
      this.challengeState,
    );
    if ('error' in result) return result.error;
    this.applyResult(result);
    return null;
  }

  private dispatchPassChallengeBlock(playerId: string): string | null {
    if (!this.pendingAction || !this.pendingBlock || !this.challengeState) return 'No pending block challenge';
    if (this.game.turnPhase !== 'AwaitingBlockChallenge') return 'Not in block challenge phase';
    if (this.challengeState.passedPlayerIds.includes(playerId)) return 'Already passed';

    this.challengeState.passedPlayerIds.push(playerId);
    const allPassed = this.game.getAlivePlayers().every((p) => this.challengeState!.passedPlayerIds.includes(p.id));
    if (allPassed) {
      this.emit({ type: 'block_succeeded', blockerId: this.pendingBlock.blockerId });
      this.applyResult(this.resolver.allPassedBlockChallenge(this.game, this.pendingAction));
    }
    return null;
  }

  private dispatchChooseInfluenceLoss(playerId: string, influenceIndex: number): string | null {
    if (!this.influenceLossRequest) return 'No pending influence loss';
    if (this.game.turnPhase !== 'AwaitingInfluenceLoss') return 'Not in influence loss phase';
    const result = this.resolver.chooseInfluenceLoss(
      this.game,
      playerId,
      influenceIndex,
      this.pendingAction,
      this.influenceLossRequest,
    );
    if ('error' in result) return result.error;
    this.applyResult(result);
    return null;
  }

  private dispatchChooseExchange(playerId: string, keepIndices: number[]): string | null {
    if (!this.exchangeState || !this.pendingAction) return 'No pending exchange';
    if (this.game.turnPhase !== 'AwaitingExchange') return 'Not in exchange phase';
    const result = this.resolver.chooseExchange(this.game, playerId, keepIndices, this.exchangeState, this.pendingAction);
    if ('error' in result) return result.error;
    this.emit({ type: 'exchange_completed', playerId });
    this.applyResult(result);
    return null;
  }

  // ─── Side-effect application ───

  private applyResult(result: ResolverResult): void {
    for (const effect of result.sideEffects) {
      this.applySideEffect(effect);
    }

    this.pendingAction = result.pendingAction;
    this.pendingBlock = result.pendingBlock;
    this.challengeState = result.challengeState;
    this.influenceLossRequest = result.influenceLossRequest;
    this.exchangeState = result.exchangeState;

    if (result.newPhase !== 'AwaitingBlock') {
      this.blockPassedPlayerIds = null;
    }

    if (result.newPhase === 'AwaitingBlock' && result.blockAutoPassIds?.length) {
      if (!this.blockPassedPlayerIds) {
        this.blockPassedPlayerIds = new Set([this.pendingAction!.actorId]);
      }
      for (const id of result.blockAutoPassIds) {
        this.blockPassedPlayerIds.add(id);
      }
    }

    if (result.newPhase !== 'ActionResolved') {
      this.game.turnPhase = result.newPhase;
    }

    // A player down to their last influence has no choice — resolve it for them.
    if (result.newPhase === 'AwaitingInfluenceLoss' && this.influenceLossRequest) {
      const loser = this.game.getPlayer(this.influenceLossRequest.playerId);
      if (loser && loser.aliveInfluenceCount === 1) {
        const idx = loser.influences.findIndex((inf) => !inf.revealed);
        const auto = this.resolver.chooseInfluenceLoss(
          this.game,
          loser.id,
          idx,
          this.pendingAction,
          this.influenceLossRequest,
        );
        if (!('error' in auto)) {
          this.applyResult(auto);
        }
        return;
      }
    }

    // Entering a block phase whose only blocker is already dead / already challenged → auto-pass.
    if (result.newPhase === 'AwaitingBlock' && this.pendingAction) {
      const pa = this.pendingAction;
      if (pa.targetId) {
        const target = this.game.getPlayer(pa.targetId);
        if (target && !target.isAlive) {
          this.applyResult(this.resolver.allPassedBlock(this.game, pa));
          return;
        }
        if (this.blockPassedPlayerIds?.has(pa.targetId)) {
          const def = ACTION_DEFINITIONS[pa.type];
          if (pa.type !== 'ForeignAid' && def.blockedBy.length > 0) {
            this.applyResult(this.resolver.allPassedBlock(this.game, pa));
            return;
          }
        }
      }
    }

    // Decision phases carry their own timeout window.
    if (
      result.newPhase === 'AwaitingExchange' ||
      result.newPhase === 'AwaitingInfluenceLoss'
    ) {
      this.setTimer(TURN_TIMER_MS);
    }
  }

  private applySideEffect(effect: SideEffect): void {
    switch (effect.type) {
      case 'give_coins': {
        const player = this.game.getPlayer(effect.playerId);
        if (player) {
          this.game.giveCoins(player, effect.amount);
          this.emit({ type: 'coins_changed', playerId: player.id, delta: effect.amount, total: player.coins });
        }
        break;
      }
      case 'take_coins': {
        const player = this.game.getPlayer(effect.playerId);
        if (player) {
          this.game.takeCoins(player, effect.amount);
          this.emit({ type: 'coins_changed', playerId: player.id, delta: -effect.amount, total: player.coins });
        }
        break;
      }
      case 'transfer_coins': {
        const from = this.game.getPlayer(effect.fromId);
        const to = this.game.getPlayer(effect.toId);
        if (from && to) {
          const actual = Math.min(effect.amount, from.coins);
          from.removeCoins(actual);
          to.addCoins(actual);
          this.emit({ type: 'coins_transferred', fromId: from.id, toId: to.id, amount: actual });
        }
        break;
      }
      case 'reveal_influence': {
        const player = this.game.getPlayer(effect.playerId);
        if (player) {
          const character = player.revealInfluence(effect.influenceIndex);
          if (character) {
            this.emit({ type: 'influence_revealed', playerId: player.id, character: character as CoupCharacter });
          }
        }
        break;
      }
      case 'replace_influence': {
        const player = this.game.getPlayer(effect.playerId);
        if (player) {
          this.game.deck.returnAndShuffle(effect.oldCharacter);
          player.replaceInfluence(effect.oldCharacter, effect.newCharacter);
          this.emit({ type: 'card_replaced', playerId: player.id });
        }
        break;
      }
      case 'eliminate_check': {
        const player = this.game.getPlayer(effect.playerId);
        if (player && !player.isAlive) {
          this.game.eliminatePlayer(player);
          this.emit({ type: 'player_eliminated', playerId: player.id });
        }
        break;
      }
      case 'advance_turn': {
        this.clearTimer();
        this.game.advanceTurn();
        this.lastReveal = null;
        if (this.game.turnPhase === 'AwaitingAction') {
          this.setTimer(TURN_TIMER_MS);
          this.emit({ type: 'turn_started', playerId: this.game.currentPlayer.id, turn: this.game.turnNumber });
        } else if (this.game.turnPhase === 'GameOver' && this.game.winnerId) {
          this.emit({ type: 'game_finished', winnerId: this.game.winnerId });
        }
        break;
      }
      case 'set_timer':
        this.setTimer(effect.durationMs);
        break;
      case 'clear_timer':
        this.clearTimer();
        break;
      case 'log':
        this.game.log(
          effect.message,
          effect.eventType,
          effect.character,
          effect.actorId,
          effect.actorName,
          effect.targetId,
          effect.wasBluff,
        );
        break;
      case 'start_exchange':
        this.emit({ type: 'exchange_started', playerId: effect.playerId });
        break;
      case 'win_check':
        this.game.checkWinCondition();
        break;
      case 'challenge_reveal':
        this.lastReveal = {
          challengerId: effect.challengerId,
          challengedId: effect.challengedId,
          character: effect.character as CoupCharacter,
          challengedHeldCard: effect.wasGenuine,
        };
        this.emit({
          type: 'challenge_resolved',
          challengerId: effect.challengerId,
          challengedId: effect.challengedId,
          character: effect.character as CoupCharacter,
          challengedHeldCard: effect.wasGenuine,
        });
        break;
    }
  }

  private setTimer(durationMs: number): void {
    const now = this.now();
    this.timerStartedAt = now;
    this.timerDurationMs = durationMs;
    this.timerExpiresAt = now + durationMs;
  }

  private clearTimer(): void {
    this.timerStartedAt = null;
    this.timerDurationMs = null;
    this.timerExpiresAt = null;
  }

  private emit(event: CoupGameEvent): void {
    this.events.push(event);
  }

  consumeEvents(): CoupGameEvent[] {
    const snapshot = [...this.events];
    this.events.length = 0;
    return snapshot;
  }

  // ─── State projection ───

  private projectPhase(): CoupPublicState['phase'] {
    if (this.paused) return 'paused';
    switch (this.game.turnPhase) {
      case 'AwaitingAction':
      case 'ActionResolved':
        return 'awaiting_action';
      case 'AwaitingActionChallenge':
        return 'awaiting_action_challenge';
      case 'AwaitingBlock':
        return 'awaiting_block';
      case 'AwaitingBlockChallenge':
        return 'awaiting_block_challenge';
      case 'AwaitingInfluenceLoss':
        return 'awaiting_influence_loss';
      case 'AwaitingExchange':
        return 'awaiting_exchange';
      case 'GameOver':
        return 'game_over';
      default:
        return 'awaiting_action';
    }
  }

  getPublicState(): CoupPublicState {
    const isOver = this.game.turnPhase === 'GameOver';
    return {
      phase: this.projectPhase(),
      roomCode: this.game.roomCode,
      turnNumber: this.game.turnNumber,
      currentPlayerId: isOver ? null : (this.game.currentPlayer?.id ?? null),
      players: this.game.players.map((p) => ({
        id: p.id,
        name: p.name,
        connected: this.connected.get(p.id) ?? true,
        coins: p.coins,
        influenceCount: p.influences.length,
        revealedCharacters: p.influences.filter((inf) => inf.revealed).map((inf) => inf.character as CoupCharacter),
        isAlive: p.isAlive,
        seatIndex: p.seatIndex,
      })),
      deckCount: this.game.deck.size,
      treasury: this.game.treasury,
      pendingAction: this.pendingAction
        ? {
            type: this.pendingAction.type,
            actorId: this.pendingAction.actorId,
            targetId: this.pendingAction.targetId ?? null,
            claimedCharacter: (this.pendingAction.claimedCharacter as CoupCharacter | undefined) ?? null,
          }
        : null,
      pendingBlock: this.pendingBlock
        ? { blockerId: this.pendingBlock.blockerId, claimedCharacter: this.pendingBlock.claimedCharacter as CoupCharacter }
        : null,
      challenge: this.challengeState
        ? {
            challengedPlayerId: this.challengeState.challengedPlayerId,
            claimedCharacter: this.challengeState.claimedCharacter as CoupCharacter,
            passedPlayerIds: [...this.challengeState.passedPlayerIds],
          }
        : null,
      influenceLossPlayerId: this.influenceLossRequest?.playerId ?? null,
      exchangingPlayerId: this.exchangeState?.playerId ?? null,
      timer: this.getTimer(),
      winnerId: this.game.winnerId,
      lastReveal: this.lastReveal,
    };
  }

  getPrivateState(playerId: string): CoupPrivateState {
    const player = this.game.getPlayer(playerId);
    const influences = player
      ? player.influences.map((inf) => ({ character: inf.character as CoupCharacter, revealed: inf.revealed }))
      : [];

    let pendingDecision: CoupDecision = null;
    let blockOptions: CoupCharacter[] = [];
    let exchange: CoupPrivateState['exchange'] = null;

    if (player && player.isAlive && !this.paused) {
      const phase = this.game.turnPhase;
      if (phase === 'AwaitingAction' && this.game.currentPlayer?.id === playerId) {
        pendingDecision = 'action';
      } else if (
        phase === 'AwaitingActionChallenge' &&
        this.challengeState &&
        !this.challengeState.passedPlayerIds.includes(playerId)
      ) {
        pendingDecision = 'challenge';
      } else if (phase === 'AwaitingBlock' && this.pendingAction && this.canBlock(playerId)) {
        pendingDecision = 'block';
        blockOptions = [...ACTION_DEFINITIONS[this.pendingAction.type].blockedBy] as CoupCharacter[];
      } else if (
        phase === 'AwaitingBlockChallenge' &&
        this.challengeState &&
        !this.challengeState.passedPlayerIds.includes(playerId)
      ) {
        pendingDecision = 'block_challenge';
      } else if (phase === 'AwaitingInfluenceLoss' && this.influenceLossRequest?.playerId === playerId) {
        pendingDecision = 'influence_loss';
      } else if (phase === 'AwaitingExchange' && this.exchangeState?.playerId === playerId) {
        pendingDecision = 'exchange';
      }
    }

    if (player && this.exchangeState?.playerId === playerId) {
      exchange = {
        drawnCards: [...this.exchangeState.drawnCards] as CoupCharacter[],
        keepCount: player.aliveInfluenceCount,
      };
    }

    return { playerId, influences, pendingDecision, blockOptions, exchange };
  }

  private canBlock(playerId: string): boolean {
    if (!this.pendingAction) return false;
    if (playerId === this.pendingAction.actorId) return false;
    if (this.blockPassedPlayerIds?.has(playerId)) return false;
    if (this.pendingAction.type === 'ForeignAid') {
      return true;
    }
    return playerId === this.pendingAction.targetId;
  }
}
