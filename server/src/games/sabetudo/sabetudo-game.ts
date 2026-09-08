import type {
  GameStatus as PlatformGameStatus,
  SabeTudoGameEvent,
  SabeTudoOptionResult,
  SabeTudoPhase,
  SabeTudoPrivateState,
  SabeTudoPublicState,
  SabeTudoStanding,
  TurnTimer,
} from '@party/shared';
import type { GameContext, PausableGame, TurnTimedGame } from '../../core/game-plugin';
import { parseSabeTudoAction } from './action-schema';
import {
  CORRECT_POINTS,
  MAX_PLAYERS,
  MIN_PLAYERS,
  OPTION_COUNT,
  QUESTION_MS,
  REVEAL_MS,
  SPEED_BONUS_MAX,
  STREAK_MAX_STEPS,
  STREAK_STEP,
  TOTAL_ROUNDS,
} from './constants';
import { SABETUDO_QUESTIONS, type SabeTudoQuestion } from './questions';

function assertCondition(condition: unknown, code: string, message: string): asserts condition {
  if (!condition) {
    throw new Error(`${code}:${message}`);
  }
}

type Player = { id: string; name: string };

/** The current question with its options already shuffled for this match. */
type ActiveQuestion = {
  text: string;
  category: string;
  options: string[];
  correctIndex: number;
};

/**
 * Sabe-Tudo orchestrator — the platform `GameInstance` for a fast multiple-choice
 * trivia match. Self-advancing: every phase (`question` → `reveal`) carries one
 * stored deadline the platform server ticks; `onTurnTimeout()` closes the phase
 * with whatever answers are in. A match is `TOTAL_ROUNDS` questions.
 */
export class SabeTudoGame implements PausableGame, TurnTimedGame {
  private readonly now: () => number;
  private readonly random: () => number;
  private readonly roomCode: string;
  private readonly players: Player[];
  private readonly nameById = new Map<string, string>();
  private readonly connected = new Map<string, boolean>();
  private readonly score = new Map<string, number>();
  private readonly roundPoints = new Map<string, number>();
  private readonly streak = new Map<string, number>();

  private started = false;
  private phase: SabeTudoPhase = 'question';
  private round = 0;

  private deck: SabeTudoQuestion[] = [];
  private active: ActiveQuestion | null = null;
  private questionStartedAt = 0;

  /** playerId → { optionIndex, at } for the current question. */
  private answers = new Map<string, { optionIndex: number; at: number }>();

  private standings: SabeTudoStanding[] = [];
  private winnerId: string | null = null;

  // Single wall-clock deadline, ticked by the server against `getTimer().expiresAt`.
  private timerStartedAt: number | null = null;
  private timerDurationMs: number | null = null;
  private timerExpiresAt: number | null = null;
  private paused = false;
  private pausedRemainingMs: number | null = null;

  private readonly events: SabeTudoGameEvent[] = [];

  constructor(ctx: GameContext) {
    this.now = ctx.now;
    this.random = ctx.random;
    this.roomCode = ctx.roomCode;
    this.players = ctx.players.map((p) => ({ id: p.id, name: p.name }));
    for (const p of this.players) {
      this.nameById.set(p.id, p.name);
      this.connected.set(p.id, true);
      this.score.set(p.id, 0);
      this.roundPoints.set(p.id, 0);
      this.streak.set(p.id, 0);
    }
  }

  // ─── Lifecycle ───

  start(): void {
    assertCondition(
      this.players.length >= MIN_PLAYERS && this.players.length <= MAX_PLAYERS,
      'INVALID_PLAYER_COUNT',
      `Sabe-Tudo requires ${MIN_PLAYERS}-${MAX_PLAYERS} players`,
    );
    this.started = true;
    this.deck = this.shuffled(SABETUDO_QUESTIONS);
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
      // Keep the speed bonus fair: treat the question as if it had just (re)started.
      if (this.phase === 'question') this.questionStartedAt = now;
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
      durationMs: this.timerDurationMs ?? QUESTION_MS,
      serverNow: now,
      remainingMs: Math.max(0, this.timerExpiresAt - now),
    };
  }

  onTurnTimeout(): void {
    if (this.paused) return;
    switch (this.phase) {
      case 'question':
        this.closeQuestion();
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
    const input = parseSabeTudoAction(action);
    this.submitAnswer(playerId, input.optionIndex);
  }

  private submitAnswer(playerId: string, optionIndex: number): void {
    assertCondition(this.phase === 'question', 'REJECTED', 'Not accepting answers right now');
    assertCondition(optionIndex >= 0 && optionIndex < OPTION_COUNT, 'REJECTED', 'Option out of range');
    assertCondition(!this.answers.has(playerId), 'REJECTED', 'You already answered');

    this.answers.set(playerId, { optionIndex, at: this.now() });
    this.emit({ type: 'answer_submitted', playerId });

    if (this.allAnswersIn()) {
      this.closeQuestion();
    }
  }

  // ─── Round flow ───

  private beginRound(round: number): void {
    this.round = round;
    this.phase = 'question';
    this.answers.clear();
    this.standings = [];
    for (const p of this.players) this.roundPoints.set(p.id, 0);

    this.active = this.drawQuestion();
    this.questionStartedAt = this.now();
    this.setTimer(QUESTION_MS);
    this.emit({
      type: 'question_started',
      round,
      totalRounds: TOTAL_ROUNDS,
      category: this.active.category,
      durationMs: QUESTION_MS,
    });
  }

  private closeQuestion(): void {
    if (this.phase !== 'question' || !this.active) return;
    const correctIndex = this.active.correctIndex;

    for (const p of this.players) {
      const answer = this.answers.get(p.id);
      if (answer && answer.optionIndex === correctIndex) {
        const newStreak = (this.streak.get(p.id) ?? 0) + 1;
        this.streak.set(p.id, newStreak);
        const elapsed = Math.max(0, answer.at - this.questionStartedAt);
        const speedFraction = Math.max(0, Math.min(1, 1 - elapsed / QUESTION_MS));
        const speedBonus = Math.round(SPEED_BONUS_MAX * speedFraction);
        const streakBonus = Math.min(newStreak - 1, STREAK_MAX_STEPS) * STREAK_STEP;
        this.addPoints(p.id, CORRECT_POINTS + speedBonus + streakBonus);
      } else {
        this.streak.set(p.id, 0);
      }
    }

    this.phase = 'reveal';
    this.standings = this.computeStandings();
    this.setTimer(REVEAL_MS);
    this.emit({ type: 'reveal_started', round: this.round, correctIndex });
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

  private drawQuestion(): ActiveQuestion {
    if (this.deck.length === 0) {
      this.deck = this.shuffled(SABETUDO_QUESTIONS);
    }
    const q = this.deck.pop()!;
    const indices = this.shuffled([...q.options.keys()]);
    return {
      text: q.text,
      category: q.category,
      options: indices.map((i) => q.options[i]),
      correctIndex: indices.indexOf(q.correct),
    };
  }

  private shuffled<T>(source: readonly T[]): T[] {
    const arr = [...source];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(this.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  private addPoints(playerId: string, points: number): void {
    this.score.set(playerId, (this.score.get(playerId) ?? 0) + points);
    this.roundPoints.set(playerId, (this.roundPoints.get(playerId) ?? 0) + points);
  }

  private computeStandings(): SabeTudoStanding[] {
    return this.players
      .map((p) => ({
        playerId: p.id,
        name: p.name,
        score: this.score.get(p.id) ?? 0,
        roundPoints: this.roundPoints.get(p.id) ?? 0,
        streak: this.streak.get(p.id) ?? 0,
      }))
      .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
  }

  private connectedPlayerIds(): string[] {
    return this.players.filter((p) => this.connected.get(p.id) ?? true).map((p) => p.id);
  }

  private allAnswersIn(): boolean {
    const expected = this.connectedPlayerIds();
    return expected.length > 0 && expected.every((id) => this.answers.has(id));
  }

  // ─── Events ───

  private emit(event: SabeTudoGameEvent): void {
    this.events.push(event);
  }

  consumeEvents(): SabeTudoGameEvent[] {
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

  private projectPhase(): SabeTudoPhase {
    return this.paused ? 'paused' : this.phase;
  }

  private projectOptionResults(): SabeTudoOptionResult[] | null {
    if (!this.active || (this.phase !== 'reveal' && this.phase !== 'gameover')) return null;
    const results: SabeTudoOptionResult[] = this.active.options.map((_, index) => ({
      index,
      correct: index === this.active!.correctIndex,
      count: 0,
      pickedBy: [] as { playerId: string; name: string }[],
    }));
    for (const [playerId, answer] of this.answers) {
      const r = results[answer.optionIndex];
      if (!r) continue;
      r.count += 1;
      r.pickedBy.push({ playerId, name: this.nameById.get(playerId) ?? '—' });
    }
    return results;
  }

  getPublicState(): SabeTudoPublicState {
    const inReveal = this.phase === 'reveal' || this.phase === 'gameover';
    const showQuestion = this.phase === 'question' || inReveal;

    return {
      phase: this.projectPhase(),
      roomCode: this.roomCode,
      round: this.round,
      totalRounds: TOTAL_ROUNDS,
      players: this.players.map((p) => ({
        id: p.id,
        name: p.name,
        connected: this.connected.get(p.id) ?? true,
        score: this.score.get(p.id) ?? 0,
      })),
      category: showQuestion ? (this.active?.category ?? null) : null,
      question: showQuestion ? (this.active?.text ?? null) : null,
      options: showQuestion ? (this.active?.options ?? []) : [],
      answersInCount: this.phase === 'question' ? this.answers.size : 0,
      answersExpectedCount: this.phase === 'question' ? this.connectedPlayerIds().length : 0,
      correctIndex: inReveal ? (this.active?.correctIndex ?? null) : null,
      optionResults: this.projectOptionResults(),
      standings: inReveal ? this.standings : [],
      timer: this.getTimer(),
      winnerId: this.phase === 'gameover' ? this.winnerId : null,
    };
  }

  getPrivateState(playerId: string): SabeTudoPrivateState {
    const inGame = this.nameById.has(playerId);
    const answer = this.answers.get(playerId) ?? null;

    let pendingDecision: SabeTudoPrivateState['pendingDecision'] = null;
    if (inGame && !this.paused && this.phase === 'question') {
      pendingDecision = answer ? 'wait' : 'answer';
    }

    let lastAnswerCorrect: boolean | null = null;
    if ((this.phase === 'reveal' || this.phase === 'gameover') && this.active) {
      lastAnswerCorrect = answer ? answer.optionIndex === this.active.correctIndex : null;
    }

    return {
      playerId,
      pendingDecision,
      myAnswerIndex: answer ? answer.optionIndex : null,
      lastAnswerCorrect,
      streak: this.streak.get(playerId) ?? 0,
    };
  }
}
