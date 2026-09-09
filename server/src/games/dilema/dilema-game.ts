import type {
  ContentTier,
  DilemaGameEvent,
  DilemaHandCard,
  DilemaPhase,
  DilemaPrivateState,
  DilemaPublicState,
  DilemaStanding,
  DilemaTrack,
  DilemaTrackCard,
  DilemaTrackView,
  GameStatus as PlatformGameStatus,
  TurnTimer,
} from '@party/shared';
import type { GameContext, PausableGame, TurnTimedGame } from '../../core/game-plugin';
import { parseDilemaAction } from './action-schema';
import { dilemaCards, type DilemaCardDef } from './cards';
import {
  ASSIGNING_MS,
  HAND_GUILTY,
  HAND_INNOCENTS,
  HAND_MODIFIERS,
  HAND_SIZE,
  MAX_PLAYERS,
  MIN_PLAYERS,
  PLAYING_MS,
  RESULTS_MS,
  TOTAL_ROUNDS,
  TRACK_LABEL,
  VERDICT_MS,
} from './constants';
import { planRound } from './pairing';

function assertCondition(condition: unknown, code: string, message: string): asserts condition {
  if (!condition) {
    throw new Error(`${code}:${message}`);
  }
}

type Player = { id: string; name: string };

/** A card resolved onto a track — engine-internal (author always known). */
type InternalCard = {
  id: string;
  type: 'innocent' | 'guilty' | 'modifier';
  text: string;
  authorId: string | null;
  attachedTo: string | null;
};

/**
 * Dilema nos Trilhos orchestrator — the platform `GameInstance` for a
 * trolley-problem debate match. Self-advancing: every phase (`assigning` →
 * `playing` → `verdict` → `roundResults`) carries one stored deadline the
 * platform server ticks; `onTurnTimeout()` closes the phase with whatever is in.
 *
 * There is no points economy. A player's score is the number of rounds their
 * track was spared; the game crowns whoever was spared most.
 */
export class DilemaGame implements PausableGame, TurnTimedGame {
  private readonly now: () => number;
  private readonly random: () => number;
  private readonly contentTier: ContentTier | undefined;
  private readonly roomCode: string;
  private readonly players: Player[];
  private readonly nameById = new Map<string, string>();
  private readonly connected = new Map<string, boolean>();
  private readonly spared = new Map<string, number>();
  private readonly roundDelta = new Map<string, number>();

  private started = false;
  private phase: DilemaPhase = 'assigning';
  private readonly totalRounds: number;
  private round = 0;

  // Card source + three working decks (texts only — the pile implies the type).
  private cardSource: { innocents: DilemaCardDef[]; guilty: DilemaCardDef[]; modifiers: DilemaCardDef[] } = {
    innocents: [],
    guilty: [],
    modifiers: [],
  };
  private innocentDeck: string[] = [];
  private guiltyDeck: string[] = [];
  private modifierDeck: string[] = [];

  // Per-round state.
  private conductorId: string | null = null;
  private leftIds: string[] = [];
  private rightIds: string[] = [];
  private trackCards: Record<DilemaTrack, InternalCard[]> = { left: [], right: [] };
  private hands = new Map<string, DilemaHandCard[]>();
  private cardsPlayed = new Map<string, number>();
  private passed = new Set<string>();
  private cardSeq = 0;

  private killedTrack: DilemaTrack | null = null;
  private sparedTrack: DilemaTrack | null = null;
  private verdictWasAuto = false;

  private standings: DilemaStanding[] = [];
  private winnerId: string | null = null;

  // Single wall-clock deadline, ticked by the server against `getTimer().expiresAt`.
  private timerStartedAt: number | null = null;
  private timerDurationMs: number | null = null;
  private timerExpiresAt: number | null = null;
  private paused = false;
  private pausedRemainingMs: number | null = null;

  private readonly events: DilemaGameEvent[] = [];

  constructor(ctx: GameContext) {
    this.now = ctx.now;
    this.random = ctx.random;
    this.contentTier = ctx.contentTier;
    this.roomCode = ctx.roomCode;
    this.totalRounds = ctx.matchLength && ctx.matchLength > 0 ? ctx.matchLength : TOTAL_ROUNDS;
    this.players = ctx.players.map((p) => ({ id: p.id, name: p.name }));
    for (const p of this.players) {
      this.nameById.set(p.id, p.name);
      this.connected.set(p.id, true);
      this.spared.set(p.id, 0);
      this.roundDelta.set(p.id, 0);
    }
  }

  // ─── Lifecycle ───

  start(): void {
    assertCondition(
      this.players.length >= MIN_PLAYERS && this.players.length <= MAX_PLAYERS,
      'INVALID_PLAYER_COUNT',
      `Dilema requires ${MIN_PLAYERS}-${MAX_PLAYERS} players`,
    );
    this.started = true;
    this.cardSource = dilemaCards(this.contentTier);
    this.reshuffleDecks();
    this.emit({ type: 'game_started', totalRounds: this.totalRounds });
    this.beginRound(1);
  }

  setPlayerConnected(playerId: string, connected: boolean): void {
    if (this.connected.has(playerId)) {
      this.connected.set(playerId, connected);
      // A disconnect during `playing` might complete the round.
      if (!connected && this.phase === 'playing' && this.allReady()) {
        this.closePlaying();
      }
    }
  }

  getStatus(): PlatformGameStatus {
    if (!this.started) return 'setup';
    return this.phase === 'gameover' ? 'complete' : 'active';
  }

  // ─── Capability: pause ───

  isPaused(): boolean {
    return this.paused;
  }

  pause(now: number): void {
    if (this.paused || this.phase === 'gameover') return;
    this.pausedRemainingMs = this.timerExpiresAt !== null ? Math.max(0, this.timerExpiresAt - now) : null;
    this.clearTimer();
    this.paused = true;
    this.emit({ type: 'game_paused' });
  }

  resume(now: number): void {
    if (!this.paused) return;
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
    if (this.paused || this.timerExpiresAt === null || this.phase === 'gameover') {
      return null;
    }
    const now = this.now();
    return {
      startedAt: this.timerStartedAt ?? now,
      expiresAt: this.timerExpiresAt,
      durationMs: this.timerDurationMs ?? PLAYING_MS,
      serverNow: now,
      remainingMs: Math.max(0, this.timerExpiresAt - now),
    };
  }

  onTurnTimeout(): void {
    if (this.paused) return;
    switch (this.phase) {
      case 'assigning':
        this.beginPlaying();
        break;
      case 'playing':
        this.closePlaying();
        break;
      case 'verdict':
        this.closeVerdict(true);
        break;
      case 'roundResults':
        if (this.round < this.totalRounds) {
          this.beginRound(this.round + 1);
        } else {
          this.enterGameover();
        }
        break;
      case 'gameover':
      case 'paused':
        break;
    }
  }

  // ─── Action entry ───

  handleAction(playerId: string, action: unknown): void {
    assertCondition(!this.paused, 'GAME_PAUSED', 'Game is paused');
    assertCondition(this.nameById.has(playerId), 'REJECTED', 'Not a player in this game');
    const input = parseDilemaAction(action);
    if (input.type === 'playCard') {
      this.playCard(playerId, input.cardId, input.targetTrack, input.targetCardId);
    } else if (input.type === 'pass') {
      this.passPlayer(playerId);
    } else {
      this.castVerdict(playerId, input.killedTrack);
    }
  }

  private playCard(playerId: string, cardId: string, targetTrack: DilemaTrack, targetCardId?: string): void {
    assertCondition(this.phase === 'playing', 'REJECTED', 'Not accepting cards right now');
    assertCondition(playerId !== this.conductorId, 'REJECTED', 'The Maquinista does not play cards');
    assertCondition(!this.passed.has(playerId), 'REJECTED', 'You already passed this round');

    const hand = this.hands.get(playerId) ?? [];
    const idx = hand.findIndex((c) => c.id === cardId);
    assertCondition(idx >= 0, 'REJECTED', 'That card is not in your hand');
    const card = hand[idx];
    const myTrack = this.trackOf(playerId);

    if (card.type === 'innocent') {
      assertCondition(targetTrack === myTrack, 'REJECTED', 'Inocentes só entram no seu próprio trilho');
    } else if (card.type === 'guilty') {
      assertCondition(targetTrack !== myTrack, 'REJECTED', 'Culpados só entram no trilho inimigo');
    } else {
      assertCondition(
        typeof targetCardId === 'string' && targetCardId.length > 0,
        'REJECTED',
        'Um modificador precisa ser grudado numa carta',
      );
      const base = this.trackCards[targetTrack].find((c) => c.id === targetCardId);
      assertCondition(base != null && base.type !== 'modifier', 'REJECTED', 'Não há essa carta nesse trilho');
    }

    hand.splice(idx, 1);
    this.trackCards[targetTrack].push({
      id: `c${this.cardSeq++}`,
      type: card.type,
      text: card.text,
      authorId: playerId,
      attachedTo: card.type === 'modifier' ? (targetCardId ?? null) : null,
    });
    this.cardsPlayed.set(playerId, (this.cardsPlayed.get(playerId) ?? 0) + 1);
    this.emit({ type: 'card_played', playerId, cardType: card.type, track: targetTrack });

    if (hand.length === 0) {
      this.passed.add(playerId);
      this.emit({ type: 'player_passed', playerId });
    }

    if (this.allReady()) {
      this.closePlaying();
    }
  }

  private passPlayer(playerId: string): void {
    assertCondition(this.phase === 'playing', 'REJECTED', 'Nothing to pass right now');
    assertCondition(playerId !== this.conductorId, 'REJECTED', 'The Maquinista does not play cards');
    if (!this.passed.has(playerId)) {
      this.passed.add(playerId);
      this.emit({ type: 'player_passed', playerId });
    }
    if (this.allReady()) {
      this.closePlaying();
    }
  }

  private castVerdict(playerId: string, killedTrack: DilemaTrack): void {
    assertCondition(this.phase === 'verdict', 'REJECTED', 'Not the moment for a verdict');
    assertCondition(playerId === this.conductorId, 'REJECTED', 'Only the Maquinista pulls the lever');
    this.killedTrack = killedTrack;
    this.closeVerdict(false);
  }

  // ─── Round flow ───

  private beginRound(round: number): void {
    this.round = round;
    this.phase = 'assigning';
    this.trackCards = { left: [], right: [] };
    this.hands.clear();
    this.cardsPlayed.clear();
    this.passed.clear();
    this.cardSeq = 0;
    this.killedTrack = null;
    this.sparedTrack = null;
    this.verdictWasAuto = false;
    this.standings = [];
    for (const p of this.players) this.roundDelta.set(p.id, 0);

    const plan = planRound(this.players, round - 1, this.random);
    this.conductorId = plan.conductorId;
    this.leftIds = plan.left;
    this.rightIds = plan.right;

    // Seed one innocent per track.
    this.trackCards.left.push(this.seedCard(this.drawInnocent()));
    this.trackCards.right.push(this.seedCard(this.drawInnocent()));

    // Deal a hand to every non-Maquinista.
    for (const p of this.players) {
      if (p.id === this.conductorId) continue;
      this.hands.set(p.id, this.dealHand());
      this.cardsPlayed.set(p.id, 0);
    }

    this.setTimer(ASSIGNING_MS);
    this.emit({ type: 'round_started', round, totalRounds: this.totalRounds, conductorId: this.conductorId });
    this.emit({
      type: 'assignments_made',
      round,
      conductorId: this.conductorId,
      leftIds: [...this.leftIds],
      rightIds: [...this.rightIds],
    });
  }

  private beginPlaying(): void {
    if (this.phase !== 'assigning') return;
    this.phase = 'playing';
    this.setTimer(PLAYING_MS);
    this.emit({ type: 'playing_started', round: this.round, durationMs: PLAYING_MS });
    // A degenerate round (nobody able to act) shouldn't hang.
    if (this.allReady()) {
      this.closePlaying();
    }
  }

  private closePlaying(): void {
    if (this.phase !== 'playing') return;
    this.phase = 'verdict';
    this.setTimer(VERDICT_MS);
    this.emit({ type: 'all_cards_in', round: this.round });
    this.emit({
      type: 'verdict_started',
      round: this.round,
      conductorId: this.conductorId ?? '',
      durationMs: VERDICT_MS,
    });
  }

  private closeVerdict(auto: boolean): void {
    if (this.phase !== 'verdict') return;
    if (auto || this.killedTrack === null) {
      this.killedTrack = this.random() < 0.5 ? 'left' : 'right';
      this.verdictWasAuto = true;
    } else {
      this.verdictWasAuto = false;
    }
    this.sparedTrack = this.killedTrack === 'left' ? 'right' : 'left';

    const sparedMembers = this.sparedTrack === 'left' ? this.leftIds : this.rightIds;
    for (const id of sparedMembers) {
      this.spared.set(id, (this.spared.get(id) ?? 0) + 1);
      this.roundDelta.set(id, 1);
    }

    this.phase = 'roundResults';
    this.standings = this.computeStandings();
    this.setTimer(RESULTS_MS);
    this.emit({
      type: 'verdict_cast',
      round: this.round,
      conductorId: this.conductorId ?? '',
      killedTrack: this.killedTrack,
      auto: this.verdictWasAuto,
    });
    this.emit({
      type: 'round_finished',
      round: this.round,
      killedTrack: this.killedTrack,
      sparedTrack: this.sparedTrack,
      standings: this.standings,
    });
  }

  private enterGameover(): void {
    this.phase = 'gameover';
    this.clearTimer();
    this.standings = this.computeStandings();
    this.winnerId = this.standings[0]?.playerId ?? null;
    this.emit({ type: 'game_finished', winnerId: this.winnerId ?? '', standings: this.standings });
  }

  // ─── Helpers ───

  private reshuffleDecks(): void {
    this.innocentDeck = this.shuffled(this.cardSource.innocents.map((c) => c.text));
    this.guiltyDeck = this.shuffled(this.cardSource.guilty.map((c) => c.text));
    this.modifierDeck = this.shuffled(this.cardSource.modifiers.map((c) => c.text));
  }

  private drawInnocent(): string {
    if (this.innocentDeck.length === 0) {
      this.innocentDeck = this.shuffled(this.cardSource.innocents.map((c) => c.text));
    }
    return this.innocentDeck.pop() ?? 'alguém que estava só de passagem';
  }

  private drawFrom(type: 'innocent' | 'guilty' | 'modifier'): string {
    if (type === 'innocent') return this.drawInnocent();
    if (type === 'guilty') {
      if (this.guiltyDeck.length === 0) {
        this.guiltyDeck = this.shuffled(this.cardSource.guilty.map((c) => c.text));
      }
      return this.guiltyDeck.pop() ?? 'alguém que claramente mereceu';
    }
    if (this.modifierDeck.length === 0) {
      this.modifierDeck = this.shuffled(this.cardSource.modifiers.map((c) => c.text));
    }
    return this.modifierDeck.pop() ?? '…e um deles é você';
  }

  private seedCard(text: string): InternalCard {
    return { id: `c${this.cardSeq++}`, type: 'innocent', text, authorId: null, attachedTo: null };
  }

  private dealHand(): DilemaHandCard[] {
    const plan: ('innocent' | 'guilty' | 'modifier')[] = [
      ...Array<'innocent'>(HAND_INNOCENTS).fill('innocent'),
      ...Array<'guilty'>(HAND_GUILTY).fill('guilty'),
      ...Array<'modifier'>(HAND_MODIFIERS).fill('modifier'),
    ];
    while (plan.length < HAND_SIZE) {
      const roll = this.random();
      plan.push(roll < 0.45 ? 'innocent' : roll < 0.9 ? 'guilty' : 'modifier');
    }
    const hand: DilemaHandCard[] = plan
      .slice(0, HAND_SIZE)
      .map((type, i) => ({ id: `h${i}`, type, text: this.drawFrom(type) }));
    this.shuffleInPlace(hand);
    // Re-key after the shuffle so ids stay stable + unique for this hand.
    return hand.map((c, i) => ({ ...c, id: `h${i}` }));
  }

  private shuffled<T>(source: readonly T[]): T[] {
    const arr = [...source];
    this.shuffleInPlace(arr);
    return arr;
  }

  private shuffleInPlace<T>(arr: T[]): void {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(this.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
  }

  private trackOf(playerId: string): DilemaTrack | null {
    if (this.leftIds.includes(playerId)) return 'left';
    if (this.rightIds.includes(playerId)) return 'right';
    return null;
  }

  private nonConductorConnectedIds(): string[] {
    return this.players
      .filter((p) => p.id !== this.conductorId && (this.connected.get(p.id) ?? true))
      .map((p) => p.id);
  }

  private allReady(): boolean {
    const expected = this.nonConductorConnectedIds();
    if (expected.length === 0) return true;
    return expected.every((id) => this.passed.has(id) || (this.hands.get(id)?.length ?? 0) === 0);
  }

  private computeStandings(): DilemaStanding[] {
    return this.players
      .map((p) => ({
        playerId: p.id,
        name: p.name,
        spared: this.spared.get(p.id) ?? 0,
        roundDelta: this.roundDelta.get(p.id) ?? 0,
      }))
      .sort((a, b) => b.spared - a.spared || a.name.localeCompare(b.name));
  }

  // ─── Events ───

  private emit(event: DilemaGameEvent): void {
    this.events.push(event);
  }

  consumeEvents(): DilemaGameEvent[] {
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

  private projectPhase(): DilemaPhase {
    return this.paused ? 'paused' : this.phase;
  }

  private projectTrackCard(card: InternalCard): DilemaTrackCard {
    return {
      id: card.id,
      type: card.type,
      text: card.text,
      authorId: card.authorId,
      authorName: card.authorId ? (this.nameById.get(card.authorId) ?? '—') : null,
      attachedTo: card.attachedTo,
      modifiers: [],
    };
  }

  private projectTrack(side: DilemaTrack): DilemaTrackView {
    const memberIds = side === 'left' ? this.leftIds : this.rightIds;
    const all = this.trackCards[side];
    const modsByBase = new Map<string, DilemaTrackCard[]>();
    for (const c of all) {
      if (c.type === 'modifier' && c.attachedTo) {
        const list = modsByBase.get(c.attachedTo) ?? [];
        list.push(this.projectTrackCard(c));
        modsByBase.set(c.attachedTo, list);
      }
    }
    const cards = all
      .filter((c) => c.type !== 'modifier')
      .map((c) => {
        const view = this.projectTrackCard(c);
        view.modifiers = modsByBase.get(c.id) ?? [];
        return view;
      });
    return {
      side,
      label: TRACK_LABEL[side],
      memberIds: [...memberIds],
      memberNames: memberIds.map((id) => this.nameById.get(id) ?? '—'),
      cards,
    };
  }

  getPublicState(): DilemaPublicState {
    const inResults = this.phase === 'roundResults' || this.phase === 'gameover';
    const expected = this.phase === 'playing' ? this.nonConductorConnectedIds() : [];
    const ready = expected.filter(
      (id) => this.passed.has(id) || (this.hands.get(id)?.length ?? 0) === 0,
    ).length;

    return {
      phase: this.projectPhase(),
      roomCode: this.roomCode,
      round: this.round,
      totalRounds: this.totalRounds,
      conductorId: this.conductorId,
      conductorName: this.conductorId ? (this.nameById.get(this.conductorId) ?? '—') : null,
      tracks: { left: this.projectTrack('left'), right: this.projectTrack('right') },
      playersReadyCount: ready,
      playersExpectedCount: expected.length,
      killedTrack: inResults ? this.killedTrack : null,
      sparedTrack: inResults ? this.sparedTrack : null,
      verdictWasAuto: inResults ? this.verdictWasAuto : false,
      players: this.players.map((p) => ({
        id: p.id,
        name: p.name,
        connected: this.connected.get(p.id) ?? true,
        spared: this.spared.get(p.id) ?? 0,
      })),
      standings: inResults ? this.standings : [],
      timer: this.getTimer(),
      winnerId: this.phase === 'gameover' ? this.winnerId : null,
    };
  }

  getPrivateState(playerId: string): DilemaPrivateState {
    const inGame = this.nameById.has(playerId);
    const isConductor = playerId === this.conductorId;
    const myTrack = isConductor ? null : this.trackOf(playerId);
    const handVisible = !isConductor && (this.phase === 'assigning' || this.phase === 'playing');
    const hand = handVisible ? (this.hands.get(playerId) ?? []) : [];
    const passed = this.passed.has(playerId) || (this.hands.get(playerId)?.length ?? 0) === 0;

    let pendingDecision: DilemaPrivateState['pendingDecision'] = null;
    if (inGame && !this.paused) {
      if (this.phase === 'playing' && !isConductor) {
        pendingDecision = passed ? 'wait' : 'play';
      } else if (this.phase === 'verdict') {
        pendingDecision = isConductor ? 'decide' : 'wait';
      } else if (this.phase === 'assigning' || this.phase === 'roundResults') {
        pendingDecision = 'wait';
      }
    }

    return {
      playerId,
      isConductor,
      myTrack,
      pendingDecision,
      hand: hand.map((c) => ({ id: c.id, type: c.type, text: c.text })),
      cardsPlayed: this.cardsPlayed.get(playerId) ?? 0,
      passed: !isConductor && this.phase === 'playing' ? passed : false,
    };
  }
}
