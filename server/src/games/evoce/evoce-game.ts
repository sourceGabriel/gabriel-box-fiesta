import type {
  ContentTier,
  EvoceDrawing,
  EvoceGameEvent,
  EvocePhase,
  EvocePollBar,
  EvocePrivateState,
  EvocePublicState,
  EvoceRoundKind,
  EvoceStanding,
  EvoceSubmission,
  GameStatus as PlatformGameStatus,
  TurnTimer,
} from '@party/shared';
import type { GameContext, PausableGame, TurnTimedGame } from '../../core/game-plugin';
import { parseEvoceAction } from './action-schema';
import {
  ANSWERING_MS,
  CONSENSUS_POINTS,
  FINAL_ROUND_MULTIPLIER,
  JOKER_COUNT,
  MAX_CAPTION_LEN,
  MAX_POINTS_PER_STROKE,
  MAX_STROKES,
  MAX_TOTAL_POINTS,
  PICK_WINNER_BONUS,
  RESULTS_MS,
  ROUND_PLAN,
  TOTAL_ROUNDS,
  VOTE_POINTS,
  VOTING_MS,
} from './constants';
import { enquetePrompts, finalPrompts, legendaPrompts, rabiscoPrompts } from './prompts';

function assertCondition(condition: unknown, code: string, message: string): asserts condition {
  if (!condition) {
    throw new Error(`${code}:${message}`);
  }
}

type Player = { id: string; name: string };

/** One creative submission under construction — engine-internal (author always known). */
type InternalSubmission = {
  id: string;
  authorId: string;
  kind: 'caption' | 'drawing';
  text: string | null;
  drawing: EvoceDrawing | null;
};

/** Defensive copy + clamp of a drawing payload (schema already bounds it; this keeps it tidy). */
function sanitizeDrawing(drawing: EvoceDrawing): EvoceDrawing {
  let budget = MAX_TOTAL_POINTS * 2;
  const strokes: EvoceDrawing['strokes'] = [];
  for (const s of drawing.strokes.slice(0, MAX_STROKES)) {
    if (budget <= 0) break;
    const points = s.points
      .slice(0, Math.min(MAX_POINTS_PER_STROKE * 2, budget))
      .map((n) => Math.round(Math.max(0, Math.min(1000, n))));
    if (points.length < 2) continue;
    budget -= points.length;
    strokes.push({ color: s.color, width: s.width, points });
  }
  return { strokes };
}

/**
 * É Você! orchestrator — the platform `GameInstance` for a *That's You!*-inspired
 * match. Self-advancing: every phase carries one stored deadline the platform
 * server ticks; `onTurnTimeout()` closes the phase with whatever is in. 6 fixed
 * rounds (`enquete` / `legenda` / `rabisco` / `enquete` / `legenda` / `final`);
 * the last is worth double.
 */
export class EvoceGame implements PausableGame, TurnTimedGame {
  private readonly now: () => number;
  private readonly random: () => number;
  private readonly contentTier: ContentTier | undefined;
  private readonly roomCode: string;
  private readonly players: Player[];
  private readonly nameById = new Map<string, string>();
  private readonly connected = new Map<string, boolean>();
  private readonly score = new Map<string, number>();
  private readonly roundPoints = new Map<string, number>();
  private readonly jokersLeft = new Map<string, number>();

  private started = false;
  private phase: EvocePhase = 'answering';
  private round = 0;
  private roundKind: EvoceRoundKind = 'enquete';

  private prompt: string | null = null;
  private targetId: string | null = null;
  private readonly targetRotation: string[] = [];
  private targetCursor = 0;

  // Per-bank decks (drawn per round, reshuffled on empty).
  private enqueteDeck: string[] = [];
  private legendaDeck: string[] = [];
  private rabiscoDeck: string[] = [];
  private finalDeck: string[] = [];

  // enquete round
  private playerVotes = new Map<string, string>();
  private jokers = new Set<string>();
  private pollWinnerId: string | null = null;

  // legenda / rabisco / final round
  private captions = new Map<string, string>();
  private drawings = new Map<string, EvoceDrawing>();
  private submissions: InternalSubmission[] = [];
  private votes = new Map<string, string>();
  private roundWinnerId: string | null = null;

  private standings: EvoceStanding[] = [];
  private winnerId: string | null = null;

  // Single wall-clock deadline, ticked by the server against `getTimer().expiresAt`.
  private timerStartedAt: number | null = null;
  private timerDurationMs: number | null = null;
  private timerExpiresAt: number | null = null;
  private paused = false;
  private pausedRemainingMs: number | null = null;

  private readonly events: EvoceGameEvent[] = [];

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
      this.jokersLeft.set(p.id, JOKER_COUNT);
    }
  }

  // ─── Lifecycle ───

  start(): void {
    assertCondition(
      this.players.length >= 3 && this.players.length <= 8,
      'INVALID_PLAYER_COUNT',
      'É Você! requires 3-8 players',
    );
    this.started = true;
    this.enqueteDeck = this.shuffled(enquetePrompts(this.contentTier));
    this.legendaDeck = this.shuffled(legendaPrompts(this.contentTier));
    this.rabiscoDeck = this.shuffled(rabiscoPrompts(this.contentTier));
    this.finalDeck = this.shuffled(finalPrompts(this.contentTier));
    this.targetRotation.push(...this.shuffled(this.players.map((p) => p.id)));
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
      durationMs: this.timerDurationMs ?? ANSWERING_MS.enquete,
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
    const input = parseEvoceAction(action);
    switch (input.type) {
      case 'votePlayer':
        this.votePlayer(playerId, input.targetId);
        break;
      case 'playJoker':
        this.playJoker(playerId);
        break;
      case 'submitCaption':
        this.submitCaption(playerId, input.text);
        break;
      case 'submitDrawing':
        this.submitDrawing(playerId, input.drawing);
        break;
      case 'castVote':
        this.castVote(playerId, input.submissionId);
        break;
    }
  }

  private votePlayer(playerId: string, targetId: string): void {
    assertCondition(this.phase === 'answering' && this.roundKind === 'enquete', 'REJECTED', 'Not a poll round');
    assertCondition(this.nameById.has(targetId), 'REJECTED', 'No such player to vote for');
    assertCondition(!this.playerVotes.has(playerId), 'REJECTED', 'You already voted');
    this.playerVotes.set(playerId, targetId);
    this.emit({ type: 'player_answered', playerId });
    if (this.allAnswersIn()) this.closeAnswering();
  }

  private playJoker(playerId: string): void {
    assertCondition(this.phase === 'answering' && this.roundKind === 'enquete', 'REJECTED', 'Curinga only on a poll round');
    assertCondition((this.jokersLeft.get(playerId) ?? 0) > 0, 'REJECTED', 'No Curingas left');
    assertCondition(!this.jokers.has(playerId), 'REJECTED', 'Curinga already played this round');
    this.jokers.add(playerId);
    this.jokersLeft.set(playerId, (this.jokersLeft.get(playerId) ?? 0) - 1);
    this.emit({ type: 'joker_played', playerId });
  }

  private submitCaption(playerId: string, rawText: string): void {
    assertCondition(this.phase === 'answering' && this.roundKind === 'legenda', 'REJECTED', 'Not a caption round');
    const text = rawText.trim().slice(0, MAX_CAPTION_LEN);
    assertCondition(text.length > 0, 'REJECTED', 'Caption cannot be empty');
    const isFirst = !this.captions.has(playerId);
    this.captions.set(playerId, text);
    if (isFirst) this.emit({ type: 'player_answered', playerId });
    if (this.allAnswersIn()) this.closeAnswering();
  }

  private submitDrawing(playerId: string, drawing: EvoceDrawing): void {
    assertCondition(
      this.phase === 'answering' && (this.roundKind === 'rabisco' || this.roundKind === 'final'),
      'REJECTED',
      'Not a drawing round',
    );
    if (this.roundKind === 'rabisco') {
      assertCondition(playerId !== this.targetId, 'REJECTED', 'You are the model — you do not draw this round');
    }
    assertCondition(drawing.strokes.length > 0, 'REJECTED', 'Drawing is empty');
    const isFirst = !this.drawings.has(playerId);
    this.drawings.set(playerId, sanitizeDrawing(drawing));
    if (isFirst) this.emit({ type: 'player_answered', playerId });
    if (this.allAnswersIn()) this.closeAnswering();
  }

  private castVote(playerId: string, submissionId: string): void {
    assertCondition(this.phase === 'voting', 'REJECTED', 'Not accepting votes right now');
    const submission = this.submissions.find((s) => s.id === submissionId);
    assertCondition(submission != null, 'REJECTED', 'No such submission');
    assertCondition(submission.authorId !== playerId, 'REJECTED', 'You cannot vote for your own');
    assertCondition(!this.votes.has(playerId), 'REJECTED', 'You already voted');
    this.votes.set(playerId, submissionId);
    this.emit({ type: 'vote_cast', playerId });
    if (this.allVotesIn()) this.closeVoting();
  }

  // ─── Round flow ───

  private beginRound(round: number): void {
    this.round = round;
    this.roundKind = ROUND_PLAN[round - 1];
    this.phase = 'answering';
    this.playerVotes.clear();
    this.jokers.clear();
    this.pollWinnerId = null;
    this.captions.clear();
    this.drawings.clear();
    this.submissions = [];
    this.votes.clear();
    this.roundWinnerId = null;
    this.standings = [];
    for (const p of this.players) this.roundPoints.set(p.id, 0);

    if (this.roundKind === 'enquete') {
      this.targetId = null;
      this.prompt = this.draw('enquete');
    } else if (this.roundKind === 'final') {
      this.targetId = null;
      this.prompt = this.draw('final');
    } else {
      this.targetId = this.nextTarget();
      const template = this.draw(this.roundKind);
      this.prompt = template.replace(/\[NOME\]/g, this.nameById.get(this.targetId) ?? '—');
    }

    this.setTimer(ANSWERING_MS[this.roundKind]);
    this.emit({ type: 'round_started', round, totalRounds: TOTAL_ROUNDS, roundKind: this.roundKind, targetId: this.targetId });
    this.emit({ type: 'answering_started', round, roundKind: this.roundKind, durationMs: ANSWERING_MS[this.roundKind] });
  }

  private closeAnswering(): void {
    if (this.phase !== 'answering') return;

    if (this.roundKind === 'enquete') {
      this.scoreEnquete();
      this.enterResults();
      return;
    }

    // legenda / rabisco / final → build the ballot
    const built: InternalSubmission[] = [];
    if (this.roundKind === 'legenda') {
      for (const [pid, text] of this.captions) built.push({ id: '', authorId: pid, kind: 'caption', text, drawing: null });
    } else {
      for (const [pid, drawing] of this.drawings) built.push({ id: '', authorId: pid, kind: 'drawing', text: null, drawing });
    }
    this.shuffleInPlace(built);
    built.forEach((s, i) => (s.id = `s${i}`));
    this.submissions = built;

    if (this.submissions.length === 0) {
      this.enterResults();
      return;
    }

    this.phase = 'voting';
    this.setTimer(VOTING_MS);
    this.emit({ type: 'all_answers_in', round: this.round });
    this.emit({ type: 'voting_started', round: this.round, submissionCount: this.submissions.length, durationMs: VOTING_MS });
    if (this.allVotesIn()) this.closeVoting();
  }

  private scoreEnquete(): void {
    const tally = new Map<string, number>();
    for (const t of this.playerVotes.values()) tally.set(t, (tally.get(t) ?? 0) + 1);
    let best = 0;
    let bestCount = 0;
    let bestId: string | null = null;
    for (const [id, n] of tally) {
      if (n > best) {
        best = n;
        bestCount = 1;
        bestId = id;
      } else if (n === best) {
        bestCount += 1;
      }
    }
    this.pollWinnerId = best > 0 && bestCount === 1 ? bestId : null;

    for (const [voterId, targetId] of this.playerVotes) {
      let others = 0;
      for (const [otherId, otherTarget] of this.playerVotes) {
        if (otherId !== voterId && otherTarget === targetId) others += 1;
      }
      let points = CONSENSUS_POINTS * others;
      if (this.jokers.has(voterId) && this.pollWinnerId != null && targetId === this.pollWinnerId) {
        points *= 2;
      }
      if (points > 0) this.addPoints(voterId, points);
    }
  }

  private closeVoting(): void {
    if (this.phase !== 'voting') return;
    const mult = this.roundKind === 'final' ? FINAL_ROUND_MULTIPLIER : 1;
    const tally = new Map<string, number>();
    for (const sid of this.votes.values()) tally.set(sid, (tally.get(sid) ?? 0) + 1);

    let best = 0;
    let bestCount = 0;
    let bestAuthor: string | null = null;
    let bestSubmissionId: string | null = null;
    for (const s of this.submissions) {
      const n = tally.get(s.id) ?? 0;
      if (n > 0) this.addPoints(s.authorId, VOTE_POINTS * n * mult);
      if (n > best) {
        best = n;
        bestCount = 1;
        bestAuthor = s.authorId;
        bestSubmissionId = s.id;
      } else if (n === best && n > 0) {
        bestCount += 1;
      }
    }
    this.roundWinnerId = best > 0 && bestCount === 1 ? bestAuthor : null;
    if (bestCount === 1 && bestSubmissionId != null) {
      for (const [voterId, sid] of this.votes) {
        if (sid === bestSubmissionId) this.addPoints(voterId, PICK_WINNER_BONUS * mult);
      }
    }
    this.enterResults();
  }

  private enterResults(): void {
    this.phase = 'roundResults';
    this.standings = this.computeStandings();
    this.setTimer(RESULTS_MS);
    this.emit({ type: 'results_started', round: this.round });
    this.emit({
      type: 'round_finished',
      round: this.round,
      winnerId: this.roundKind === 'enquete' ? this.pollWinnerId : this.roundWinnerId,
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

  private nextTarget(): string {
    const id = this.targetRotation[this.targetCursor % this.targetRotation.length];
    this.targetCursor += 1;
    return id;
  }

  private draw(kind: EvoceRoundKind): string {
    const deckByKind: Record<EvoceRoundKind, { deck: string[]; refill: () => string[] }> = {
      enquete: { deck: this.enqueteDeck, refill: () => this.shuffled(enquetePrompts(this.contentTier)) },
      legenda: { deck: this.legendaDeck, refill: () => this.shuffled(legendaPrompts(this.contentTier)) },
      rabisco: { deck: this.rabiscoDeck, refill: () => this.shuffled(rabiscoPrompts(this.contentTier)) },
      final: { deck: this.finalDeck, refill: () => this.shuffled(finalPrompts(this.contentTier)) },
    };
    const entry = deckByKind[kind];
    if (entry.deck.length === 0) {
      const fresh = entry.refill();
      entry.deck.push(...fresh);
      if (kind === 'enquete') this.enqueteDeck = entry.deck;
      else if (kind === 'legenda') this.legendaDeck = entry.deck;
      else if (kind === 'rabisco') this.rabiscoDeck = entry.deck;
      else this.finalDeck = entry.deck;
    }
    return entry.deck.pop()!;
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

  private computeStandings(): EvoceStanding[] {
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

  /** Who owes an answer this round. */
  private expectedAnswererIds(): string[] {
    const ids = this.connectedPlayerIds();
    if (this.roundKind === 'rabisco') return ids.filter((id) => id !== this.targetId);
    return ids;
  }

  private allAnswersIn(): boolean {
    const expected = this.expectedAnswererIds();
    if (expected.length === 0) return false;
    if (this.roundKind === 'enquete') return expected.every((id) => this.playerVotes.has(id));
    if (this.roundKind === 'legenda') return expected.every((id) => this.captions.has(id));
    return expected.every((id) => this.drawings.has(id));
  }

  private eligibleVoterIds(): string[] {
    return this.connectedPlayerIds().filter((id) => this.submissions.some((s) => s.authorId !== id));
  }

  private allVotesIn(): boolean {
    const expected = this.eligibleVoterIds();
    return expected.length > 0 && expected.every((id) => this.votes.has(id));
  }

  // ─── Events ───

  private emit(event: EvoceGameEvent): void {
    this.events.push(event);
  }

  consumeEvents(): EvoceGameEvent[] {
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

  private projectPhase(): EvocePhase {
    return this.paused ? 'paused' : this.phase;
  }

  private projectSubmissions(revealed: boolean): EvoceSubmission[] {
    const votersBySub = new Map<string, string[]>();
    const countBySub = new Map<string, number>();
    if (revealed) {
      for (const [pid, sid] of this.votes) {
        const list = votersBySub.get(sid) ?? [];
        list.push(this.nameById.get(pid) ?? '—');
        votersBySub.set(sid, list);
        countBySub.set(sid, (countBySub.get(sid) ?? 0) + 1);
      }
    }
    return this.submissions.map((s) => ({
      id: s.id,
      authorId: revealed ? s.authorId : null,
      authorName: revealed ? (this.nameById.get(s.authorId) ?? '—') : null,
      kind: s.kind,
      text: s.text,
      drawing: s.drawing,
      votes: revealed ? (countBySub.get(s.id) ?? 0) : null,
      voterNames: revealed ? (votersBySub.get(s.id) ?? []) : null,
      isRoundWinner: revealed && this.roundWinnerId != null && s.authorId === this.roundWinnerId,
    }));
  }

  private projectPollBars(): EvocePollBar[] {
    const tally = new Map<string, number>();
    for (const t of this.playerVotes.values()) tally.set(t, (tally.get(t) ?? 0) + 1);
    return this.players
      .map((p) => ({ playerId: p.id, name: p.name, count: tally.get(p.id) ?? 0 }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  }

  getPublicState(): EvocePublicState {
    const inResults = this.phase === 'roundResults' || this.phase === 'gameover';
    const showSubmissions = this.phase === 'voting' || inResults;
    const isEnquete = this.roundKind === 'enquete';

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
        jokersLeft: this.jokersLeft.get(p.id) ?? 0,
      })),
      prompt: this.prompt,
      targetId: this.targetId,
      targetName: this.targetId ? (this.nameById.get(this.targetId) ?? null) : null,
      answersInCount:
        this.phase === 'answering'
          ? isEnquete
            ? this.playerVotes.size
            : this.roundKind === 'legenda'
              ? this.captions.size
              : this.drawings.size
          : 0,
      answersExpectedCount: this.phase === 'answering' ? this.expectedAnswererIds().length : 0,
      pollBars: isEnquete && inResults ? this.projectPollBars() : null,
      pollWinnerId: isEnquete && inResults ? this.pollWinnerId : null,
      submissions: !isEnquete && showSubmissions ? this.projectSubmissions(inResults) : [],
      votesInCount: this.phase === 'voting' ? this.votes.size : 0,
      votesExpectedCount: this.phase === 'voting' ? this.eligibleVoterIds().length : 0,
      standings: inResults ? this.standings : [],
      roundWinnerId: inResults ? (isEnquete ? this.pollWinnerId : this.roundWinnerId) : null,
      timer: this.getTimer(),
      winnerId: this.phase === 'gameover' ? this.winnerId : null,
    };
  }

  getPrivateState(playerId: string): EvocePrivateState {
    const inGame = this.nameById.has(playerId);
    const isEnquete = this.roundKind === 'enquete';
    const isRabiscoModel = this.roundKind === 'rabisco' && playerId === this.targetId;

    const myPlayerVote = this.playerVotes.get(playerId) ?? null;
    const mySubmissionText = this.captions.get(playerId) ?? null;
    const mySubmissionDrawing = this.drawings.get(playerId) ?? null;
    const myVoteId = this.votes.get(playerId) ?? null;

    const voteOptions =
      this.phase === 'voting'
        ? this.submissions
            .filter((s) => s.authorId !== playerId)
            .map((s) => ({ id: s.id, kind: s.kind, text: s.text, drawing: s.drawing }))
        : [];

    let pendingDecision: EvocePrivateState['pendingDecision'] = null;
    if (inGame && !this.paused) {
      if (this.phase === 'answering') {
        if (isEnquete) pendingDecision = myPlayerVote ? 'wait' : 'vote_player';
        else if (this.roundKind === 'legenda') pendingDecision = mySubmissionText ? 'wait' : 'write';
        else if (isRabiscoModel) pendingDecision = 'wait';
        else pendingDecision = mySubmissionDrawing ? 'wait' : 'draw';
      } else if (this.phase === 'voting') {
        pendingDecision = myVoteId ? 'wait' : voteOptions.length > 0 ? 'vote_submission' : 'wait';
      }
    }

    const inResults = this.phase === 'roundResults' || this.phase === 'gameover';

    return {
      playerId,
      pendingDecision,
      myPlayerVote: isEnquete ? myPlayerVote : null,
      jokerPlayed: this.jokers.has(playerId),
      jokersLeft: this.jokersLeft.get(playerId) ?? 0,
      mySubmissionText: this.roundKind === 'legenda' ? mySubmissionText : null,
      mySubmissionDrawing: this.roundKind === 'rabisco' || this.roundKind === 'final' ? mySubmissionDrawing : null,
      isDrawTarget: isRabiscoModel,
      voteOptions,
      myVoteId,
      myRoundPoints: inResults ? (this.roundPoints.get(playerId) ?? 0) : 0,
      matchedGroup:
        isEnquete && inResults && this.pollWinnerId != null && myPlayerVote === this.pollWinnerId,
    };
  }
}
