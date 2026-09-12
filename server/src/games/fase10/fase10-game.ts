import { nanoid } from 'nanoid';
import {
  FASE10_PHASES,
  type Fase10Card,
  type Fase10GameEvent,
  type Fase10HandResultRow,
  type Fase10LaidGroup,
  type Fase10Phase,
  type Fase10PrivatePlayerState,
  type Fase10PublicState,
  type GameStatus as PlatformGameStatus,
  type TurnTimer,
} from '@party/shared';
import type { GameContext, PausableGame, RoundedGame, TurnTimedGame } from '../../core/game-plugin';
import { parseFase10Action } from './action-schema';
import { createDeck, shuffle } from './cards';
import {
  DEFAULT_TARGET_PHASE,
  HAND_SIZE,
  MAX_PLAYERS,
  MIN_PLAYERS,
  TARGET_PHASE_OPTIONS,
  TURN_MS,
  cardPenalty,
} from './constants';
import { hitInto, solvePhase, type WildHint } from './solver';

function assertCondition(condition: unknown, code: string, message: string): asserts condition {
  if (!condition) throw new Error(`${code}:${message}`);
}

type Player = { id: string; name: string };

/**
 * Fase 10 orchestrator — the platform `GameInstance` for a *Phase 10*-style
 * contract-rummy match. Turn-based like UNO: each turn is draw one → optionally
 * lay your phase / hit laid groups → discard one. A hand ends when someone empties
 * their hand; players who laid their phase advance. First to clear the target
 * phase (5 / 7 / 10) at the end of a hand wins; ties break on fewest penalty points.
 */
export class Fase10Game implements PausableGame, RoundedGame, TurnTimedGame {
  private readonly now: () => number;
  private readonly random: () => number;
  private readonly roomCode: string;
  private readonly players: Player[];
  private readonly nameById = new Map<string, string>();
  private readonly connected = new Map<string, boolean>();
  private readonly phaseIndexById = new Map<string, number>();
  private readonly scoreById = new Map<string, number>();
  private readonly hands = new Map<string, Fase10Card[]>();
  private readonly laid = new Set<string>();
  private readonly skipped = new Set<string>();
  private readonly skipBy = new Map<string, string>();

  private started = false;
  private phase: Fase10Phase = 'dealing';
  private readonly targetPhase: number;

  private readonly order: string[];
  private currentIdx = 0;
  private hasDrawn = false;

  private drawPile: Fase10Card[] = [];
  private discardPile: Fase10Card[] = [];
  private table: Fase10LaidGroup[] = [];

  private turn = 0;
  private hand = 0;
  private lastStarterId: string | null = null;

  private handResult: Fase10HandResultRow[] | null = null;
  private handWinnerId: string | null = null;
  private gameWinnerId: string | null = null;

  private timerStartedAt: number | null = null;
  private timerDurationMs: number | null = null;
  private timerExpiresAt: number | null = null;
  private paused = false;
  private pausedRemainingMs: number | null = null;

  private readonly events: Fase10GameEvent[] = [];

  /** Test seam: a fixed, unshuffled deck so hands/lay-downs/scoring are deterministic. */
  private readonly deckOverride: Fase10Card[] | null;

  constructor(ctx: GameContext, opts: { deck?: Fase10Card[] } = {}) {
    this.now = ctx.now;
    this.random = ctx.random;
    this.roomCode = ctx.roomCode;
    this.deckOverride = opts.deck ?? null;
    this.players = ctx.players.map((p) => ({ id: p.id, name: p.name }));
    this.order = this.players.map((p) => p.id);
    const wanted = ctx.matchLength ?? 0;
    this.targetPhase = (TARGET_PHASE_OPTIONS as readonly number[]).includes(wanted)
      ? wanted
      : DEFAULT_TARGET_PHASE;
    for (const p of this.players) {
      this.nameById.set(p.id, p.name);
      this.connected.set(p.id, true);
      this.phaseIndexById.set(p.id, 1);
      this.scoreById.set(p.id, 0);
      this.hands.set(p.id, []);
    }
  }

  // ─── Lifecycle ───

  start(): void {
    assertCondition(
      this.players.length >= MIN_PLAYERS && this.players.length <= MAX_PLAYERS,
      'INVALID_PLAYER_COUNT',
      `Fase 10 requires ${MIN_PLAYERS}-${MAX_PLAYERS} players`,
    );
    this.started = true;
    for (const p of this.players) {
      this.phaseIndexById.set(p.id, 1);
      this.scoreById.set(p.id, 0);
    }
    this.emit({ type: 'game_started', targetPhase: this.targetPhase });
    this.dealHand(this.order[0]);
  }

  startNextRound(): void {
    assertCondition(this.phase === 'handOver', 'INVALID_PHASE', 'The hand must be over to start the next');
    const starter = this.handWinnerId ?? this.nextInOrder(this.lastStarterId);
    this.dealHand(starter);
  }

  private dealHand(starterId: string): void {
    this.hand += 1;
    this.turn = 1;
    this.phase = 'turn';
    this.hasDrawn = false;
    this.table = [];
    this.laid.clear();
    this.skipped.clear();
    this.skipBy.clear();
    this.handResult = null;
    this.handWinnerId = null;

    const deck = this.deckOverride ? [...this.deckOverride] : shuffle(createDeck(), this.random);
    for (const id of this.order) {
      this.hands.set(id, deck.splice(0, HAND_SIZE));
    }
    const top = deck.shift()!;
    this.discardPile = [top];
    this.drawPile = deck;

    this.currentIdx = Math.max(0, this.order.indexOf(starterId));
    this.lastStarterId = this.order[this.currentIdx];
    // A skip flipped to start the discard pile costs the first player their turn.
    if (top.kind === 'skip') {
      this.skipped.add(this.order[this.currentIdx]);
      this.skipBy.set(this.order[this.currentIdx], this.order[this.currentIdx]);
    }

    this.emit({ type: 'hand_started', hand: this.hand, startingPlayerId: this.lastStarterId });
    this.openTurn();
  }

  /** Land on the next player who isn't sitting out a skip; open their turn. */
  private openTurn(): void {
    for (let guard = 0; guard < this.order.length * 2 + 2; guard += 1) {
      const cur = this.order[this.currentIdx];
      if (this.skipped.has(cur)) {
        this.skipped.delete(cur);
        this.emit({ type: 'player_skipped', playerId: cur, byPlayerId: this.skipBy.get(cur) ?? cur });
        this.skipBy.delete(cur);
        this.currentIdx = (this.currentIdx + 1) % this.order.length;
        continue;
      }
      break;
    }
    this.hasDrawn = false;
    const cur = this.order[this.currentIdx];
    this.emit({ type: 'turn_started', playerId: cur, turn: this.turn });
    this.setTimer(TURN_MS);
    this.emit({ type: 'timer_started', playerId: cur, turn: this.turn, durationMs: TURN_MS });
    // A disconnected player would otherwise stall the whole table for the full
    // timer — auto-play their turn, but only while someone is still around to play.
    const anyConnected = this.order.some((id) => this.connected.get(id) ?? true);
    if (anyConnected && !(this.connected.get(cur) ?? true)) this.autoResolveTurn();
  }

  private endTurn(): void {
    if (this.phase !== 'turn') return;
    this.turn += 1;
    this.currentIdx = (this.currentIdx + 1) % this.order.length;
    this.openTurn();
  }

  setPlayerConnected(playerId: string, connected: boolean): void {
    if (!this.connected.has(playerId)) return;
    this.connected.set(playerId, connected);
    const anyConnected = this.order.some((id) => this.connected.get(id) ?? true);
    if (!connected && anyConnected && !this.paused && this.phase === 'turn' && this.order[this.currentIdx] === playerId) {
      this.autoResolveTurn();
    }
  }

  getStatus(): PlatformGameStatus {
    if (!this.started) return 'setup';
    if (this.phase === 'gameOver') return 'complete';
    if (this.phase === 'handOver') return 'intermission';
    return 'active';
  }

  // ─── Capability: pause ───

  isPaused(): boolean {
    return this.paused;
  }

  pause(now: number): void {
    if (this.paused || this.phase === 'gameOver' || this.phase === 'handOver') return;
    this.pausedRemainingMs = this.timerExpiresAt !== null ? Math.max(0, this.timerExpiresAt - now) : null;
    this.clearTimer();
    this.paused = true;
    this.emit({ type: 'game_paused' });
  }

  resume(now: number): void {
    if (!this.paused) return;
    this.paused = false;
    if (this.pausedRemainingMs !== null && this.phase === 'turn') {
      this.timerStartedAt = now;
      this.timerDurationMs = this.pausedRemainingMs;
      this.timerExpiresAt = now + this.pausedRemainingMs;
    }
    this.pausedRemainingMs = null;
    this.emit({ type: 'game_resumed' });
  }

  // ─── Capability: turn timer ───

  getTimer(): TurnTimer | null {
    if (this.paused || this.phase !== 'turn' || this.timerExpiresAt === null) return null;
    const now = this.now();
    return {
      startedAt: this.timerStartedAt ?? now,
      expiresAt: this.timerExpiresAt,
      durationMs: this.timerDurationMs ?? TURN_MS,
      serverNow: now,
      remainingMs: Math.max(0, this.timerExpiresAt - now),
    };
  }

  onTurnTimeout(): void {
    if (this.paused || this.phase !== 'turn') return;
    this.autoResolveTurn();
  }

  /** Draw from the pile (if needed) then discard the costliest card. No lay, no hit. */
  private autoResolveTurn(): void {
    const player = this.order[this.currentIdx];
    if (!this.hasDrawn) {
      const card = this.drawFromPile();
      if (card === null) {
        this.settleHand();
        return;
      }
      this.hands.get(player)!.push(card);
      this.hasDrawn = true;
      this.emit({ type: 'card_drawn', playerId: player, source: 'pile' });
    }
    const hand = this.hands.get(player)!;
    let worstIdx = 0;
    for (let i = 1; i < hand.length; i += 1) {
      if (cardPenalty(hand[i]) > cardPenalty(hand[worstIdx])) worstIdx = i;
    }
    const [card] = hand.splice(worstIdx, 1);
    this.discardPile.push(card);
    if (card.kind === 'skip') {
      const target = this.firstOtherPlayer(player);
      if (target) {
        this.skipped.add(target);
        this.skipBy.set(target, player);
      }
    }
    this.emit({ type: 'card_discarded', playerId: player, card });
    if (hand.length === 0) this.goOut(player);
    else this.endTurn();
  }

  // ─── Action entry ───

  handleAction(playerId: string, action: unknown): void {
    assertCondition(!this.paused, 'GAME_PAUSED', 'Game is paused');
    assertCondition(this.nameById.has(playerId), 'REJECTED', 'Not a player in this game');
    const input = parseFase10Action(action);
    switch (input.type) {
      case 'draw':
        this.doDraw(playerId, input.source);
        break;
      case 'layPhase':
        this.doLayPhase(playerId, input.cardIds, input.wildHints ?? []);
        break;
      case 'hit':
        this.doHit(playerId, input.cardId, input.groupId, input.end);
        break;
      case 'discard':
        this.doDiscard(playerId, input.cardId, input.skipTargetId);
        break;
    }
  }

  private ensureTurn(playerId: string): void {
    assertCondition(this.phase === 'turn', 'INVALID_PHASE', 'Não é hora de jogar');
    assertCondition(this.order[this.currentIdx] === playerId, 'NOT_YOUR_TURN', 'Não é a sua vez');
  }

  private doDraw(playerId: string, source: 'pile' | 'discard'): void {
    this.ensureTurn(playerId);
    assertCondition(!this.hasDrawn, 'ALREADY_DREW', 'Você já comprou nesta vez');
    let card: Fase10Card | null;
    if (source === 'discard') {
      const top = this.discardPile[this.discardPile.length - 1];
      assertCondition(top && top.kind === 'number', 'CANT_TAKE_DISCARD', 'Só dá pra pegar carta numérica do descarte');
      card = this.discardPile.pop()!;
    } else {
      card = this.drawFromPile();
      if (card === null) {
        this.settleHand();
        return;
      }
    }
    this.hands.get(playerId)!.push(card);
    this.hasDrawn = true;
    this.emit({ type: 'card_drawn', playerId, source });
  }

  private doLayPhase(playerId: string, cardIds: string[], wildHints: { cardId: string; value?: number; color?: 'red' | 'yellow' | 'green' | 'blue' }[]): void {
    this.ensureTurn(playerId);
    assertCondition(this.hasDrawn, 'DRAW_FIRST', 'Compre uma carta antes de baixar');
    assertCondition(!this.laid.has(playerId), 'ALREADY_LAID', 'Você já baixou a sua fase nesta mão');

    const hand = this.hands.get(playerId)!;
    const ids = new Set(cardIds);
    assertCondition(ids.size === cardIds.length, 'BAD_SELECTION', 'Cartas repetidas na seleção');
    const cards = cardIds.map((id) => hand.find((c) => c.id === id));
    assertCondition(cards.every((c): c is Fase10Card => Boolean(c)), 'CARD_NOT_IN_HAND', 'Carta selecionada não está na sua mão');

    const spec = FASE10_PHASES[this.phaseIndexById.get(playerId)! - 1];
    const hints = new Map<string, WildHint>(wildHints.map((h) => [h.cardId, { value: h.value, color: h.color }]));
    const result = solvePhase(cards as Fase10Card[], [...spec.groups], hints);
    assertCondition(result.ok, 'PHASE_INCOMPLETE', result.ok ? '' : result.reason);

    for (const built of result.groups) {
      this.table.push({
        id: nanoid(10),
        ownerId: playerId,
        req: built.req,
        cards: built.cards,
        values: built.values,
        color: built.color,
      });
    }
    this.hands.set(playerId, hand.filter((c) => !ids.has(c.id)));
    this.laid.add(playerId);
    this.emit({ type: 'phase_laid', playerId, phaseIndex: this.phaseIndexById.get(playerId)! });
    if (this.hands.get(playerId)!.length === 0) this.goOut(playerId);
  }

  private doHit(playerId: string, cardId: string, groupId: string, end?: 'low' | 'high'): void {
    this.ensureTurn(playerId);
    assertCondition(this.hasDrawn, 'DRAW_FIRST', 'Compre uma carta antes de encaixar');
    assertCondition(this.laid.has(playerId), 'LAY_FIRST', 'Baixe a sua fase antes de encaixar');

    const hand = this.hands.get(playerId)!;
    const card = hand.find((c) => c.id === cardId);
    assertCondition(card, 'CARD_NOT_IN_HAND', 'Carta não está na sua mão');
    const groupIdx = this.table.findIndex((g) => g.id === groupId);
    assertCondition(groupIdx >= 0, 'NO_SUCH_GROUP', 'Grupo não existe na mesa');

    const updated = hitInto(this.table[groupIdx], card!, end);
    assertCondition(updated, 'BAD_HIT', 'Essa carta não encaixa aí');

    const targetOwnerId = this.table[groupIdx].ownerId;
    this.table[groupIdx] = updated!;
    this.hands.set(playerId, hand.filter((c) => c.id !== cardId));
    this.emit({ type: 'hit_made', playerId, targetOwnerId });
    if (this.hands.get(playerId)!.length === 0) this.goOut(playerId);
  }

  private doDiscard(playerId: string, cardId: string, skipTargetId?: string): void {
    this.ensureTurn(playerId);
    assertCondition(this.hasDrawn, 'DRAW_FIRST', 'Compre uma carta antes de descartar');
    const hand = this.hands.get(playerId)!;
    const idx = hand.findIndex((c) => c.id === cardId);
    assertCondition(idx >= 0, 'CARD_NOT_IN_HAND', 'Carta não está na sua mão');
    const card = hand[idx];

    if (card.kind === 'skip') {
      assertCondition(
        skipTargetId && skipTargetId !== playerId && this.nameById.has(skipTargetId),
        'BAD_SKIP_TARGET',
        'Escolha outro jogador para pular',
      );
    }

    hand.splice(idx, 1);
    this.discardPile.push(card);
    if (card.kind === 'skip' && skipTargetId) {
      this.skipped.add(skipTargetId);
      this.skipBy.set(skipTargetId, playerId);
    }
    this.emit({ type: 'card_discarded', playerId, card });

    if (hand.length === 0) this.goOut(playerId);
    else this.endTurn();
  }

  private goOut(playerId: string): void {
    this.handWinnerId = playerId;
    this.settleHand();
  }

  // ─── Hand settlement ───

  private settleHand(): void {
    const rows: Fase10HandResultRow[] = this.order.map((id) => {
      const cards = this.hands.get(id) ?? [];
      const gained = cards.reduce((n, c) => n + cardPenalty(c), 0);
      this.scoreById.set(id, (this.scoreById.get(id) ?? 0) + gained);
      const advanced = this.laid.has(id);
      if (advanced) this.phaseIndexById.set(id, Math.min(11, (this.phaseIndexById.get(id) ?? 1) + 1));
      return {
        playerId: id,
        name: this.nameById.get(id) ?? '—',
        gained,
        advanced,
        phaseIndex: this.phaseIndexById.get(id) ?? 1,
      };
    });
    this.handResult = rows;
    this.clearTimer();
    this.emit({ type: 'hand_over', winnerId: this.handWinnerId, hand: this.hand });

    const finishers = this.order.filter((id) => (this.phaseIndexById.get(id) ?? 1) > this.targetPhase);
    if (finishers.length > 0) {
      const bestScore = Math.min(...finishers.map((id) => this.scoreById.get(id) ?? 0));
      const champs = finishers.filter((id) => (this.scoreById.get(id) ?? 0) === bestScore);
      this.gameWinnerId = champs.length === 1 ? champs[0] : null;
      this.phase = 'gameOver';
      this.emit({ type: 'game_over', winnerId: this.gameWinnerId });
    } else {
      this.phase = 'handOver';
    }
  }

  // ─── Draw pile upkeep ───

  private drawFromPile(): Fase10Card | null {
    if (this.drawPile.length === 0) {
      if (this.discardPile.length <= 1) return null;
      const top = this.discardPile.pop()!;
      this.drawPile = shuffle(this.discardPile, this.random);
      this.discardPile = [top];
    }
    return this.drawPile.shift() ?? null;
  }

  private firstOtherPlayer(playerId: string): string | null {
    for (let i = 1; i < this.order.length; i += 1) {
      const id = this.order[(this.currentIdx + i) % this.order.length];
      if (id !== playerId) return id;
    }
    return null;
  }

  private nextInOrder(afterId: string | null): string {
    if (!afterId) return this.order[0];
    const idx = this.order.indexOf(afterId);
    return this.order[(idx + 1) % this.order.length];
  }

  // ─── Events / timer ───

  private emit(event: Fase10GameEvent): void {
    this.events.push(event);
  }

  consumeEvents(): Fase10GameEvent[] {
    const snapshot = [...this.events];
    this.events.length = 0;
    return snapshot;
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

  // ─── State projection ───

  getPublicState(): Fase10PublicState {
    const top = this.discardPile[this.discardPile.length - 1] ?? null;
    return {
      phase: this.paused ? 'paused' : this.phase,
      roomCode: this.roomCode,
      players: this.order.map((id) => ({
        id,
        name: this.nameById.get(id) ?? '—',
        connected: this.connected.get(id) ?? true,
        phaseIndex: this.phaseIndexById.get(id) ?? 1,
        score: this.scoreById.get(id) ?? 0,
        handCount: this.hands.get(id)?.length ?? 0,
        laid: this.laid.has(id),
        skipped: this.skipped.has(id),
      })),
      currentPlayerId: this.phase === 'turn' ? this.order[this.currentIdx] : null,
      hasDrawn: this.hasDrawn,
      topDiscard: top,
      discardDrawable: top?.kind === 'number',
      drawPileCount: this.drawPile.length,
      table: this.table.map((g) => ({ ...g, cards: [...g.cards], values: [...g.values] })),
      turn: this.turn,
      hand: this.hand,
      timer: this.getTimer(),
      targetPhase: this.targetPhase,
      handResult: this.phase === 'handOver' || this.phase === 'gameOver' ? this.handResult : null,
      handWinnerId: this.handWinnerId,
      gameWinnerId: this.phase === 'gameOver' ? this.gameWinnerId : null,
      phaseSpecs: FASE10_PHASES,
    };
  }

  getPrivateState(playerId: string): Fase10PrivatePlayerState {
    const pi = this.phaseIndexById.get(playerId) ?? 1;
    const isCurrent = this.phase === 'turn' && this.order[this.currentIdx] === playerId;
    const canAct = isCurrent && !this.paused;
    return {
      playerId,
      hand: [...(this.hands.get(playerId) ?? [])],
      phaseIndex: pi,
      phaseSpec: FASE10_PHASES[pi - 1],
      canAct,
      mustDraw: canAct && !this.hasDrawn,
      laid: this.laid.has(playerId),
    };
  }
}
