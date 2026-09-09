import type {
  ContentTier,
  GameStatus as PlatformGameStatus,
  SintoniaGameEvent,
  SintoniaPhase,
  SintoniaPrivateState,
  SintoniaPublicState,
  SintoniaRole,
  SintoniaSide,
  SintoniaStanding,
  SintoniaTeamId,
  SintoniaTeamView,
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
  SIDE_POINTS,
  TARGET_MAX,
  TARGET_MIN,
  TEAM_NAMES,
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

/**
 * Sintonia orchestrator — the platform `GameInstance` for a *Wavelength*-style
 * telepathy match. Self-advancing: every phase (`cluing` → `guessing` →
 * `reveal`) carries one stored deadline the platform server ticks;
 * `onTurnTimeout()` closes the phase with whatever is in.
 *
 * Score is by team. A player's `standings` score mirrors their team's score so
 * the shared `RoundScoreboard` renders; the game crowns the higher team.
 */
export class SintoniaGame implements PausableGame, TurnTimedGame {
  private readonly now: () => number;
  private readonly random: () => number;
  private readonly contentTier: ContentTier | undefined;
  private readonly roomCode: string;
  private readonly players: Player[];
  private readonly nameById = new Map<string, string>();
  private readonly connected = new Map<string, boolean>();

  private started = false;
  private phase: SintoniaPhase = 'cluing';
  private readonly totalRounds: number;
  private round = 0;

  private spectrumPool: Spectrum[] = [];
  private spectrumDeck: Spectrum[] = [];

  // Per-round state.
  private teams: [string[], string[]] = [[], []];
  private readonly teamScores: [number, number] = [0, 0];
  private readonly teamRoundDelta: [number, number] = [0, 0];
  private activeTeamId: SintoniaTeamId = 0;
  private mediumId: string | null = null;
  private spectrum: Spectrum = ['', ''];
  private target = 0;
  private dialValue = DIAL_START;
  private clue: string | null = null;
  private readonly sideBets = new Map<string, SintoniaSide>();

  // Round result, populated at `reveal`.
  private bandPoints: number | null = null;
  private resolvedSideBet: SintoniaSide | null = null;
  private sideCorrect: boolean | null = null;
  private roundSkipped = false;

  private winnerTeamId: SintoniaTeamId | null = null;

  // Single wall-clock deadline, ticked by the server against `getTimer().expiresAt`.
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
    if (this.connected.has(playerId)) {
      this.connected.set(playerId, connected);
      if (!connected && this.phase === 'guessing' && this.allBetsIn()) {
        this.closeGuessing();
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
        // The médium never sent a clue — skip the round, nobody scores.
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
    } else if (input.type === 'moveDial') {
      this.moveDial(playerId, input.value);
    } else {
      this.betSide(playerId, input.side);
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

  private moveDial(playerId: string, value: number): void {
    assertCondition(this.phase === 'guessing', 'REJECTED', 'O dial está travado agora');
    assertCondition(this.dialMovers().includes(playerId), 'REJECTED', 'Você não controla o dial');
    this.dialValue = clamp(Math.round(value), 0, 100);
  }

  private betSide(playerId: string, side: SintoniaSide): void {
    assertCondition(this.phase === 'guessing', 'REJECTED', 'Não é hora de apostar');
    assertCondition(
      this.teamOf(playerId) !== this.activeTeamId,
      'REJECTED',
      'O time do médium não aposta o lado',
    );
    assertCondition(!this.sideBets.has(playerId), 'REJECTED', 'Você já apostou');
    this.sideBets.set(playerId, side);
    if (this.allBetsIn()) {
      this.closeGuessing();
    }
  }

  // ─── Round flow ───

  private beginRound(round: number): void {
    this.round = round;
    this.phase = 'cluing';
    const plan = planRound(this.players, round - 1, this.random);
    this.teams = plan.teams;
    this.activeTeamId = plan.activeTeamId;
    this.mediumId = plan.mediumId;
    this.spectrum = this.drawSpectrum();
    this.target = TARGET_MIN + Math.floor(this.random() * (TARGET_MAX - TARGET_MIN + 1));
    this.dialValue = DIAL_START;
    this.clue = null;
    this.sideBets.clear();
    this.bandPoints = null;
    this.resolvedSideBet = null;
    this.sideCorrect = null;
    this.roundSkipped = false;
    this.teamRoundDelta[0] = 0;
    this.teamRoundDelta[1] = 0;

    this.setTimer(CLUING_MS);
    this.emit({
      type: 'round_started',
      round,
      totalRounds: this.totalRounds,
      activeTeamId: this.activeTeamId,
      mediumId: this.mediumId,
    });
  }

  private beginGuessing(): void {
    if (this.phase !== 'cluing') return;
    this.phase = 'guessing';
    this.setTimer(GUESSING_MS);
    this.emit({ type: 'guessing_started', round: this.round, durationMs: GUESSING_MS });
    if (this.allBetsIn()) {
      this.closeGuessing();
    }
  }

  private closeGuessing(): void {
    if (this.phase !== 'guessing') return;
    this.emit({ type: 'dial_locked', round: this.round, value: this.dialValue });
    this.enterReveal();
  }

  private enterReveal(): void {
    this.phase = 'reveal';
    const opponentId: SintoniaTeamId = this.activeTeamId === 0 ? 1 : 0;

    if (this.roundSkipped) {
      this.bandPoints = 0;
      this.resolvedSideBet = null;
      this.sideCorrect = false;
    } else {
      const distance = Math.abs(this.dialValue - this.target);
      this.bandPoints = BANDS.find(([d]) => distance <= d)?.[1] ?? 0;
      this.teamScores[this.activeTeamId] += this.bandPoints;
      this.teamRoundDelta[this.activeTeamId] += this.bandPoints;

      this.resolvedSideBet = this.tallySideBet(opponentId);
      this.sideCorrect =
        this.resolvedSideBet !== null &&
        ((this.resolvedSideBet === 'right' && this.target > this.dialValue) ||
          (this.resolvedSideBet === 'left' && this.target < this.dialValue));
      if (this.sideCorrect) {
        this.teamScores[opponentId] += SIDE_POINTS;
        this.teamRoundDelta[opponentId] += SIDE_POINTS;
      }
    }

    this.setTimer(REVEAL_MS);
    this.emit({
      type: 'round_revealed',
      round: this.round,
      target: this.target,
      dialValue: this.dialValue,
      bandPoints: this.bandPoints,
      activeTeamId: this.activeTeamId,
      sideBet: this.resolvedSideBet,
      sideCorrect: this.sideCorrect ?? false,
      scores: [this.teamScores[0], this.teamScores[1]],
    });
    this.emit({ type: 'round_finished', round: this.round, standings: this.computeStandings() });
  }

  private enterGameover(): void {
    this.phase = 'gameover';
    this.clearTimer();
    this.winnerTeamId =
      this.teamScores[0] > this.teamScores[1]
        ? 0
        : this.teamScores[1] > this.teamScores[0]
          ? 1
          : null;
    this.emit({
      type: 'game_finished',
      winnerTeamId: this.winnerTeamId,
      standings: this.computeStandings(),
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

  private teamOf(playerId: string): SintoniaTeamId | null {
    if (this.teams[0].includes(playerId)) return 0;
    if (this.teams[1].includes(playerId)) return 1;
    return null;
  }

  /** Active-team members who are not the médium — they drag the dial. Falls back to the médium if they are alone (tiny lobbies). */
  private dialMovers(): string[] {
    const active = this.teams[this.activeTeamId];
    const others = active.filter((id) => id !== this.mediumId);
    return others.length > 0 ? others : this.mediumId ? [this.mediumId] : [];
  }

  private opponentConnectedIds(): string[] {
    const opp: SintoniaTeamId = this.activeTeamId === 0 ? 1 : 0;
    return this.teams[opp].filter((id) => this.connected.get(id) ?? true);
  }

  private allBetsIn(): boolean {
    const expected = this.opponentConnectedIds();
    if (expected.length === 0) return true;
    return expected.every((id) => this.sideBets.has(id));
  }

  private tallySideBet(opponentId: SintoniaTeamId): SintoniaSide | null {
    let left = 0;
    let right = 0;
    for (const id of this.teams[opponentId]) {
      const bet = this.sideBets.get(id);
      if (bet === 'left') left++;
      else if (bet === 'right') right++;
    }
    if (left === 0 && right === 0) return null;
    if (left === right) return null;
    return left > right ? 'left' : 'right';
  }

  private computeStandings(): SintoniaStanding[] {
    return this.players
      .map((p) => {
        const teamId = this.teamOf(p.id) ?? 0;
        return {
          playerId: p.id,
          name: p.name,
          teamId,
          score: this.teamScores[teamId],
          roundDelta: this.teamRoundDelta[teamId],
        };
      })
      .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
  }

  private teamName(id: SintoniaTeamId): string {
    return TEAM_NAMES[id];
  }

  private captainName(id: SintoniaTeamId): string | null {
    // First member by stable join order — deterministic "captain" for the splash.
    for (const p of this.players) {
      if (this.teams[id].includes(p.id)) return p.name;
    }
    return null;
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

  private projectTeam(id: SintoniaTeamId): SintoniaTeamView {
    const memberIds = this.teams[id];
    return {
      id,
      name: this.teamName(id),
      memberIds: [...memberIds],
      memberNames: memberIds.map((mid) => this.nameById.get(mid) ?? '—'),
      score: this.teamScores[id],
      isActive: id === this.activeTeamId,
    };
  }

  getPublicState(): SintoniaPublicState {
    const inReveal = this.phase === 'reveal' || this.phase === 'gameover';
    return {
      phase: this.projectPhase(),
      roomCode: this.roomCode,
      round: this.round,
      totalRounds: this.totalRounds,
      activeTeamId: this.activeTeamId,
      mediumId: this.mediumId,
      mediumName: this.mediumId ? (this.nameById.get(this.mediumId) ?? '—') : null,
      spectrum: [this.spectrum[0], this.spectrum[1]],
      clue: this.phase === 'guessing' || inReveal ? this.clue : null,
      dialValue: this.dialValue,
      target: inReveal ? this.target : null,
      bandPoints: inReveal ? this.bandPoints : null,
      sideBet: inReveal ? this.resolvedSideBet : null,
      sideCorrect: inReveal ? this.sideCorrect : null,
      roundSkipped: inReveal ? this.roundSkipped : false,
      teams: [this.projectTeam(0), this.projectTeam(1)],
      standings: this.computeStandings(),
      timer: this.getTimer(),
      winnerTeamId: this.phase === 'gameover' ? this.winnerTeamId : null,
      winnerName:
        this.phase === 'gameover' && this.winnerTeamId !== null
          ? this.captainName(this.winnerTeamId)
          : null,
    };
  }

  getPrivateState(playerId: string): SintoniaPrivateState {
    const teamId = this.teamOf(playerId);
    const isMedium = playerId === this.mediumId;
    let role: SintoniaRole = 'idle';
    if (!this.paused && this.phase !== 'reveal' && this.phase !== 'gameover') {
      if (this.phase === 'cluing') {
        role = isMedium ? 'medium' : 'idle';
      } else if (this.phase === 'guessing') {
        if (this.dialMovers().includes(playerId)) role = 'dial';
        else if (teamId !== null && teamId !== this.activeTeamId) role = 'sideBet';
        else role = 'idle';
      }
    }

    const seesTarget = isMedium && (this.phase === 'cluing' || this.phase === 'guessing');
    const myBet = this.sideBets.get(playerId) ?? null;

    let done = false;
    if (this.phase === 'cluing' && isMedium) done = this.clue !== null;
    else if (this.phase === 'guessing' && role === 'sideBet') done = myBet !== null;

    return {
      playerId,
      teamId,
      role,
      target: seesTarget ? this.target : null,
      clue: this.phase === 'guessing' || this.phase === 'reveal' ? this.clue : null,
      myBet,
      done,
    };
  }
}
