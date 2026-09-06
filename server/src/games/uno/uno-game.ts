import type { Game } from '../../core/game';
import type { GameEvent, UnoCard, UnoFullState, UnoPrivatePlayerState, UnoPublicState } from '@party/shared';
import { createDeck, shuffle } from './cards';
import { isCardPlayable } from './rules';
import type { UnoAction } from './types';

const TURN_DURATION_MS = 30_000;
const DEFAULT_TARGET_SCORE = 500;

const createTimer = (now: number, durationMs = TURN_DURATION_MS) => ({
  startedAt: now,
  expiresAt: now + durationMs,
  durationMs,
  serverNow: now,
  remainingMs: durationMs,
});

function assertCondition(condition: unknown, code: string, message: string): asserts condition {
  if (!condition) {
    throw new Error(`${code}:${message}`);
  }
}

export class UnoGame implements Game<UnoFullState, UnoAction, GameEvent, UnoPublicState, UnoPrivatePlayerState> {
  private readonly events: GameEvent[] = [];

  private state: UnoFullState;

  private paused = false;

  private pausedRemainingMs: number | null = null;

  constructor(
    private readonly players: { id: string; name: string }[],
    private readonly roomCode: string,
    private readonly nowProvider: () => number = Date.now,
    private readonly targetScore: number = DEFAULT_TARGET_SCORE,
  ) {
    const playersOrder = players.map((player) => player.id);
    const playerBase = Object.fromEntries(players.map((player) => [
      player.id,
      { id: player.id, name: player.name, connected: true, handCount: 0, calledUno: false, score: 0 },
    ]));
    const hands = Object.fromEntries(players.map((player) => [player.id, [] as UnoCard[]]));
    const unoWindow = Object.fromEntries(players.map((player) => [player.id, null as number | null]));

    this.state = {
      phase: 'ready',
      roomCode,
      playersOrder,
      players: playerBase,
      hands,
      drawPile: [],
      discardPile: [],
      currentPlayerId: playersOrder[0] ?? null,
      direction: 1,
      currentColor: null,
      pendingDraw: 0,
      pendingDrawType: null,
      pendingColorChoiceBy: null,
      turn: 0,
      round: 0,
      timer: null,
      winnerPlayerId: null,
      gameWinnerPlayerId: null,
      targetScore: this.targetScore,
      unoWindow,
    };
  }

  start(): void {
    assertCondition(this.players.length >= 2 && this.players.length <= 8, 'INVALID_PLAYER_COUNT', 'UNO requires 2-8 players');

    for (const playerId of this.state.playersOrder) {
      this.state.players[playerId].score = 0;
    }
    this.state.round = 0;
    this.state.gameWinnerPlayerId = null;

    this.events.push({ type: 'game_started' });
    this.dealRound(this.state.playersOrder[0] ?? null);
  }

  /** Deals a fresh round while keeping accumulated scores. Valid only after a round finished. */
  startNextRound(): void {
    assertCondition(this.state.phase === 'round_finished', 'INVALID_PHASE', 'A round must be finished before starting the next');
    this.dealRound(this.state.winnerPlayerId ?? this.state.playersOrder[0] ?? null);
  }

  private dealRound(startingPlayerId: string | null): void {
    const starter = startingPlayerId ?? this.state.playersOrder[0]!;
    const deck = shuffle(createDeck());
    this.state.round += 1;
    this.state.winnerPlayerId = null;
    this.state.pendingDraw = 0;
    this.state.pendingDrawType = null;
    this.state.pendingColorChoiceBy = null;
    this.state.turn = 1;
    this.state.direction = 1;
    this.state.phase = 'round_active';

    for (const playerId of this.state.playersOrder) {
      this.state.hands[playerId] = deck.splice(0, 7);
      this.state.players[playerId].handCount = this.state.hands[playerId].length;
      this.state.players[playerId].calledUno = false;
      this.state.unoWindow[playerId] = null;
    }

    let top = deck.shift()!;
    while (top.type === 'wild_draw_four') {
      deck.push(top);
      top = deck.shift()!;
    }

    this.state.discardPile = [top];
    this.state.currentColor = top.color === 'wild' ? 'red' : top.color;
    this.state.drawPile = deck;
    this.state.currentPlayerId = starter;
    this.state.timer = null;

    this.events.push({ type: 'round_started', round: this.state.round, startingPlayerId: starter });
    this.events.push({ type: 'turn_started', playerId: starter, turn: this.state.turn });
    this.startTurnTimer(this.nowProvider());
  }

  setPlayerConnected(playerId: string, connected: boolean): void {
    const player = this.state.players[playerId];
    if (player) {
      player.connected = connected;
    }
  }

  isPaused(): boolean {
    return this.paused;
  }

  /** Freeze the current turn timer. No-op unless a round is in progress. */
  pause(now: number): GameEvent[] {
    if (this.paused || (this.state.phase !== 'round_active' && this.state.phase !== 'awaiting_color_choice')) {
      return [];
    }
    this.pausedRemainingMs = this.state.timer ? Math.max(0, this.state.timer.expiresAt - now) : null;
    this.state.timer = null;
    this.paused = true;
    this.events.push({ type: 'game_paused' });
    return this.events.slice(-1);
  }

  /** Resume the frozen turn, restoring the remaining time for the current player. */
  resume(now: number): GameEvent[] {
    if (!this.paused) {
      return [];
    }
    this.paused = false;
    if (this.pausedRemainingMs !== null && this.state.phase === 'round_active' && this.state.currentPlayerId) {
      const remaining = this.pausedRemainingMs;
      this.state.timer = {
        startedAt: now,
        expiresAt: now + remaining,
        durationMs: TURN_DURATION_MS,
        serverNow: now,
        remainingMs: remaining,
      };
    }
    this.pausedRemainingMs = null;
    this.events.push({ type: 'game_resumed' });
    return this.events.slice(-1);
  }

  onTurnTimeout(): GameEvent[] {
    if (this.paused) {
      return [];
    }
    if (this.state.phase === 'awaiting_color_choice' && this.state.pendingColorChoiceBy) {
      return this.handleAction({
        type: 'choose_color',
        playerId: this.state.pendingColorChoiceBy,
        color: this.autoPickColor(this.state.pendingColorChoiceBy),
      });
    }
    if (this.state.phase !== 'round_active' || !this.state.currentPlayerId) {
      return [];
    }
    return this.handleAction({ type: 'timeout' });
  }

  private autoPickColor(playerId: string): 'red' | 'yellow' | 'green' | 'blue' {
    const counts: Record<'red' | 'yellow' | 'green' | 'blue', number> = { red: 0, yellow: 0, green: 0, blue: 0 };
    for (const card of this.state.hands[playerId] ?? []) {
      if (card.color !== 'wild') {
        counts[card.color] += 1;
      }
    }
    return (['red', 'yellow', 'green', 'blue'] as const).reduce((best, color) => (counts[color] > counts[best] ? color : best), 'red');
  }

  handleAction(action: UnoAction): GameEvent[] {
    assertCondition(!this.paused || action.type === 'timeout', 'GAME_PAUSED', 'Game is paused');
    const before = this.events.length;
    switch (action.type) {
      case 'timeout': {
        const playerId = this.state.currentPlayerId;
        if (!playerId) {
          break;
        }
        this.applyDraw(playerId, Math.max(this.state.pendingDraw, 1));
        this.state.pendingDraw = 0;
        this.state.pendingDrawType = null;
        this.endTurn(playerId);
        break;
      }
      case 'draw_card': {
        this.ensureCurrentPlayer(action.playerId);
        const drawCount = Math.max(this.state.pendingDraw, 1);
        const drew = this.drawCards(action.playerId, drawCount);
        this.events.push({ type: 'card_drawn', playerId: action.playerId, count: drew.length });
        this.state.pendingDraw = 0;
        this.state.pendingDrawType = null;

        const canPlayDrawn = action.playDrawnCardId
          ? drew.some((card) => card.id === action.playDrawnCardId)
          : false;

        if (canPlayDrawn && action.playDrawnCardId) {
          const eventCount = this.playCard(action.playerId, action.playDrawnCardId, action.chosenColor);
          if (!eventCount.endedRound) {
            this.endTurn(action.playerId);
          }
          break;
        }

        this.endTurn(action.playerId);
        break;
      }
      case 'play_card': {
        this.ensureCurrentPlayer(action.playerId);
        const outcome = this.playCard(action.playerId, action.cardId, action.chosenColor);
        if (!outcome.endedRound && !outcome.awaitingColorChoice) {
          this.endTurn(action.playerId, outcome.skipNext, outcome.extraReverseForTwoPlayers);
        }
        break;
      }
      case 'choose_color': {
        assertCondition(this.state.phase === 'awaiting_color_choice', 'INVALID_PHASE', 'Color choice not pending');
        assertCondition(this.state.pendingColorChoiceBy === action.playerId, 'NOT_ALLOWED', 'Only chooser can select color');
        this.state.currentColor = action.color;
        this.state.phase = 'round_active';
        this.state.pendingColorChoiceBy = null;
        this.events.push({ type: 'color_changed', color: action.color });
        this.endTurn(action.playerId);
        break;
      }
      case 'uno_call': {
        assertCondition(this.state.hands[action.playerId]?.length === 1, 'INVALID_UNO_CALL', 'UNO can be called only with one card');
        this.state.players[action.playerId].calledUno = true;
        this.state.unoWindow[action.playerId] = null;
        this.events.push({ type: 'uno_called', playerId: action.playerId });
        break;
      }
      case 'uno_challenge': {
        assertCondition(action.playerId !== action.targetPlayerId, 'INVALID_CHALLENGE', 'Cannot challenge yourself');
        const deadlineTurn = this.state.unoWindow[action.targetPlayerId];
        assertCondition(deadlineTurn !== null, 'NO_UNO_WINDOW', 'Target has no UNO challenge window');
        assertCondition(this.state.turn <= deadlineTurn, 'UNO_WINDOW_EXPIRED', 'UNO challenge window closed');
        this.applyDraw(action.targetPlayerId, 2);
        this.state.unoWindow[action.targetPlayerId] = null;
        this.state.players[action.targetPlayerId].calledUno = false;
        this.events.push({ type: 'uno_penalty_applied', playerId: action.targetPlayerId, count: 2 });
        break;
      }
      default:
        break;
    }

    return this.events.slice(before);
  }

  getState(): UnoFullState {
    return structuredClone(this.state);
  }

  getPublicState(): UnoPublicState {
    const now = this.nowProvider();
    const timer = this.state.timer
      ? {
          startedAt: this.state.timer.startedAt,
          expiresAt: this.state.timer.expiresAt,
          durationMs: this.state.timer.durationMs,
          serverNow: now,
          remainingMs: Math.max(0, this.state.timer.expiresAt - now),
        }
      : null;

    return {
      phase: this.paused ? 'paused' : this.state.phase,
      roomCode: this.state.roomCode,
      players: this.state.playersOrder.map((playerId) => {
        const base = this.state.players[playerId];
        const deadline = this.state.unoWindow[playerId];
        return {
          ...base,
          unoChallengeable: base.handCount === 1 && !base.calledUno && deadline !== null && this.state.turn <= deadline,
        };
      }),
      currentPlayerId: this.state.currentPlayerId,
      pendingColorChoiceBy: this.paused ? null : this.state.pendingColorChoiceBy,
      direction: this.state.direction,
      currentColor: this.state.currentColor,
      topDiscard: this.state.discardPile.at(-1) ?? null,
      topDrawPileCard: this.state.drawPile.at(0) ?? null,
      drawPileCount: this.state.drawPile.length,
      pendingDraw: this.state.pendingDraw,
      pendingDrawType: this.state.pendingDrawType,
      turn: this.state.turn,
      round: this.state.round,
      timer,
      winnerPlayerId: this.state.winnerPlayerId,
      gameWinnerPlayerId: this.state.gameWinnerPlayerId,
      targetScore: this.state.targetScore,
    };
  }

  getPrivateState(playerId: string): UnoPrivatePlayerState {
    const hand = this.state.hands[playerId] ?? [];
    const topDiscard = this.state.discardPile.at(-1) ?? null;
    const selectableCardIds = !topDiscard || !this.state.currentColor
      ? []
      : hand
        .filter((card) => isCardPlayable(card, topDiscard, this.state.currentColor!, this.state.pendingDrawType))
        .map((card) => card.id);

    return {
      playerId,
      hand: [...hand],
      canPlay: !this.paused && this.state.currentPlayerId === playerId && this.state.phase === 'round_active',
      selectableCardIds: this.paused ? [] : selectableCardIds,
    };
  }

  consumeEvents(): GameEvent[] {
    const snapshot = [...this.events];
    this.events.length = 0;
    return snapshot;
  }

  private ensureCurrentPlayer(playerId: string): void {
    assertCondition(this.state.phase === 'round_active', 'INVALID_PHASE', 'Round is not active');
    assertCondition(this.state.currentPlayerId === playerId, 'NOT_YOUR_TURN', 'It is not your turn');
  }

  private playCard(playerId: string, cardId: string, chosenColor?: 'red' | 'yellow' | 'green' | 'blue'): {
    endedRound: boolean;
    awaitingColorChoice: boolean;
    skipNext: boolean;
    extraReverseForTwoPlayers: boolean;
  } {
    const hand = this.state.hands[playerId] ?? [];
    const topDiscard = this.state.discardPile.at(-1);
    assertCondition(topDiscard && this.state.currentColor, 'NO_TOP_DISCARD', 'Discard pile is empty');

    const index = hand.findIndex((card) => card.id === cardId);
    assertCondition(index >= 0, 'CARD_NOT_FOUND', 'Card is not in player hand');

    const card = hand[index];
    assertCondition(card, 'CARD_NOT_FOUND', 'Card is not in player hand');
    assertCondition(isCardPlayable(card, topDiscard, this.state.currentColor, this.state.pendingDrawType), 'CARD_NOT_PLAYABLE', 'Invalid card for current state');

    hand.splice(index, 1);
    this.state.players[playerId].handCount = hand.length;
    this.state.discardPile.push(card);
    this.events.push({ type: 'card_played', playerId, card });

    if (card.color !== 'wild') {
      this.state.currentColor = card.color;
    }

    let skipNext = false;
    let extraReverseForTwoPlayers = false;

    // Debug: log draw effects during tests
    if (card.type === 'draw_two') {
      // console.debug(`[DEBUG] playCard: draw_two by ${playerId} before=${this.state.pendingDraw}`);
      this.state.pendingDraw += 2;
      this.state.pendingDrawType = 'draw_two';
      // console.debug(`[DEBUG] playCard: draw_two applied pendingDraw=${this.state.pendingDraw}`);
    } else if (card.type === 'wild_draw_four') {
      // console.debug(`[DEBUG] playCard: wild_draw_four by ${playerId} before=${this.state.pendingDraw}`);
      this.state.pendingDraw += 4;
      this.state.pendingDrawType = 'wild_draw_four';
      // console.debug(`[DEBUG] playCard: wild_draw_four applied pendingDraw=${this.state.pendingDraw}`);
    }

    if (card.type === 'skip') {
      skipNext = true;
    }

    if (card.type === 'reverse') {
      if (this.state.playersOrder.length === 2) {
        skipNext = true;
        extraReverseForTwoPlayers = true;
      } else {
        this.state.direction = (this.state.direction * -1) as 1 | -1;
        this.events.push({ type: 'direction_changed', direction: this.state.direction });
      }
    }

    if (card.type === 'wild' || card.type === 'wild_draw_four') {
      if (chosenColor) {
        this.state.currentColor = chosenColor;
        this.events.push({ type: 'color_changed', color: chosenColor });
      } else {
        this.state.phase = 'awaiting_color_choice';
        this.state.pendingColorChoiceBy = playerId;
        return { endedRound: false, awaitingColorChoice: true, skipNext, extraReverseForTwoPlayers };
      }
    }

    if (hand.length === 1) {
      this.state.players[playerId].calledUno = false;
      this.state.unoWindow[playerId] = this.state.turn + 2;
    }

    if (hand.length === 0) {
      const roundScore = this.computeRoundScore(playerId);
      this.state.phase = 'round_finished';
      this.state.winnerPlayerId = playerId;
      this.state.players[playerId].score += roundScore;
      this.state.timer = null;
      this.events.push({ type: 'round_finished', winnerPlayerId: playerId, roundScore });

      const leader = this.state.playersOrder
        .map((id) => this.state.players[id])
        .reduce((best, current) => (current.score > best.score ? current : best));
      if (leader.score >= this.state.targetScore) {
        this.state.phase = 'game_finished';
        this.state.gameWinnerPlayerId = leader.id;
        this.events.push({ type: 'game_finished', gameWinnerPlayerId: leader.id });
      }

      return { endedRound: true, awaitingColorChoice: false, skipNext, extraReverseForTwoPlayers };
    }

    return { endedRound: false, awaitingColorChoice: false, skipNext, extraReverseForTwoPlayers };
  }

  private computeRoundScore(winnerPlayerId: string): number {
    let score = 0;
    for (const playerId of this.state.playersOrder) {
      if (playerId === winnerPlayerId) {
        continue;
      }
      for (const card of this.state.hands[playerId]) {
        if (card.type === 'number') {
          score += card.value ?? 0;
        } else if (card.type === 'wild' || card.type === 'wild_draw_four') {
          score += 50;
        } else {
          score += 20;
        }
      }
    }
    return score;
  }

  private endTurn(playerId: string, skipNext = false, extraReverseForTwoPlayers = false): void {
    this.events.push({ type: 'turn_ended', playerId, turn: this.state.turn });
    this.state.turn += 1;

    if (this.state.phase !== 'round_active') {
      return;
    }

    let nextIndex = this.state.playersOrder.indexOf(playerId);
    const steps = skipNext ? 2 : 1;
    for (let i = 0; i < steps; i += 1) {
      nextIndex = this.getNextIndex(nextIndex);
      if (skipNext && i === 0) {
        const skippedId = this.state.playersOrder[nextIndex];
        this.events.push({ type: 'player_skipped', playerId: skippedId });
      }
    }

    this.state.currentPlayerId = this.state.playersOrder[nextIndex];

    if (!extraReverseForTwoPlayers && this.state.pendingDraw > 0) {
      const nextPlayerId = this.state.currentPlayerId;
      const hand = this.state.hands[nextPlayerId];
      const topDiscard = this.state.discardPile.at(-1)!;
      const canRespond = hand.some((card) => isCardPlayable(card, topDiscard, this.state.currentColor!, this.state.pendingDrawType));
      if (!canRespond) {
        this.applyDraw(nextPlayerId, this.state.pendingDraw);
        this.state.pendingDraw = 0;
        this.state.pendingDrawType = null;
        this.events.push({ type: 'player_skipped', playerId: nextPlayerId });
        this.state.currentPlayerId = this.state.playersOrder[this.getNextIndex(nextIndex)];
      }
    }

    if (this.state.currentPlayerId) {
      this.events.push({ type: 'turn_started', playerId: this.state.currentPlayerId, turn: this.state.turn });
    }
    this.startTurnTimer(this.nowProvider());

    this.maintainDrawPile();
  }

  private getNextIndex(currentIndex: number): number {
    const count = this.state.playersOrder.length;
    return (currentIndex + this.state.direction + count) % count;
  }

  private drawCards(playerId: string, count: number): UnoCard[] {
    this.maintainDrawPile();
    const hand = this.state.hands[playerId];
    const cards: UnoCard[] = [];
    for (let i = 0; i < count; i += 1) {
      const card = this.state.drawPile.shift();
      if (!card) {
        break;
      }
      hand.push(card);
      cards.push(card);
    }
    this.state.players[playerId].handCount = hand.length;
    return cards;
  }

  // Host-triggered: start the turn timer for the current player.
  startTurnTimer(now = Date.now(), durationMs = TURN_DURATION_MS): void {
    if (this.state.phase !== 'round_active') {
      throw new Error('INVALID_PHASE:Cannot start timer when round is not active');
    }
    if (!this.state.currentPlayerId) {
      throw new Error('NO_CURRENT_PLAYER:No current player to start timer for');
    }
    this.state.timer = createTimer(now, durationMs);
    this.events.push({ type: 'timer_started', playerId: this.state.currentPlayerId, turn: this.state.turn, durationMs });
  }

  private applyDraw(playerId: string, count: number): void {
    const drew = this.drawCards(playerId, count);
    this.events.push({ type: 'card_drawn', playerId, count: drew.length });
  }

  private maintainDrawPile(): void {
    if (this.state.drawPile.length > 0) {
      return;
    }
    if (this.state.discardPile.length <= 1) {
      return;
    }
    const top = this.state.discardPile.pop()!;
    this.state.drawPile = shuffle([...this.state.discardPile]);
    this.state.discardPile = [top];
  }
}
