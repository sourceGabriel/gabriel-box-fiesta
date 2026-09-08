import type {
  ContentTier,
  GameStatus as PlatformGameStatus,
  LorotaGameEvent,
  LorotaOption,
  LorotaPhase,
  LorotaPrivateState,
  LorotaPublicState,
  LorotaRoundKind,
  LorotaStanding,
  TurnTimer,
} from '@party/shared';
import type { GameContext, PausableGame, TurnTimedGame } from '../../core/game-plugin';
import { parseLorotaAction } from './action-schema';
import {
  FINAL_ROUND_MULTIPLIER,
  FOOL_POINTS,
  GUESSING_MS,
  LYING_MS,
  MAX_LIE_LEN,
  MAX_PLAYERS,
  MIN_PLAYERS,
  REVEAL_MS,
  TOTAL_ROUNDS,
  TRUTH_POINTS,
} from './constants';
import { lorotaQuestions, type LorotaQuestion } from './questions';

function assertCondition(condition: unknown, code: string, message: string): asserts condition {
  if (!condition) {
    throw new Error(`${code}:${message}`);
  }
}

/**
 * Loose match so a lie that's really the truth (or two identical lies) collapse
 * together — ignores casing, surrounding space, trailing punctuation and accents.
 */
function normalize(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // strip combining accents
    .replace(/[.!?]+$/, '');
}

type Player = { id: string; name: string };

/** One option under construction — engine-internal (authors always known). */
type InternalOption = {
  id: string;
  text: string;
  isTruth: boolean;
  authorIds: string[];
};

/**
 * Lorota! orchestrator — the platform `GameInstance` for a Fibbage-inspired
 * bluffing-trivia match. Self-advancing: every phase (`lying` → `guessing` →
 * `reveal`) carries one stored deadline the platform server ticks;
 * `onTurnTimeout()` closes the phase with whatever is in. 3 rounds; the last
 * ("Lorota Final") pays double.
 */
export class LorotaGame implements PausableGame, TurnTimedGame {
  private readonly now: () => number;
  private readonly random: () => number;
  private readonly contentTier: ContentTier | undefined;
  private readonly roomCode: string;
  private readonly players: Player[];
  private readonly nameById = new Map<string, string>();
  private readonly connected = new Map<string, boolean>();
  private readonly score = new Map<string, number>();
  private readonly roundPoints = new Map<string, number>();

  private started = false;
  private phase: LorotaPhase = 'lying';
  private round = 0;
  private roundKind: LorotaRoundKind = 'normal';

  private deck: LorotaQuestion[] = [];
  private question: LorotaQuestion | null = null;

  /** playerId → their submitted lie text. */
  private lies = new Map<string, string>();
  /** Players whose last attempt was the truth — they must try again. */
  private truthCollision = new Set<string>();
  /** The round's options (built at the end of `lying`). */
  private options: InternalOption[] = [];
  /** playerId → chosen option id. */
  private guesses = new Map<string, string>();

  private standings: LorotaStanding[] = [];
  private winnerId: string | null = null;

  // Single wall-clock deadline, ticked by the server against `getTimer().expiresAt`.
  private timerStartedAt: number | null = null;
  private timerDurationMs: number | null = null;
  private timerExpiresAt: number | null = null;
  private paused = false;
  private pausedRemainingMs: number | null = null;

  private readonly events: LorotaGameEvent[] = [];

  constructor(ctx: GameContext) {
    this.now = ctx.now;
    this.random = ctx.random;
    this.contentTier = ctx.contentTier;
    this.roomCode = ctx.roomCode;
    this.players = ctx.players.map((p) => ({ id: p.id, name: p.name }));
    for (const p of this.players) {
      this.nameById.set(p.id, p.name);
      this.connected.set(p.id, true);
      this.score.set(p.id, 0);
      this.roundPoints.set(p.id, 0);
    }
  }

  // ─── Lifecycle ───

  start(): void {
    assertCondition(
      this.players.length >= MIN_PLAYERS && this.players.length <= MAX_PLAYERS,
      'INVALID_PLAYER_COUNT',
      `Lorota requires ${MIN_PLAYERS}-${MAX_PLAYERS} players`,
    );
    this.started = true;
    this.deck = this.shuffled(lorotaQuestions(this.contentTier));
    this.emit({ type: 'game_started', totalRounds: TOTAL_ROUNDS });
    this.beginRound(1);
  }

  setPlayerConnected(playerId: string, connected: boolean): void {
    if (this.connected.has(playerId)) {
      this.connected.set(playerId, connected);
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
      durationMs: this.timerDurationMs ?? LYING_MS,
      serverNow: now,
      remainingMs: Math.max(0, this.timerExpiresAt - now),
    };
  }

  onTurnTimeout(): void {
    if (this.paused) return;
    switch (this.phase) {
      case 'lying':
        this.closeLying();
        break;
      case 'guessing':
        this.closeGuessing();
        break;
      case 'reveal':
        if (this.round < TOTAL_ROUNDS) {
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
    const input = parseLorotaAction(action);
    if (input.type === 'submitLie') {
      this.submitLie(playerId, input.text);
    } else {
      this.submitGuess(playerId, input.optionId);
    }
  }

  private submitLie(playerId: string, rawText: string): void {
    assertCondition(this.phase === 'lying', 'REJECTED', 'Not accepting lies right now');
    const text = rawText.trim().slice(0, MAX_LIE_LEN);
    assertCondition(text.length > 0, 'REJECTED', 'Lie cannot be empty');

    const truths = this.question ? [this.question.answer, ...(this.question.alt ?? [])] : [];
    if (truths.some((t) => normalize(t) === normalize(text))) {
      // They stumbled onto the real answer — flag it (no error toast) and wait for another try.
      this.truthCollision.add(playerId);
      return;
    }

    this.truthCollision.delete(playerId);
    this.lies.set(playerId, text);
    this.emit({ type: 'lie_submitted', playerId });

    if (this.allLiesIn()) {
      this.closeLying();
    }
  }

  private submitGuess(playerId: string, optionId: string): void {
    assertCondition(this.phase === 'guessing', 'REJECTED', 'Not accepting guesses right now');
    const option = this.options.find((o) => o.id === optionId);
    assertCondition(option != null, 'REJECTED', 'No such option');
    assertCondition(!option.authorIds.includes(playerId), 'REJECTED', 'You cannot pick your own lie');
    assertCondition(!this.guesses.has(playerId), 'REJECTED', 'You already guessed');

    this.guesses.set(playerId, optionId);
    this.emit({ type: 'guess_submitted', playerId });

    if (this.allGuessesIn()) {
      this.closeGuessing();
    }
  }

  // ─── Round flow ───

  private beginRound(round: number): void {
    this.round = round;
    this.roundKind = round === TOTAL_ROUNDS ? 'final' : 'normal';
    this.phase = 'lying';
    this.lies.clear();
    this.truthCollision.clear();
    this.guesses.clear();
    this.options = [];
    this.standings = [];
    for (const p of this.players) this.roundPoints.set(p.id, 0);

    this.question = this.drawQuestion();

    this.setTimer(LYING_MS);
    this.emit({ type: 'round_started', round, totalRounds: TOTAL_ROUNDS, roundKind: this.roundKind });
    this.emit({ type: 'lying_started', round, durationMs: LYING_MS });
  }

  private closeLying(): void {
    if (this.phase !== 'lying') return;

    // Collapse identical lies into one option credited to every author.
    const byKey = new Map<string, InternalOption>();
    for (const [playerId, text] of this.lies) {
      const key = normalize(text);
      const truths = this.question ? [this.question.answer, ...(this.question.alt ?? [])] : [];
      if (truths.some((t) => normalize(t) === key)) continue; // paranoia — rejected on submit
      const existing = byKey.get(key);
      if (existing) {
        existing.authorIds.push(playerId);
      } else {
        byKey.set(key, { id: '', text, isTruth: false, authorIds: [playerId] });
      }
    }

    const built = [...byKey.values()];
    built.push({ id: '', text: this.question?.answer ?? '???', isTruth: true, authorIds: [] });
    this.shuffleInPlace(built);
    built.forEach((o, i) => (o.id = `o${i}`));
    this.options = built;

    this.phase = 'guessing';
    this.setTimer(GUESSING_MS);
    this.emit({ type: 'all_lies_in', round: this.round });
    this.emit({ type: 'guessing_started', round: this.round, optionCount: this.options.length, durationMs: GUESSING_MS });

    if (this.allGuessesIn()) {
      this.closeGuessing();
    }
  }

  private closeGuessing(): void {
    if (this.phase !== 'guessing') return;

    const mult = this.roundKind === 'final' ? FINAL_ROUND_MULTIPLIER : 1;
    for (const [playerId, optionId] of this.guesses) {
      const option = this.options.find((o) => o.id === optionId);
      if (!option) continue;
      if (option.isTruth) {
        this.addPoints(playerId, TRUTH_POINTS * mult);
      } else {
        for (const authorId of option.authorIds) {
          this.addPoints(authorId, FOOL_POINTS * mult);
        }
      }
    }

    this.phase = 'reveal';
    this.standings = this.computeStandings();
    this.setTimer(REVEAL_MS);
    this.emit({ type: 'reveal_started', round: this.round });
    this.emit({ type: 'round_finished', round: this.round, standings: this.standings });
  }

  private enterGameover(): void {
    this.phase = 'gameover';
    this.clearTimer();
    this.standings = this.computeStandings();
    this.winnerId = this.standings[0]?.playerId ?? null;
    this.emit({ type: 'game_finished', winnerId: this.winnerId ?? '', standings: this.standings });
  }

  // ─── Helpers ───

  private drawQuestion(): LorotaQuestion {
    if (this.deck.length === 0) {
      this.deck = this.shuffled(lorotaQuestions(this.contentTier));
    }
    return this.deck.pop()!;
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

  private addPoints(playerId: string, points: number): void {
    this.score.set(playerId, (this.score.get(playerId) ?? 0) + points);
    this.roundPoints.set(playerId, (this.roundPoints.get(playerId) ?? 0) + points);
  }

  private computeStandings(): LorotaStanding[] {
    return this.players
      .map((p) => ({
        playerId: p.id,
        name: p.name,
        score: this.score.get(p.id) ?? 0,
        roundPoints: this.roundPoints.get(p.id) ?? 0,
      }))
      .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
  }

  private connectedPlayerIds(): string[] {
    return this.players.filter((p) => this.connected.get(p.id) ?? true).map((p) => p.id);
  }

  private allLiesIn(): boolean {
    const expected = this.connectedPlayerIds();
    return expected.length > 0 && expected.every((id) => this.lies.has(id));
  }

  private eligibleGuesserIds(): string[] {
    // Everyone connected who has at least one option that isn't their own lie (always true with 3+ players).
    return this.connectedPlayerIds().filter((id) => this.options.some((o) => !o.authorIds.includes(id)));
  }

  private allGuessesIn(): boolean {
    const expected = this.eligibleGuesserIds();
    return expected.length > 0 && expected.every((id) => this.guesses.has(id));
  }

  // ─── Events ───

  private emit(event: LorotaGameEvent): void {
    this.events.push(event);
  }

  consumeEvents(): LorotaGameEvent[] {
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

  private projectPhase(): LorotaPhase {
    return this.paused ? 'paused' : this.phase;
  }

  private projectOptions(revealed: boolean): LorotaOption[] {
    const pickedByOption = new Map<string, { playerId: string; name: string }[]>();
    if (revealed) {
      for (const [playerId, optionId] of this.guesses) {
        const list = pickedByOption.get(optionId) ?? [];
        list.push({ playerId, name: this.nameById.get(playerId) ?? '—' });
        pickedByOption.set(optionId, list);
      }
    }
    return this.options.map((o) => ({
      id: o.id,
      text: o.text,
      isTruth: revealed ? o.isTruth : null,
      authorIds: revealed ? [...o.authorIds] : null,
      authorNames: revealed ? o.authorIds.map((id) => this.nameById.get(id) ?? '—') : null,
      pickedBy: revealed ? (pickedByOption.get(o.id) ?? []) : null,
    }));
  }

  getPublicState(): LorotaPublicState {
    const inReveal = this.phase === 'reveal' || this.phase === 'gameover';
    const showOptions = this.phase === 'guessing' || inReveal;

    let guessesExpectedCount = 0;
    if (this.phase === 'guessing') guessesExpectedCount = this.eligibleGuesserIds().length;

    return {
      phase: this.projectPhase(),
      roomCode: this.roomCode,
      round: this.round,
      totalRounds: TOTAL_ROUNDS,
      roundKind: this.roundKind,
      players: this.players.map((p) => ({
        id: p.id,
        name: p.name,
        connected: this.connected.get(p.id) ?? true,
        score: this.score.get(p.id) ?? 0,
      })),
      prompt: this.question?.text ?? null,
      liesInCount: this.phase === 'lying' ? this.lies.size : 0,
      liesExpectedCount: this.phase === 'lying' ? this.connectedPlayerIds().length : 0,
      options: showOptions ? this.projectOptions(inReveal) : [],
      guessesInCount: this.phase === 'guessing' ? this.guesses.size : 0,
      guessesExpectedCount,
      standings: inReveal ? this.standings : [],
      truthText: inReveal ? (this.question?.answer ?? null) : null,
      timer: this.getTimer(),
      winnerId: this.phase === 'gameover' ? this.winnerId : null,
    };
  }

  getPrivateState(playerId: string): LorotaPrivateState {
    const inGame = this.nameById.has(playerId);
    const myLie = this.lies.get(playerId) ?? null;

    const guessOptions =
      this.phase === 'guessing'
        ? this.options
            .filter((o) => !o.authorIds.includes(playerId))
            .map((o) => ({ id: o.id, text: o.text }))
        : [];
    const myGuessId = this.guesses.get(playerId) ?? null;

    let pendingDecision: LorotaPrivateState['pendingDecision'] = null;
    if (inGame && !this.paused) {
      if (this.phase === 'lying') {
        pendingDecision = myLie ? 'wait' : 'lie';
      } else if (this.phase === 'guessing') {
        pendingDecision = myGuessId ? 'wait' : 'guess';
      }
    }

    let foundTruth = false;
    if (this.phase === 'reveal' || this.phase === 'gameover') {
      const picked = this.options.find((o) => o.id === myGuessId);
      foundTruth = !!picked?.isTruth;
    }

    return {
      playerId,
      pendingDecision,
      myLie: this.phase === 'lying' ? myLie : null,
      lieWasTheTruth: this.truthCollision.has(playerId),
      guessOptions,
      myGuessId,
      foundTruth,
    };
  }
}
