import type {
  FdpAnswer,
  FdpGameEvent,
  FdpPhase,
  FdpPrivateState,
  FdpPublicState,
  FdpRoundKind,
  FdpStanding,
  GameStatus as PlatformGameStatus,
  TurnTimer,
} from '@party/shared';
import type { GameContext, PausableGame, TurnTimedGame } from '../../core/game-plugin';
import { parseFdpAction } from './action-schema';
import {
  FINAL_ROUND_MULTIPLIER,
  MAX_ANSWER_LEN,
  MAX_PLAYERS,
  MIN_PLAYERS,
  RESULTS_MS,
  SWEEP_BONUS,
  TOTAL_ROUNDS,
  VOTE_POINTS,
  VOTING_MS,
  WRITING_MS,
} from './constants';
import { FDP_PROMPTS } from './prompts';

function assertCondition(condition: unknown, code: string, message: string): asserts condition {
  if (!condition) {
    throw new Error(`${code}:${message}`);
  }
}

type Player = { id: string; name: string };

/** One answer under construction — engine-internal (author always known). */
type InternalAnswer = {
  id: string;
  text: string;
  authorId: string;
};

/**
 * FDP — Foi De Propósito orchestrator — the platform `GameInstance` for a
 * Cards-Against-Humanity-style match. Self-advancing: every phase (`writing` →
 * `voting` → `roundResults`) carries one stored deadline the platform server
 * ticks; `onTurnTimeout()` closes the phase with whatever is in. 5 rounds; the
 * last ("Final FDP") pays double.
 */
export class FdpGame implements PausableGame, TurnTimedGame {
  private readonly now: () => number;
  private readonly random: () => number;
  private readonly roomCode: string;
  private readonly players: Player[];
  private readonly nameById = new Map<string, string>();
  private readonly connected = new Map<string, boolean>();
  private readonly score = new Map<string, number>();
  private readonly roundPoints = new Map<string, number>();

  private started = false;
  private phase: FdpPhase = 'writing';
  private round = 0;
  private roundKind: FdpRoundKind = 'normal';

  private deck: string[] = [];
  private prompt: string | null = null;

  /** playerId → their submitted answer text. */
  private submissions = new Map<string, string>();
  /** The round's answers (built at the end of `writing`). */
  private answers: InternalAnswer[] = [];
  /** playerId → chosen answer id. */
  private votes = new Map<string, string>();

  private standings: FdpStanding[] = [];
  private roundWinnerId: string | null = null;
  private winnerId: string | null = null;

  // Single wall-clock deadline, ticked by the server against `getTimer().expiresAt`.
  private timerStartedAt: number | null = null;
  private timerDurationMs: number | null = null;
  private timerExpiresAt: number | null = null;
  private paused = false;
  private pausedRemainingMs: number | null = null;

  private readonly events: FdpGameEvent[] = [];

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
    }
  }

  // ─── Lifecycle ───

  start(): void {
    assertCondition(
      this.players.length >= MIN_PLAYERS && this.players.length <= MAX_PLAYERS,
      'INVALID_PLAYER_COUNT',
      `FDP requires ${MIN_PLAYERS}-${MAX_PLAYERS} players`,
    );
    this.started = true;
    this.deck = this.shuffled(FDP_PROMPTS);
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
      durationMs: this.timerDurationMs ?? WRITING_MS,
      serverNow: now,
      remainingMs: Math.max(0, this.timerExpiresAt - now),
    };
  }

  onTurnTimeout(): void {
    if (this.paused) return;
    switch (this.phase) {
      case 'writing':
        this.closeWriting();
        break;
      case 'voting':
        this.closeVoting();
        break;
      case 'roundResults':
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
    const input = parseFdpAction(action);
    if (input.type === 'submitAnswer') {
      this.submitAnswer(playerId, input.text);
    } else {
      this.castVote(playerId, input.answerId);
    }
  }

  private submitAnswer(playerId: string, rawText: string): void {
    assertCondition(this.phase === 'writing', 'REJECTED', 'Not accepting answers right now');
    const text = rawText.trim().slice(0, MAX_ANSWER_LEN);
    assertCondition(text.length > 0, 'REJECTED', 'Answer cannot be empty');

    const isFirst = !this.submissions.has(playerId);
    this.submissions.set(playerId, text);
    if (isFirst) this.emit({ type: 'answer_submitted', playerId });

    if (this.allAnswersIn()) {
      this.closeWriting();
    }
  }

  private castVote(playerId: string, answerId: string): void {
    assertCondition(this.phase === 'voting', 'REJECTED', 'Not accepting votes right now');
    const answer = this.answers.find((a) => a.id === answerId);
    assertCondition(answer != null, 'REJECTED', 'No such answer');
    assertCondition(answer.authorId !== playerId, 'REJECTED', 'You cannot vote for your own answer');
    assertCondition(!this.votes.has(playerId), 'REJECTED', 'You already voted');

    this.votes.set(playerId, answerId);
    this.emit({ type: 'vote_cast', playerId });

    if (this.allVotesIn()) {
      this.closeVoting();
    }
  }

  // ─── Round flow ───

  private beginRound(round: number): void {
    this.round = round;
    this.roundKind = round === TOTAL_ROUNDS ? 'final' : 'normal';
    this.phase = 'writing';
    this.submissions.clear();
    this.votes.clear();
    this.answers = [];
    this.standings = [];
    this.roundWinnerId = null;
    for (const p of this.players) this.roundPoints.set(p.id, 0);

    this.prompt = this.drawPrompt();

    this.setTimer(WRITING_MS);
    this.emit({ type: 'round_started', round, totalRounds: TOTAL_ROUNDS, roundKind: this.roundKind });
    this.emit({ type: 'writing_started', round, durationMs: WRITING_MS });
  }

  private closeWriting(): void {
    if (this.phase !== 'writing') return;

    const built: InternalAnswer[] = [];
    for (const [playerId, text] of this.submissions) {
      built.push({ id: '', text, authorId: playerId });
    }
    this.shuffleInPlace(built);
    built.forEach((a, i) => (a.id = `a${i}`));
    this.answers = built;

    if (this.answers.length === 0) {
      // Nobody wrote anything — skip the vote entirely.
      this.enterResults();
      return;
    }

    this.phase = 'voting';
    this.setTimer(VOTING_MS);
    this.emit({ type: 'all_answers_in', round: this.round });
    this.emit({ type: 'voting_started', round: this.round, answerCount: this.answers.length, durationMs: VOTING_MS });

    if (this.allVotesIn()) {
      this.closeVoting();
    }
  }

  private closeVoting(): void {
    if (this.phase !== 'voting') return;

    const mult = this.roundKind === 'final' ? FINAL_ROUND_MULTIPLIER : 1;
    const tally = new Map<string, number>();
    for (const answerId of this.votes.values()) {
      tally.set(answerId, (tally.get(answerId) ?? 0) + 1);
    }

    let bestVotes = 0;
    let bestCount = 0;
    let bestAuthor: string | null = null;
    for (const answer of this.answers) {
      const v = tally.get(answer.id) ?? 0;
      if (v > 0) {
        this.addPoints(answer.authorId, v * VOTE_POINTS * mult);
      }
      // Sweep: every eligible voter (connected, not the author) picked this one.
      const eligible = this.connectedPlayerIds().filter((id) => id !== answer.authorId).length;
      if (v > 0 && eligible > 0 && v === eligible) {
        this.addPoints(answer.authorId, SWEEP_BONUS * mult);
      }
      if (v > bestVotes) {
        bestVotes = v;
        bestCount = 1;
        bestAuthor = answer.authorId;
      } else if (v === bestVotes && v > 0) {
        bestCount += 1;
      }
    }
    this.roundWinnerId = bestVotes > 0 && bestCount === 1 ? bestAuthor : null;

    this.enterResults();
  }

  private enterResults(): void {
    this.phase = 'roundResults';
    this.standings = this.computeStandings();
    this.setTimer(RESULTS_MS);
    this.emit({ type: 'results_started', round: this.round });
    this.emit({ type: 'round_finished', round: this.round, winnerId: this.roundWinnerId, standings: this.standings });
  }

  private enterGameover(): void {
    this.phase = 'gameover';
    this.clearTimer();
    this.standings = this.computeStandings();
    this.winnerId = this.standings[0]?.playerId ?? null;
    this.emit({ type: 'game_finished', winnerId: this.winnerId ?? '', standings: this.standings });
  }

  // ─── Helpers ───

  private drawPrompt(): string {
    if (this.deck.length === 0) {
      this.deck = this.shuffled(FDP_PROMPTS);
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

  private computeStandings(): FdpStanding[] {
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

  private allAnswersIn(): boolean {
    const expected = this.connectedPlayerIds();
    return expected.length > 0 && expected.every((id) => this.submissions.has(id));
  }

  private eligibleVoterIds(): string[] {
    // Everyone connected who has at least one answer that isn't their own.
    return this.connectedPlayerIds().filter((id) => this.answers.some((a) => a.authorId !== id));
  }

  private allVotesIn(): boolean {
    const expected = this.eligibleVoterIds();
    return expected.length > 0 && expected.every((id) => this.votes.has(id));
  }

  // ─── Events ───

  private emit(event: FdpGameEvent): void {
    this.events.push(event);
  }

  consumeEvents(): FdpGameEvent[] {
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

  private projectPhase(): FdpPhase {
    return this.paused ? 'paused' : this.phase;
  }

  private projectAnswers(revealed: boolean): FdpAnswer[] {
    const votersByAnswer = new Map<string, string[]>();
    const countByAnswer = new Map<string, number>();
    if (revealed) {
      for (const [playerId, answerId] of this.votes) {
        const list = votersByAnswer.get(answerId) ?? [];
        list.push(this.nameById.get(playerId) ?? '—');
        votersByAnswer.set(answerId, list);
        countByAnswer.set(answerId, (countByAnswer.get(answerId) ?? 0) + 1);
      }
    }
    return this.answers.map((a) => {
      const votes = revealed ? (countByAnswer.get(a.id) ?? 0) : null;
      const eligible = this.connectedPlayerIds().filter((id) => id !== a.authorId).length;
      return {
        id: a.id,
        text: a.text,
        authorId: revealed ? a.authorId : null,
        authorName: revealed ? (this.nameById.get(a.authorId) ?? '—') : null,
        votes,
        voterNames: revealed ? (votersByAnswer.get(a.id) ?? []) : null,
        isRoundWinner: revealed && this.roundWinnerId != null && a.authorId === this.roundWinnerId,
        sweptVotes: revealed && votes != null && eligible > 0 && votes === eligible,
      };
    });
  }

  getPublicState(): FdpPublicState {
    const inResults = this.phase === 'roundResults' || this.phase === 'gameover';
    const showAnswers = this.phase === 'voting' || inResults;

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
      prompt: this.prompt,
      answersInCount: this.phase === 'writing' ? this.submissions.size : 0,
      answersExpectedCount: this.phase === 'writing' ? this.connectedPlayerIds().length : 0,
      answers: showAnswers ? this.projectAnswers(inResults) : [],
      votesInCount: this.phase === 'voting' ? this.votes.size : 0,
      votesExpectedCount: this.phase === 'voting' ? this.eligibleVoterIds().length : 0,
      standings: inResults ? this.standings : [],
      roundWinnerId: inResults ? this.roundWinnerId : null,
      timer: this.getTimer(),
      winnerId: this.phase === 'gameover' ? this.winnerId : null,
    };
  }

  getPrivateState(playerId: string): FdpPrivateState {
    const inGame = this.nameById.has(playerId);
    const myAnswer = this.submissions.get(playerId) ?? null;

    const voteOptions =
      this.phase === 'voting'
        ? this.answers.filter((a) => a.authorId !== playerId).map((a) => ({ id: a.id, text: a.text }))
        : [];
    const myVoteId = this.votes.get(playerId) ?? null;

    let pendingDecision: FdpPrivateState['pendingDecision'] = null;
    if (inGame && !this.paused) {
      if (this.phase === 'writing') {
        pendingDecision = myAnswer ? 'wait' : 'write';
      } else if (this.phase === 'voting') {
        pendingDecision = myVoteId ? 'wait' : voteOptions.length > 0 ? 'vote' : 'wait';
      }
    }

    let myRoundVotes = 0;
    if (this.phase === 'roundResults' || this.phase === 'gameover') {
      const mine = this.answers.find((a) => a.authorId === playerId);
      if (mine) {
        for (const votedId of this.votes.values()) {
          if (votedId === mine.id) myRoundVotes += 1;
        }
      }
    }

    return {
      playerId,
      pendingDecision,
      myAnswer: this.phase === 'writing' ? myAnswer : null,
      voteOptions,
      myVoteId,
      myRoundVotes,
    };
  }
}
