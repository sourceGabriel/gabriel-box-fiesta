import type {
  ContentTier,
  GameStatus as PlatformGameStatus,
  TurnTimer,
  ZapBallot,
  ZapDuel,
  ZapDuelResult,
  ZapGameEvent,
  ZapPhase,
  ZapPrivateState,
  ZapPublicState,
  ZapRoundKind,
  ZapStanding,
} from '@party/shared';
import type { GameContext, PausableGame, TurnTimedGame } from '../../core/game-plugin';
import { parseZapAction } from './action-schema';
import {
  ANSWER_MS,
  BLANK_ANSWER,
  FINAL_ROUND_MULTIPLIER,
  MAX_ANSWER_LEN,
  MAX_PLAYERS,
  MIN_PLAYERS,
  POINTS_PER_VOTE,
  ROUND_RESULTS_MS,
  SWEEP_BONUS,
  TOTAL_ROUNDS,
  VOTE_MS,
} from './constants';
import { planFinalRound, planNormalRound, type Assignment, type RoundPlan } from './pairing';
import { zapPrompts } from './prompts';

function assertCondition(condition: unknown, code: string, message: string): asserts condition {
  if (!condition) {
    throw new Error(`${code}:${message}`);
  }
}

type Player = { id: string; name: string };

/** One competing answer inside a duel (engine-internal — `playerId` always known). */
type DuelEntry = {
  playerId: string;
  /** Slot within the duel (0-based, post-shuffle). */
  slot: number;
  text: string;
  isBlank: boolean;
};

type InternalDuel = {
  index: number;
  prompt: string;
  entries: DuelEntry[];
  result: ZapDuelResult | null;
};

/**
 * Zap! orchestrator — the platform `GameInstance` for a Quiplash-inspired match.
 * Self-advancing: every phase (`answering` → `voting` → `roundResults`) carries a
 * single stored deadline the platform server ticks; `onTurnTimeout()` closes the
 * phase with whatever is in, so the owner never has to nudge it along. 3 rounds;
 * the last ("Última Chance") is one shared prompt worth triple.
 */
export class ZapGame implements PausableGame, TurnTimedGame {
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
  private phase: ZapPhase = 'answering';
  private readonly totalRounds: number;
  private round = 0;
  private roundKind: ZapRoundKind = 'normal';

  private deck: string[] = [];
  /** The current round's plan (assignments + which answers meet in a duel). */
  private roundPlan: RoundPlan | null = null;
  /** Assignments for the current round, by player. */
  private assignments = new Map<string, Assignment[]>();
  /** Submitted answers, keyed `${playerId}#${slot}`. */
  private answers = new Map<string, string>();
  /** The single shared prompt on a final round (for `activePrompt`). */
  private finalPrompt: string | null = null;

  private duels: InternalDuel[] = [];
  private currentDuelIndex = 0;
  /** duelIndex → (voterId → chosen slot). */
  private votes = new Map<number, Map<string, number>>();

  private standings: ZapStanding[] = [];
  private winnerId: string | null = null;

  // Single wall-clock deadline, ticked by the server against `getTimer().expiresAt`.
  private timerStartedAt: number | null = null;
  private timerDurationMs: number | null = null;
  private timerExpiresAt: number | null = null;
  private paused = false;
  private pausedRemainingMs: number | null = null;

  private readonly events: ZapGameEvent[] = [];

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
      this.score.set(p.id, 0);
      this.roundPoints.set(p.id, 0);
    }
  }

  // ─── Lifecycle ───

  start(): void {
    assertCondition(
      this.players.length >= MIN_PLAYERS && this.players.length <= MAX_PLAYERS,
      'INVALID_PLAYER_COUNT',
      `Zap requires ${MIN_PLAYERS}-${MAX_PLAYERS} players`,
    );
    this.started = true;
    this.deck = this.shuffled(zapPrompts(this.contentTier));
    this.emit({ type: 'game_started', totalRounds: this.totalRounds });
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
      durationMs: this.timerDurationMs ?? ANSWER_MS,
      serverNow: now,
      remainingMs: Math.max(0, this.timerExpiresAt - now),
    };
  }

  onTurnTimeout(): void {
    if (this.paused) return;
    switch (this.phase) {
      case 'answering':
        this.closeAnswering();
        break;
      case 'voting':
        this.closeCurrentDuel();
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
    const input = parseZapAction(action);

    if (input.type === 'submitAnswer') {
      this.submitAnswer(playerId, input.slot, input.text);
    } else {
      this.castVote(playerId, input.duelIndex, input.slot);
    }
  }

  private submitAnswer(playerId: string, slot: number, rawText: string): void {
    assertCondition(this.phase === 'answering', 'REJECTED', 'Not accepting answers right now');
    const own = this.assignments.get(playerId) ?? [];
    assertCondition(
      own.some((a) => a.slot === slot),
      'REJECTED',
      'No such prompt to answer',
    );
    const text = rawText.trim().slice(0, MAX_ANSWER_LEN);
    assertCondition(text.length > 0, 'REJECTED', 'Answer cannot be empty');

    this.answers.set(this.answerKey(playerId, slot), text);
    this.emit({ type: 'answer_submitted', playerId, slot });

    if (this.allAnswersIn()) {
      this.closeAnswering();
    }
  }

  private castVote(playerId: string, duelIndex: number, slot: number): void {
    assertCondition(this.phase === 'voting', 'REJECTED', 'Not accepting votes right now');
    assertCondition(duelIndex === this.currentDuelIndex, 'REJECTED', 'That duel is not open for voting');
    const duel = this.duels[this.currentDuelIndex];
    assertCondition(duel != null, 'REJECTED', 'No duel is open');
    assertCondition(this.isEligibleVoter(playerId, duel), 'REJECTED', 'You cannot vote in this duel');

    const forDuel = this.votes.get(duelIndex) ?? new Map<string, number>();
    assertCondition(!forDuel.has(playerId), 'REJECTED', 'You already voted in this duel');

    const entry = duel.entries.find((e) => e.slot === slot);
    assertCondition(entry != null, 'REJECTED', 'No such answer');
    assertCondition(entry.playerId !== playerId, 'REJECTED', 'You cannot vote for your own answer');

    forDuel.set(playerId, slot);
    this.votes.set(duelIndex, forDuel);
    this.emit({ type: 'vote_cast', playerId, duelIndex });

    if (this.allVotesIn(duel)) {
      this.closeCurrentDuel();
    }
  }

  // ─── Round flow ───

  private beginRound(round: number): void {
    this.round = round;
    this.roundKind = round === this.totalRounds ? 'final' : 'normal';
    this.phase = 'answering';
    this.answers.clear();
    this.votes.clear();
    this.duels = [];
    this.currentDuelIndex = 0;
    this.standings = [];
    for (const p of this.players) this.roundPoints.set(p.id, 0);

    const seatIds = this.players.map((p) => p.id);
    if (this.roundKind === 'final') {
      this.finalPrompt = this.drawPrompts(1)[0];
      this.roundPlan = planFinalRound(seatIds, this.finalPrompt);
    } else {
      this.finalPrompt = null;
      this.roundPlan = planNormalRound(seatIds, this.drawPrompts(seatIds.length));
    }
    this.assignments = this.roundPlan.assignments;

    this.setTimer(ANSWER_MS);
    this.emit({ type: 'round_started', round, totalRounds: this.totalRounds, roundKind: this.roundKind });
    this.emit({ type: 'answering_started', round, durationMs: ANSWER_MS });
  }

  private closeAnswering(): void {
    if (this.phase !== 'answering') return;

    // Fill blanks for anything not submitted.
    for (const [playerId, list] of this.assignments) {
      for (const a of list) {
        const key = this.answerKey(playerId, a.slot);
        if (!this.answers.has(key)) this.answers.set(key, BLANK_ANSWER);
      }
    }

    const plan = this.roundPlan;
    if (!plan) {
      this.enterRoundResults();
      return;
    }

    const built: InternalDuel[] = [];
    for (const dp of plan.duels) {
      const entries: DuelEntry[] = dp.contestants.map((c) => {
        const text = this.answers.get(this.answerKey(c.playerId, c.slot)) ?? BLANK_ANSWER;
        return { playerId: c.playerId, slot: 0, text, isBlank: text === BLANK_ANSWER };
      });
      // Drop a duel nobody can meaningfully vote on.
      if (entries.every((e) => e.isBlank)) continue;
      this.shuffleInPlace(entries);
      entries.forEach((e, i) => (e.slot = i));
      built.push({ index: built.length, prompt: dp.prompt, entries, result: null });
    }

    this.duels = built;
    this.emit({ type: 'all_answers_in', round: this.round });

    if (this.duels.length === 0) {
      this.enterRoundResults();
      return;
    }
    this.startDuel(0);
  }

  private startDuel(index: number): void {
    this.currentDuelIndex = index;
    this.phase = 'voting';
    this.setTimer(VOTE_MS);
    const duel = this.duels[index];
    this.emit({ type: 'duel_started', round: this.round, duelIndex: index, prompt: duel.prompt, durationMs: VOTE_MS });

    // Degenerate case (mid-round dropouts): nobody left to vote → close at once.
    if (this.allVotesIn(duel)) {
      this.closeCurrentDuel();
    }
  }

  private closeCurrentDuel(): void {
    if (this.phase !== 'voting') return;
    const duel = this.duels[this.currentDuelIndex];
    if (!duel) return;

    const forDuel = this.votes.get(duel.index) ?? new Map<string, number>();
    const tally = duel.entries.map(() => 0);
    for (const slot of forDuel.values()) {
      if (slot >= 0 && slot < tally.length) tally[slot] += 1;
    }

    const totalVotes = tally.reduce((s, n) => s + n, 0);
    const max = Math.max(...tally);
    const leaders = tally.filter((n) => n === max).length;
    const winnerSlot = totalVotes > 0 && leaders === 1 ? tally.indexOf(max) : null;
    const zap =
      winnerSlot !== null &&
      duel.entries.length === 2 &&
      tally[winnerSlot] === totalVotes &&
      totalVotes > 0;

    const mult = this.roundKind === 'final' ? FINAL_ROUND_MULTIPLIER : 1;
    const pointsAwarded = duel.entries.map((entry, i) => {
      let points = tally[i] * POINTS_PER_VOTE * mult;
      if (zap && i === winnerSlot) points += SWEEP_BONUS * mult;
      if (points !== 0) this.addPoints(entry.playerId, points);
      return { playerId: entry.playerId, points, votes: tally[i] };
    });

    duel.result = { votes: tally, winnerSlot, zap, pointsAwarded };
    this.emit({ type: 'duel_revealed', round: this.round, duelIndex: duel.index, votes: tally, winnerSlot, zap });

    if (this.currentDuelIndex + 1 < this.duels.length) {
      this.startDuel(this.currentDuelIndex + 1);
    } else {
      this.enterRoundResults();
    }
  }

  private enterRoundResults(): void {
    this.phase = 'roundResults';
    this.standings = this.computeStandings();
    this.setTimer(ROUND_RESULTS_MS);
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

  private answerKey(playerId: string, slot: number): string {
    return `${playerId}#${slot}`;
  }

  private drawPrompts(n: number): string[] {
    if (this.deck.length < n) {
      this.deck = this.shuffled(zapPrompts(this.contentTier));
    }
    return this.deck.splice(0, n);
  }

  private shuffled(source: readonly string[]): string[] {
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

  private computeStandings(): ZapStanding[] {
    return this.players
      .map((p) => ({
        playerId: p.id,
        name: p.name,
        score: this.score.get(p.id) ?? 0,
        roundPoints: this.roundPoints.get(p.id) ?? 0,
      }))
      .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
  }

  private isContestant(playerId: string, duel: InternalDuel): boolean {
    return duel.entries.some((e) => e.playerId === playerId);
  }

  private isEligibleVoter(playerId: string, duel: InternalDuel): boolean {
    if (!this.nameById.has(playerId)) return false;
    // Final round: everyone votes (except for their own answer, enforced on the slot).
    if (this.roundKind === 'final') return true;
    // Normal round: contestants in this duel do not vote in it.
    return !this.isContestant(playerId, duel);
  }

  private votableSlotsFor(playerId: string, duel: InternalDuel): number[] {
    return duel.entries.filter((e) => e.playerId !== playerId).map((e) => e.slot);
  }

  private expectedVotersFor(duel: InternalDuel): number {
    return this.players.filter(
      (p) => (this.connected.get(p.id) ?? true) && this.isEligibleVoter(p.id, duel),
    ).length;
  }

  private allVotesIn(duel: InternalDuel): boolean {
    const expected = this.expectedVotersFor(duel);
    const have = this.votes.get(duel.index)?.size ?? 0;
    return have >= expected;
  }

  private expectedAnswers(): number {
    let expected = 0;
    for (const [playerId, list] of this.assignments) {
      if (this.connected.get(playerId) ?? true) expected += list.length;
    }
    return expected;
  }

  private haveAnswers(): number {
    let have = 0;
    for (const [playerId, list] of this.assignments) {
      if (!(this.connected.get(playerId) ?? true)) continue;
      for (const a of list) {
        if (this.answers.has(this.answerKey(playerId, a.slot))) have += 1;
      }
    }
    return have;
  }

  private allAnswersIn(): boolean {
    return this.haveAnswers() >= this.expectedAnswers() && this.expectedAnswers() > 0;
  }

  // ─── Events ───

  private emit(event: ZapGameEvent): void {
    this.events.push(event);
  }

  consumeEvents(): ZapGameEvent[] {
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

  private projectPhase(): ZapPhase {
    return this.paused ? 'paused' : this.phase;
  }

  private projectDuel(duel: InternalDuel): ZapDuel {
    const revealed = duel.result !== null;
    return {
      index: duel.index,
      prompt: duel.prompt,
      answers: duel.entries.map((e) => ({
        slot: e.slot,
        text: e.text,
        authorId: revealed ? e.playerId : null,
        authorName: revealed ? (this.nameById.get(e.playerId) ?? null) : null,
        isBlank: e.isBlank,
      })),
      result: duel.result,
    };
  }

  getPublicState(): ZapPublicState {
    const inResults = this.phase === 'roundResults' || this.phase === 'gameover';
    const visibleDuels =
      this.phase === 'voting'
        ? this.duels.slice(0, this.currentDuelIndex + 1)
        : inResults
          ? this.duels
          : [];

    let votesInCount = 0;
    let votesExpectedCount = 0;
    if (this.phase === 'voting') {
      const duel = this.duels[this.currentDuelIndex];
      if (duel) {
        votesInCount = this.votes.get(duel.index)?.size ?? 0;
        votesExpectedCount = this.expectedVotersFor(duel);
      }
    }

    return {
      phase: this.projectPhase(),
      roomCode: this.roomCode,
      round: this.round,
      totalRounds: this.totalRounds,
      roundKind: this.roundKind,
      players: this.players.map((p) => ({
        id: p.id,
        name: p.name,
        connected: this.connected.get(p.id) ?? true,
        score: this.score.get(p.id) ?? 0,
      })),
      activePrompt: this.phase === 'answering' && this.roundKind === 'final' ? this.finalPrompt : null,
      answersInCount: this.phase === 'answering' ? this.haveAnswers() : 0,
      answersExpectedCount: this.phase === 'answering' ? this.expectedAnswers() : 0,
      duels: visibleDuels.map((d) => this.projectDuel(d)),
      currentDuelIndex: this.currentDuelIndex,
      votesInCount,
      votesExpectedCount,
      standings: inResults ? this.standings : [],
      timer: this.getTimer(),
      winnerId: this.phase === 'gameover' ? this.winnerId : null,
    };
  }

  getPrivateState(playerId: string): ZapPrivateState {
    const inGame = this.nameById.has(playerId);
    const assignments = this.assignments.get(playerId) ?? [];

    const projectedAssignments =
      this.phase === 'answering'
        ? assignments.map((a) => ({
            slot: a.slot,
            prompt: a.prompt,
            answer: this.answers.get(this.answerKey(playerId, a.slot)) ?? null,
          }))
        : [];
    const submittedAll =
      assignments.length > 0 &&
      assignments.every((a) => this.answers.has(this.answerKey(playerId, a.slot)));

    let ballot: ZapBallot | null = null;
    if (this.phase === 'voting' && inGame && !this.paused) {
      const duel = this.duels[this.currentDuelIndex];
      if (duel && this.isEligibleVoter(playerId, duel)) {
        const options = this.votableSlotsFor(playerId, duel).map((slot) => ({
          slot,
          text: duel.entries.find((e) => e.slot === slot)?.text ?? '',
        }));
        if (options.length > 0) {
          ballot = {
            duelIndex: duel.index,
            prompt: duel.prompt,
            options,
            votedSlot: this.votes.get(duel.index)?.get(playerId) ?? null,
          };
        }
      }
    }

    let pendingDecision: ZapPrivateState['pendingDecision'] = null;
    if (inGame && !this.paused) {
      if (this.phase === 'answering') {
        pendingDecision = submittedAll ? 'wait' : 'answer';
      } else if (this.phase === 'voting') {
        pendingDecision = ballot && ballot.votedSlot === null ? 'vote' : 'wait';
      }
    }

    return { playerId, pendingDecision, assignments: projectedAssignments, submittedAll, ballot };
  }
}
