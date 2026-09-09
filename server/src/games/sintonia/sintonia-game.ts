import type {
  ContentTier,
  GameStatus as PlatformGameStatus,
  SintoniaGameEvent,
  SintoniaGuess,
  SintoniaPhase,
  SintoniaPrivateState,
  SintoniaPublicState,
  SintoniaResult,
  SintoniaRole,
  SintoniaStanding,
  TurnTimer,
} from '@party/shared';
import type { GameContext, PausableGame, TurnTimedGame } from '../../core/game-plugin';
import { parseSintoniaAction } from './action-schema';
import {
  BANDS,
  CLUE_MAX,
  CLUING_MS,
  DIAL_START,
  GUESSING_MS,
  MAX_PLAYERS,
  MIN_PLAYERS,
  REVEAL_MS,
  TARGET_MAX,
  TARGET_MIN,
  TOTAL_ROUNDS,
} from './constants';
import { planRound } from './pairing';
import { sintoniaSpectrums, type Spectrum } from './spectrums';

function assertCondition(condition: unknown, code: string, message: string): asserts condition {
  if (!condition) {
    throw new Error(`${code}:${message}`);
  }
}

type Player = { id: string; name: string };

const clamp = (n: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, n));

const pointsFor = (distance: number): number => BANDS.find(([d]) => distance <= d)?.[1] ?? 0;

/**
 * Sintonia orchestrator — the platform `GameInstance` for a *Wavelength*-style
 * telepathy match. Self-advancing: every phase (`cluing` → `guessing` →
 * `reveal`) carries one stored deadline the platform server ticks;
 * `onTurnTimeout()` closes the phase with whatever is in.
 *
 * No teams: a rotating **médium** gives the clue, **every other player** places
 * their own dial, and each guesser scores by how close they landed. The médium
 * scores the rounded-down average of the guessers (a reward for a good clue).
 * Score is individual + cumulative; the game crowns the highest total.
 */
export class SintoniaGame implements PausableGame, TurnTimedGame {
  private readonly now: () => number;
  private readonly random: () => number;
  private readonly contentTier: ContentTier | undefined;
  private readonly roomCode: string;
  private readonly players: Player[];
  private readonly nameById = new Map<string, string>();
  private readonly connected = new Map<string, boolean>();
  private readonly scores = new Map<string, number>();
  private readonly roundDelta = new Map<string, number>();

  private started = false;
  private phase: SintoniaPhase = 'cluing';
  private readonly totalRounds: number;
  private round = 0;

  private spectrumPool: Spectrum[] = [];
  private spectrumDeck: Spectrum[] = [];

  // Per-round state.
  private mediumId: string | null = null;
  private spectrum: Spectrum = ['', ''];
  private target = 0;
  private clue: string | null = null;
  private readonly guesses = new Map<string, number>();
  private readonly locked = new Set<string>();

  // Round result, populated at `reveal`.
  private results: SintoniaResult[] = [];
  private mediumPoints: number | null = null;
  private roundSkipped = false;

  private winnerId: string | null = null;

  private timerStartedAt: number | null = null;
  private timerDurationMs: number | null = null;
  private timerExpiresAt: number | null = null;
  private paused = false;
  private pausedRemainingMs: number | null = null;

  private readonly events: SintoniaGameEvent[] = [];

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
      this.scores.set(p.id, 0);
      this.roundDelta.set(p.id, 0);
    }
  }

  // ─── Lifecycle ───

  start(): void {
    assertCondition(
      this.players.length >= MIN_PLAYERS && this.players.length <= MAX_PLAYERS,
      'INVALID_PLAYER_COUNT',
      `Sintonia requires ${MIN_PLAYERS}-${MAX_PLAYERS} players`,
    );
    this.started = true;
    this.spectrumPool = sintoniaSpectrums(this.contentTier);
    this.reshuffleSpectrums();
    this.emit({ type: 'game_started', totalRounds: this.totalRounds });
    this.beginRound(1);
  }

  setPlayerConnected(playerId: string, connected: boolean): void {
    if (!this.connected.has(playerId)) return;
    this.connected.set(playerId, connected);
    if (connected) return;
    if (this.phase === 'guessing' && this.allLocked()) {
      this.closeGuessing();
    } else if (this.phase === 'cluing' && playerId === this.mediumId && this.clue === null) {
      // The médium's phone dropped — don't make the room wait out the backstop.
      this.roundSkipped = true;
      this.emit({ type: 'clue_skipped', round: this.round });
      this.enterReveal();
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
    this.pausedRemainingMs =
      this.timerExpiresAt !== null ? Math.max(0, this.timerExpiresAt - now) : null;
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
      durationMs: this.timerDurationMs ?? GUESSING_MS,
      serverNow: now,
      remainingMs: Math.max(0, this.timerExpiresAt - now),
    };
  }

  onTurnTimeout(): void {
    if (this.paused) return;
    switch (this.phase) {
      case 'cluing':
        this.roundSkipped = true;
        this.emit({ type: 'clue_skipped', round: this.round });
        this.enterReveal();
        break;
      case 'guessing':
        this.closeGuessing();
        break;
      case 'reveal':
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
    const input = parseSintoniaAction(action);
    if (input.type === 'submitClue') {
      this.submitClue(playerId, input.clue);
    } else if (input.type === 'setGuess') {
      this.setGuess(playerId, input.value);
    } else if (input.type === 'lockGuess') {
      this.lockGuess(playerId);
    } else {
      this.unlockGuess(playerId);
    }
  }

  private submitClue(playerId: string, raw: string): void {
    assertCondition(this.phase === 'cluing', 'REJECTED', 'Não é hora de dar dica');
    assertCondition(playerId === this.mediumId, 'REJECTED', 'Só o médium dá a dica');
    assertCondition(this.clue === null, 'REJECTED', 'A dica já foi dada');
    const clue = raw.trim().replace(/\s+/g, ' ');
    assertCondition(clue.length > 0, 'REJECTED', 'A dica não pode ser vazia');
    assertCondition(clue.length <= CLUE_MAX, 'REJECTED', `A dica tem que caber em ${CLUE_MAX} caracteres`);
    assertCondition(!/[0-9]/.test(clue), 'REJECTED', 'Sem números na dica');
    this.clue = clue;
    this.emit({ type: 'clue_given', round: this.round, mediumId: playerId });
    this.beginGuessing();
  }

  private setGuess(playerId: string, value: number): void {
    assertCondition(this.isGuesser(playerId), 'REJECTED', 'O médium não tem dial');
    // The controller drips the slider ~8×/s; a tick can land just after the phase
    // flips or the player locks. Those are benign races — ignore, don't toast.
    if (this.phase !== 'guessing' || this.locked.has(playerId)) return;
    this.guesses.set(playerId, clamp(Math.round(value), 0, 100));
  }

  private lockGuess(playerId: string): void {
    assertCondition(this.phase === 'guessing', 'REJECTED', 'Não é hora de travar');
    assertCondition(this.isGuesser(playerId), 'REJECTED', 'O médium não palpita');
    if (this.locked.has(playerId)) return;
    if (!this.guesses.has(playerId)) this.guesses.set(playerId, DIAL_START);
    this.locked.add(playerId);
    this.emit({ type: 'guess_locked', round: this.round, playerId });
    if (this.allLocked()) this.closeGuessing();
  }

  private unlockGuess(playerId: string): void {
    if (this.phase !== 'guessing') return;
    this.locked.delete(playerId);
  }

  // ─── Round flow ───

  private beginRound(round: number): void {
    this.round = round;
    this.phase = 'cluing';
    const plan = planRound(this.players, round - 1, this.random);
    this.mediumId = plan.mediumId;
    this.spectrum = this.drawSpectrum();
    this.target = TARGET_MIN + Math.floor(this.random() * (TARGET_MAX - TARGET_MIN + 1));
    this.clue = null;
    this.guesses.clear();
    this.locked.clear();
    this.results = [];
    this.mediumPoints = null;
    this.roundSkipped = false;
    for (const p of this.players) this.roundDelta.set(p.id, 0);

    this.setTimer(CLUING_MS);
    this.emit({
      type: 'round_started',
      round,
      totalRounds: this.totalRounds,
      mediumId: this.mediumId,
    });
  }

  private beginGuessing(): void {
    if (this.phase !== 'cluing') return;
    this.phase = 'guessing';
    this.setTimer(GUESSING_MS);
    this.emit({ type: 'guessing_started', round: this.round, durationMs: GUESSING_MS });
    if (this.allLocked()) this.closeGuessing();
  }

  private closeGuessing(): void {
    if (this.phase !== 'guessing') return;
    this.enterReveal();
  }

  private enterReveal(): void {
    this.phase = 'reveal';

    if (this.roundSkipped) {
      this.results = [];
      this.mediumPoints = 0;
    } else {
      // Score a guesser who locked, or is still connected (left the dial where it
      // sat). A guesser who disconnected without ever locking is left out — no
      // phantom 50 dragging the médium's average.
      const guessers = this.players.filter(
        (p) =>
          p.id !== this.mediumId &&
          (this.locked.has(p.id) || (this.connected.get(p.id) ?? true)),
      );
      this.results = guessers
        .map((p) => {
          const value = this.guesses.get(p.id) ?? DIAL_START;
          const distance = Math.abs(value - this.target);
          const points = pointsFor(distance);
          return { playerId: p.id, name: p.name, value, distance, points };
        })
        .sort((a, b) => b.points - a.points || a.distance - b.distance || a.name.localeCompare(b.name));

      for (const r of this.results) {
        this.scores.set(r.playerId, (this.scores.get(r.playerId) ?? 0) + r.points);
        this.roundDelta.set(r.playerId, r.points);
      }

      const avg =
        this.results.length > 0
          ? Math.floor(this.results.reduce((n, r) => n + r.points, 0) / this.results.length)
          : 0;
      this.mediumPoints = avg;
      if (this.mediumId) {
        this.scores.set(this.mediumId, (this.scores.get(this.mediumId) ?? 0) + avg);
        this.roundDelta.set(this.mediumId, avg);
      }
    }

    const best = this.results[0] ?? null;
    this.setTimer(REVEAL_MS);
    this.emit({
      type: 'round_revealed',
      round: this.round,
      target: this.target,
      bestPlayerId: best && best.points > 0 ? best.playerId : null,
      bestPoints: best?.points ?? 0,
    });
    this.emit({ type: 'round_finished', round: this.round, standings: this.computeStandings() });
  }

  private enterGameover(): void {
    this.phase = 'gameover';
    this.clearTimer();
    const standings = this.computeStandings();
    const top = standings[0];
    const tie = top && standings.filter((s) => s.score === top.score).length > 1;
    this.winnerId = top && !tie ? top.playerId : null;
    this.emit({
      type: 'game_finished',
      winnerId: this.winnerId,
      standings,
    });
  }

  // ─── Helpers ───

  private reshuffleSpectrums(): void {
    this.spectrumDeck = this.shuffled(this.spectrumPool);
  }

  private drawSpectrum(): Spectrum {
    if (this.spectrumDeck.length === 0) {
      this.reshuffleSpectrums();
    }
    return this.spectrumDeck.pop() ?? ['Chato', 'Divertido'];
  }

  private shuffled<T>(source: readonly T[]): T[] {
    const arr = [...source];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(this.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  private isGuesser(playerId: string): boolean {
    return this.nameById.has(playerId) && playerId !== this.mediumId;
  }

  private guesserIds(): string[] {
    return this.players.filter((p) => p.id !== this.mediumId).map((p) => p.id);
  }

  private connectedGuesserIds(): string[] {
    return this.guesserIds().filter((id) => this.connected.get(id) ?? true);
  }

  private allLocked(): boolean {
    const expected = this.connectedGuesserIds();
    if (expected.length === 0) return true;
    return expected.every((id) => this.locked.has(id));
  }

  private computeStandings(): SintoniaStanding[] {
    return this.players
      .map((p) => ({
        playerId: p.id,
        name: p.name,
        score: this.scores.get(p.id) ?? 0,
        roundDelta: this.roundDelta.get(p.id) ?? 0,
      }))
      .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
  }

  // ─── Events ───

  private emit(event: SintoniaGameEvent): void {
    this.events.push(event);
  }

  consumeEvents(): SintoniaGameEvent[] {
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

  private projectPhase(): SintoniaPhase {
    return this.paused ? 'paused' : this.phase;
  }

  private projectGuesses(inReveal: boolean): SintoniaGuess[] {
    return this.players
      .filter((p) => p.id !== this.mediumId)
      .map((p) => ({
        playerId: p.id,
        name: p.name,
        value: inReveal ? (this.guesses.get(p.id) ?? DIAL_START) : null,
        locked: this.locked.has(p.id),
      }));
  }

  getPublicState(): SintoniaPublicState {
    const inReveal = this.phase === 'reveal' || this.phase === 'gameover';
    // Progress is measured against the players the round is actually waiting on
    // (connected guessers) — matches the auto-advance condition.
    const pendingIds = this.connectedGuesserIds();
    return {
      phase: this.projectPhase(),
      roomCode: this.roomCode,
      round: this.round,
      totalRounds: this.totalRounds,
      mediumId: this.mediumId,
      mediumName: this.mediumId ? (this.nameById.get(this.mediumId) ?? '—') : null,
      spectrum: [this.spectrum[0], this.spectrum[1]],
      clue: this.phase === 'guessing' || inReveal ? this.clue : null,
      guesses: this.projectGuesses(inReveal),
      guessersLockedCount: pendingIds.filter((id) => this.locked.has(id)).length,
      guessersTotalCount: pendingIds.length,
      target: inReveal ? this.target : null,
      results: inReveal ? this.results : [],
      mediumPoints: inReveal ? this.mediumPoints : null,
      roundSkipped: inReveal ? this.roundSkipped : false,
      players: this.players.map((p) => ({
        id: p.id,
        name: p.name,
        connected: this.connected.get(p.id) ?? true,
        score: this.scores.get(p.id) ?? 0,
      })),
      standings: this.computeStandings(),
      timer: this.getTimer(),
      winnerId: this.phase === 'gameover' ? this.winnerId : null,
      winnerName:
        this.phase === 'gameover' && this.winnerId ? (this.nameById.get(this.winnerId) ?? null) : null,
    };
  }

  getPrivateState(playerId: string): SintoniaPrivateState {
    const isMedium = playerId === this.mediumId;
    let role: SintoniaRole = 'idle';
    if (!this.paused && this.phase !== 'reveal' && this.phase !== 'gameover') {
      if (isMedium) role = 'medium';
      else if (this.phase === 'guessing') role = 'guesser';
    }

    const seesTarget = isMedium && (this.phase === 'cluing' || this.phase === 'guessing');
    const myGuess = this.guesses.get(playerId) ?? null;
    const myLocked = this.locked.has(playerId);

    let done = false;
    if (this.phase === 'cluing' && isMedium) done = this.clue !== null;
    else if (this.phase === 'guessing' && !isMedium) done = myLocked;

    return {
      playerId,
      role,
      isMedium,
      target: seesTarget ? this.target : null,
      clue: this.phase === 'guessing' || this.phase === 'reveal' ? this.clue : null,
      myGuess,
      myLocked,
      done,
    };
  }
}
