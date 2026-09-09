import type {
  ContentTier,
  DilemaCandidate,
  DilemaGameEvent,
  DilemaModifierTarget,
  DilemaPhase,
  DilemaPickState,
  DilemaPrivateState,
  DilemaPublicState,
  DilemaStanding,
  DilemaStep,
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
  CANDIDATES_PER_STEP,
  MAX_PLAYERS,
  MIN_PLAYERS,
  RESULTS_MS,
  STEPS,
  TOTAL_ROUNDS,
  TRACK_LABEL,
} from './constants';
import { planRound } from './pairing';

function assertCondition(condition: unknown, code: string, message: string): asserts condition {
  if (!condition) {
    throw new Error(`${code}:${message}`);
  }
}

type Player = { id: string; name: string };

/** A card resolved onto a track — engine-internal. */
type InternalCard = {
  id: string;
  type: DilemaStep;
  text: string;
  authorTrack: DilemaTrack | null;
  attachedTo: string | null;
};

/** One team's working state for the current pick step. */
type TeamStep = {
  proposalCardId: string | null;
  proposalTargetId: string | null;
  confirmedBy: Set<string>;
  locked: boolean;
};

const STEP_PHASE: Record<DilemaStep, DilemaPhase> = {
  innocent: 'pickInnocent',
  guilty: 'pickGuilty',
  modifier: 'pickModifier',
};

const emptyTeamStep = (): TeamStep => ({
  proposalCardId: null,
  proposalTargetId: null,
  confirmedBy: new Set(),
  locked: false,
});

/**
 * Dilema nos Trilhos orchestrator — the platform `GameInstance` for a
 * trolley-problem debate match.
 *
 * Faithful to the *Trial by Trolley* turn order: each round both teams agree on
 * ONE innocent (own track), then ONE guilty (enemy track), then ONE modifier
 * (stapled to a base card). The pick steps and the verdict have NO timer — couch
 * play, the table argues out loud and locks / pulls the lever when it is ready.
 * Only `assigning` and `roundResults` auto-advance off a server-ticked deadline.
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
  private candidates: Record<DilemaTrack, DilemaCandidate[]> = { left: [], right: [] };
  private stepIndex = 0;
  private teamStep: Record<DilemaTrack, TeamStep> = { left: emptyTeamStep(), right: emptyTeamStep() };
  private cardSeq = 0;

  private killedTrack: DilemaTrack | null = null;
  private sparedTrack: DilemaTrack | null = null;
  private verdictWasAuto = false;

  private standings: DilemaStanding[] = [];
  private winnerId: string | null = null;

  // Single wall-clock deadline; only `assigning` + `roundResults` set it.
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
    if (!this.connected.has(playerId)) return;
    this.connected.set(playerId, connected);
    if (connected) return;

    // A disconnect can complete a pick step (fewer members left to confirm) or
    // force the verdict (the Maquinista left).
    if (this.isPickPhase()) {
      for (const side of ['left', 'right'] as DilemaTrack[]) this.maybeLockTeam(side);
    } else if (this.phase === 'verdict' && playerId === this.conductorId) {
      this.closeVerdict(true);
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
      durationMs: this.timerDurationMs ?? RESULTS_MS,
      serverNow: now,
      remainingMs: Math.max(0, this.timerExpiresAt - now),
    };
  }

  onTurnTimeout(): void {
    if (this.paused) return;
    switch (this.phase) {
      case 'assigning':
        this.beginStep(0);
        break;
      case 'roundResults':
        if (this.round < this.totalRounds) {
          this.beginRound(this.round + 1);
        } else {
          this.enterGameover();
        }
        break;
      // Pick phases + verdict carry no timer — nothing to time out.
      default:
        break;
    }
  }

  // ─── Action entry ───

  handleAction(playerId: string, action: unknown): void {
    assertCondition(!this.paused, 'GAME_PAUSED', 'Game is paused');
    assertCondition(this.nameById.has(playerId), 'REJECTED', 'Not a player in this game');
    const input = parseDilemaAction(action);
    if (input.type === 'propose') {
      this.propose(playerId, input.cardId, input.targetCardId);
    } else if (input.type === 'confirm') {
      this.confirmPick(playerId);
    } else if (input.type === 'unconfirm') {
      this.unconfirmPick(playerId);
    } else {
      this.castVerdict(playerId, input.killedTrack);
    }
  }

  private propose(playerId: string, cardId: string, targetCardId?: string): void {
    assertCondition(this.isPickPhase(), 'REJECTED', 'Não é hora de escolher carta');
    assertCondition(playerId !== this.conductorId, 'REJECTED', 'O Maquinista não escolhe cartas');
    const side = this.trackOf(playerId);
    assertCondition(side != null, 'REJECTED', 'Você não está num trilho');
    const ts = this.teamStep[side];
    assertCondition(!ts.locked, 'REJECTED', 'O time já travou essa escolha');

    const step = this.currentStep();
    const cand = this.candidates[side].find((c) => c.id === cardId && c.type === step);
    assertCondition(cand != null, 'REJECTED', 'Essa carta não está entre as opções do time');

    let target: string | null = null;
    if (step === 'modifier') {
      assertCondition(
        typeof targetCardId === 'string' && targetCardId.length > 0,
        'REJECTED',
        'Um modificador precisa de uma carta-alvo',
      );
      const base = this.allBaseCards().find((c) => c.id === targetCardId);
      assertCondition(base != null, 'REJECTED', 'Não há essa carta nos trilhos');
      target = targetCardId;
    }

    ts.proposalCardId = cardId;
    ts.proposalTargetId = target;
    ts.confirmedBy.clear();
    ts.confirmedBy.add(playerId); // proposing implies you back your own proposal
    this.emit({ type: 'team_proposed', round: this.round, side, step });
    this.maybeLockTeam(side);
  }

  private confirmPick(playerId: string): void {
    assertCondition(this.isPickPhase(), 'REJECTED', 'Nada para confirmar agora');
    assertCondition(playerId !== this.conductorId, 'REJECTED', 'O Maquinista não confirma cartas');
    const side = this.trackOf(playerId);
    assertCondition(side != null, 'REJECTED', 'Você não está num trilho');
    const ts = this.teamStep[side];
    assertCondition(!ts.locked, 'REJECTED', 'O time já travou essa escolha');
    assertCondition(ts.proposalCardId != null, 'REJECTED', 'Ninguém propôs uma carta ainda');
    ts.confirmedBy.add(playerId);
    this.maybeLockTeam(side);
  }

  private unconfirmPick(playerId: string): void {
    if (!this.isPickPhase()) return;
    const side = this.trackOf(playerId);
    if (side == null) return;
    const ts = this.teamStep[side];
    if (ts.locked) return;
    ts.confirmedBy.delete(playerId);
  }

  private castVerdict(playerId: string, killedTrack: DilemaTrack): void {
    assertCondition(this.phase === 'verdict', 'REJECTED', 'Não é o momento do veredito');
    assertCondition(playerId === this.conductorId, 'REJECTED', 'Só o Maquinista puxa a alavanca');
    this.killedTrack = killedTrack;
    this.closeVerdict(false);
  }

  // ─── Round flow ───

  private beginRound(round: number): void {
    this.round = round;
    this.phase = 'assigning';
    this.trackCards = { left: [], right: [] };
    this.candidates = { left: [], right: [] };
    this.teamStep = { left: emptyTeamStep(), right: emptyTeamStep() };
    this.stepIndex = 0;
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

    // Seed one innocent per track (face up).
    this.trackCards.left.push(this.seedCard(this.drawInnocent()));
    this.trackCards.right.push(this.seedCard(this.drawInnocent()));

    // Deal each team CANDIDATES_PER_STEP of every type.
    for (const side of ['left', 'right'] as DilemaTrack[]) {
      this.candidates[side] = this.dealCandidates();
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

  private beginStep(index: number): void {
    this.stepIndex = index;
    const step = STEPS[index];
    this.phase = STEP_PHASE[step];
    this.teamStep = { left: emptyTeamStep(), right: emptyTeamStep() };
    this.clearTimer();
    this.emit({ type: 'pick_step_started', round: this.round, step });

    // Degenerate safety: a team with no connected members auto-locks a random candidate.
    for (const side of ['left', 'right'] as DilemaTrack[]) {
      if (this.connectedMembers(side).length === 0) this.autoLockTeam(side);
    }
    this.checkStepComplete();
  }

  private maybeLockTeam(side: DilemaTrack): void {
    const ts = this.teamStep[side];
    if (ts.locked || ts.proposalCardId == null) return;
    const members = this.connectedMembers(side);
    if (members.length === 0) {
      this.autoLockTeam(side);
      return;
    }
    if (members.every((id) => ts.confirmedBy.has(id))) {
      this.lockTeam(side);
    }
  }

  private autoLockTeam(side: DilemaTrack): void {
    const ts = this.teamStep[side];
    if (ts.locked) return;
    const step = this.currentStep();
    if (ts.proposalCardId == null) {
      const pool = this.candidates[side].filter((c) => c.type === step);
      const pick = pool[Math.floor(this.random() * pool.length)] ?? pool[0];
      ts.proposalCardId = pick?.id ?? null;
      if (step === 'modifier') {
        const bases = this.allBaseCards();
        ts.proposalTargetId = bases[Math.floor(this.random() * bases.length)]?.id ?? bases[0]?.id ?? null;
      }
    }
    this.lockTeam(side);
  }

  private lockTeam(side: DilemaTrack): void {
    const ts = this.teamStep[side];
    if (ts.locked || ts.proposalCardId == null) return;
    const step = this.currentStep();
    const cand = this.candidates[side].find((c) => c.id === ts.proposalCardId);
    if (!cand) return;

    let targetTrack: DilemaTrack;
    if (step === 'innocent') {
      targetTrack = side;
    } else if (step === 'guilty') {
      targetTrack = this.other(side);
    } else {
      // A modifier staples onto its target card, wherever that card lives.
      targetTrack = this.trackCards.right.some((c) => c.id === ts.proposalTargetId) ? 'right' : 'left';
    }
    this.trackCards[targetTrack].push({
      id: `c${this.cardSeq++}`,
      type: step,
      text: cand.text,
      authorTrack: side,
      attachedTo: step === 'modifier' ? ts.proposalTargetId : null,
    });
    ts.locked = true;
    this.emit({ type: 'team_locked', round: this.round, side, step });
    this.checkStepComplete();
  }

  private checkStepComplete(): void {
    if (!this.isPickPhase()) return;
    if (!this.teamStep.left.locked || !this.teamStep.right.locked) return;
    this.emit({ type: 'both_locked', round: this.round, step: this.currentStep() });
    if (this.stepIndex < STEPS.length - 1) {
      this.beginStep(this.stepIndex + 1);
    } else {
      this.beginVerdict();
    }
  }

  private beginVerdict(): void {
    this.phase = 'verdict';
    this.clearTimer();
    this.emit({ type: 'verdict_started', round: this.round, conductorId: this.conductorId ?? '' });
    // A disconnected Maquinista can't pull the lever — coin-flip immediately.
    if (this.conductorId && !(this.connected.get(this.conductorId) ?? true)) {
      this.closeVerdict(true);
    }
  }

  private closeVerdict(auto: boolean): void {
    if (this.phase !== 'verdict') return;
    if (auto || this.killedTrack === null) {
      this.killedTrack = this.random() < 0.5 ? 'left' : 'right';
      this.verdictWasAuto = true;
    } else {
      this.verdictWasAuto = false;
    }
    this.sparedTrack = this.other(this.killedTrack);

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

  private isPickPhase(): boolean {
    return (
      this.phase === 'pickInnocent' || this.phase === 'pickGuilty' || this.phase === 'pickModifier'
    );
  }

  private currentStep(): DilemaStep {
    return STEPS[this.stepIndex];
  }

  private other(side: DilemaTrack): DilemaTrack {
    return side === 'left' ? 'right' : 'left';
  }

  private allBaseCards(): InternalCard[] {
    return [...this.trackCards.left, ...this.trackCards.right].filter((c) => c.type !== 'modifier');
  }

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

  private drawFrom(type: DilemaStep): string {
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
    return { id: `c${this.cardSeq++}`, type: 'innocent', text, authorTrack: null, attachedTo: null };
  }

  private dealCandidates(): DilemaCandidate[] {
    const out: DilemaCandidate[] = [];
    let seq = 0;
    for (const type of STEPS) {
      for (let i = 0; i < CANDIDATES_PER_STEP; i++) {
        out.push({ id: `cand${seq++}`, type, text: this.drawFrom(type) });
      }
    }
    return out;
  }

  private shuffled<T>(source: readonly T[]): T[] {
    const arr = [...source];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(this.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  private trackOf(playerId: string): DilemaTrack | null {
    if (this.leftIds.includes(playerId)) return 'left';
    if (this.rightIds.includes(playerId)) return 'right';
    return null;
  }

  private teamIds(side: DilemaTrack): string[] {
    return side === 'left' ? this.leftIds : this.rightIds;
  }

  private connectedMembers(side: DilemaTrack): string[] {
    return this.teamIds(side).filter((id) => this.connected.get(id) ?? true);
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
      authorTrack: card.authorTrack,
      attachedTo: card.attachedTo,
      modifiers: [],
    };
  }

  private projectPick(side: DilemaTrack): DilemaPickState | null {
    if (!this.isPickPhase()) return null;
    const ts = this.teamStep[side];
    const step = this.currentStep();
    const cand = ts.proposalCardId
      ? this.candidates[side].find((c) => c.id === ts.proposalCardId)
      : undefined;
    return {
      step,
      proposalCardId: ts.proposalCardId,
      proposalText: cand?.text ?? null,
      proposalTargetId: ts.proposalTargetId,
      confirmedCount: this.connectedMembers(side).filter((id) => ts.confirmedBy.has(id)).length,
      memberCount: this.connectedMembers(side).length,
      locked: ts.locked,
    };
  }

  private projectTrack(side: DilemaTrack): DilemaTrackView {
    const memberIds = this.teamIds(side);
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
      pick: this.projectPick(side),
    };
  }

  getPublicState(): DilemaPublicState {
    const inResults = this.phase === 'roundResults' || this.phase === 'gameover';
    return {
      phase: this.projectPhase(),
      roomCode: this.roomCode,
      round: this.round,
      totalRounds: this.totalRounds,
      step: this.isPickPhase() ? this.currentStep() : null,
      conductorId: this.conductorId,
      conductorName: this.conductorId ? (this.nameById.get(this.conductorId) ?? '—') : null,
      tracks: { left: this.projectTrack('left'), right: this.projectTrack('right') },
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
    const side = isConductor ? null : this.trackOf(playerId);
    const step = this.isPickPhase() ? this.currentStep() : null;
    const ts = side ? this.teamStep[side] : null;

    let candidates: DilemaCandidate[] = [];
    let modifierTargets: DilemaModifierTarget[] = [];
    if (side && step) {
      candidates = this.candidates[side].filter((c) => c.type === step);
      if (step === 'modifier') {
        for (const s of ['left', 'right'] as DilemaTrack[]) {
          for (const c of this.trackCards[s]) {
            if (c.type !== 'modifier') {
              modifierTargets.push({ id: c.id, text: c.text, type: c.type, side: s });
            }
          }
        }
      }
    }

    let pendingDecision: DilemaPrivateState['pendingDecision'] = null;
    if (inGame && !this.paused) {
      if (this.phase === 'verdict') {
        pendingDecision = isConductor ? 'decide' : 'wait';
      } else if (this.isPickPhase() && side && ts) {
        if (ts.locked || ts.confirmedBy.has(playerId)) pendingDecision = 'wait';
        else if (ts.proposalCardId != null) pendingDecision = 'confirm';
        else pendingDecision = 'propose';
      } else if (this.phase === 'assigning' || this.phase === 'roundResults') {
        pendingDecision = 'wait';
      }
    }

    return {
      playerId,
      isConductor,
      myTrack: side,
      pendingDecision,
      step,
      candidates,
      modifierTargets,
      teamProposalCardId: ts?.proposalCardId ?? null,
      teamProposalTargetId: ts?.proposalTargetId ?? null,
      iConfirmed: ts?.confirmedBy.has(playerId) ?? false,
      teamConfirmedCount: side ? this.connectedMembers(side).filter((id) => ts?.confirmedBy.has(id)).length : 0,
      teamMemberCount: side ? this.connectedMembers(side).length : 0,
    };
  }
}
