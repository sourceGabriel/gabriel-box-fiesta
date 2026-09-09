import { describe, expect, it } from 'vitest';
import type { DilemaPublicState, DilemaTrack } from '@party/shared';
import { STEPS, TOTAL_ROUNDS } from '../games/dilema/constants';
import { DilemaGame } from '../games/dilema/dilema-game';
import { planRound } from '../games/dilema/pairing';

const P3 = [
  { id: 'p1', name: 'Ana' },
  { id: 'p2', name: 'Bia' },
  { id: 'p3', name: 'Caio' },
];
const P5 = [...P3, { id: 'p4', name: 'Duda' }, { id: 'p5', name: 'Eli' }];

const mkGame = (
  playerList: { id: string; name: string }[] = P3,
  opts: { now?: () => number; random?: () => number; matchLength?: number } = {},
): DilemaGame =>
  new DilemaGame({
    players: playerList,
    roomCode: 'ABCD',
    now: opts.now ?? (() => 1000),
    random: opts.random ?? (() => 0),
    matchLength: opts.matchLength,
  });

const pub = (game: DilemaGame): DilemaPublicState => game.getPublicState();

/** assigning → pickInnocent */
const toPicks = (game: DilemaGame): void => game.onTurnTimeout();

/** Run the current pick step for both teams (first member proposes candidate 0, the rest confirm). */
const runStep = (game: DilemaGame): void => {
  const s = pub(game);
  const step = s.step!;
  for (const side of ['left', 'right'] as DilemaTrack[]) {
    const members = s.tracks[side].memberIds;
    if (members.length === 0) continue;
    const proposer = members[0];
    const priv = game.getPrivateState(proposer);
    const cand = priv.candidates[0];
    const target = step === 'modifier' ? priv.modifierTargets[0]?.id : undefined;
    game.handleAction(proposer, { type: 'propose', cardId: cand.id, targetCardId: target });
    for (const id of members.slice(1)) {
      try {
        game.handleAction(id, { type: 'confirm' });
      } catch {
        /* step may have already advanced */
      }
    }
  }
};

/** assigning → all three pick steps → verdict. */
const toVerdict = (game: DilemaGame): void => {
  toPicks(game);
  for (let i = 0; i < STEPS.length; i++) runStep(game);
};

/** One whole round, left track dies. */
const playRound = (game: DilemaGame): void => {
  toVerdict(game);
  game.handleAction(pub(game).conductorId!, { type: 'castVerdict', killedTrack: 'left' });
};

describe('DilemaGame — setup', () => {
  it('starts round 1 in assigning with a Maquinista, two tracks and seed innocents', () => {
    const game = mkGame();
    game.start();
    const s = pub(game);
    expect(s.phase).toBe('assigning');
    expect(s.round).toBe(1);
    expect(s.step).toBeNull();
    expect(s.totalRounds).toBe(TOTAL_ROUNDS);
    expect(s.conductorId).toBeTruthy();
    expect(game.getStatus()).toBe('active');

    const members = [...s.tracks.left.memberIds, ...s.tracks.right.memberIds];
    expect(members).toHaveLength(2);
    expect(members).not.toContain(s.conductorId);
    expect(s.tracks.left.cards).toHaveLength(1);
    expect(s.tracks.left.cards[0].type).toBe('innocent');
    expect(s.tracks.left.cards[0].authorTrack).toBeNull();
  });

  it('reports setup before start and rejects a malformed payload', () => {
    expect(mkGame().getStatus()).toBe('setup');
    const game = mkGame();
    game.start();
    expect(() => game.handleAction('p1', { type: 'nope' })).toThrow(/INVALID_ACTION/);
  });

  it('rejects fewer than three players', () => {
    expect(() => mkGame([P3[0], P3[1]]).start()).toThrow(/INVALID_PLAYER_COUNT/);
  });

  it('deals each non-Maquinista their team candidates for the current step only', () => {
    const game = mkGame(P5);
    game.start();
    toPicks(game);
    const s = pub(game);
    for (const p of P5) {
      const priv = game.getPrivateState(p.id);
      if (p.id === s.conductorId) {
        expect(priv.isConductor).toBe(true);
        expect(priv.candidates).toHaveLength(0);
        expect(priv.myTrack).toBeNull();
      } else {
        expect(priv.myTrack === 'left' || priv.myTrack === 'right').toBe(true);
        expect(priv.step).toBe('innocent');
        expect(priv.candidates.length).toBeGreaterThan(0);
        expect(priv.candidates.every((c) => c.type === 'innocent')).toBe(true);
      }
    }
  });

  it('honours a lobby-chosen match length', () => {
    const game = mkGame(P3, { matchLength: 3 });
    game.start();
    expect(pub(game).totalRounds).toBe(3);
  });
});

describe('planRound — pure planner', () => {
  it('rotates the Maquinista by join order and never seats them', () => {
    const r0 = planRound(P5, 0, () => 0);
    const r1 = planRound(P5, 1, () => 0);
    expect(r0.conductorId).toBe('p1');
    expect(r1.conductorId).toBe('p2');
    expect([...r0.left, ...r0.right]).not.toContain('p1');
    expect([...r0.left, ...r0.right]).toHaveLength(4);
  });

  it('splits the rest near-evenly', () => {
    const { left, right } = planRound(P5, 0, () => 0.5);
    expect(Math.abs(left.length - right.length)).toBeLessThanOrEqual(1);
    expect(new Set([...left, ...right]).size).toBe(4);
  });
});

describe('DilemaGame — pick steps + consensus', () => {
  it('auto-advances assigning → pickInnocent on timeout, with no timer on the pick', () => {
    const game = mkGame();
    game.start();
    toPicks(game);
    expect(pub(game).phase).toBe('pickInnocent');
    expect(pub(game).step).toBe('innocent');
    expect(game.getTimer()).toBeNull();
  });

  it('a proposal needs every connected team member to confirm before it locks', () => {
    const game = mkGame(P5);
    game.start();
    toPicks(game);
    const s = pub(game);
    // pick a track with two members
    const side = s.tracks.left.memberIds.length >= 2 ? 'left' : 'right';
    const [a, b] = s.tracks[side].memberIds;
    const candA = game.getPrivateState(a).candidates[0];
    game.handleAction(a, { type: 'propose', cardId: candA.id });
    // proposer auto-confirms; the second member has not
    let pick = pub(game).tracks[side].pick!;
    expect(pick.locked).toBe(false);
    expect(pick.proposalCardId).toBe(candA.id);
    expect(pick.confirmedCount).toBe(1);
    game.handleAction(b, { type: 'confirm' });
    pick = pub(game).tracks[side].pick!;
    expect(pick.locked).toBe(true);
    expect(pub(game).tracks[side].cards.some((c) => c.text === candA.text)).toBe(true);
  });

  it('a new proposal clears the confirmations', () => {
    const game = mkGame(P5);
    game.start();
    toPicks(game);
    const s = pub(game);
    const side = s.tracks.left.memberIds.length >= 2 ? 'left' : 'right';
    const [a, b] = s.tracks[side].memberIds;
    const cands = game.getPrivateState(a).candidates;
    game.handleAction(a, { type: 'propose', cardId: cands[0].id });
    game.handleAction(b, { type: 'propose', cardId: cands[1].id });
    const pick = pub(game).tracks[side].pick!;
    expect(pick.proposalCardId).toBe(cands[1].id);
    expect(pick.confirmedCount).toBe(1); // only b, who re-proposed
  });

  it('runs innocent → guilty → modifier and puts each card on the right track', () => {
    const game = mkGame(P5);
    game.start();
    toPicks(game);

    runStep(game); // innocent
    expect(pub(game).step).toBe('guilty');
    runStep(game); // guilty
    expect(pub(game).step).toBe('modifier');
    runStep(game); // modifier
    expect(pub(game).phase).toBe('verdict');

    const s = pub(game);
    for (const side of ['left', 'right'] as DilemaTrack[]) {
      const other = side === 'left' ? 'right' : 'left';
      // own innocent lands on own track
      expect(s.tracks[side].cards.some((c) => c.type === 'innocent' && c.authorTrack === side)).toBe(true);
      // this team's guilty lands on the enemy track
      expect(s.tracks[other].cards.some((c) => c.type === 'guilty' && c.authorTrack === side)).toBe(true);
      // a modifier got stapled somewhere
    }
    const modCount = [...s.tracks.left.cards, ...s.tracks.right.cards].reduce(
      (n, c) => n + c.modifiers.length,
      0,
    );
    expect(modCount).toBe(2);
  });

  it('rejects a proposal from the Maquinista, a wrong-type candidate and a modifier with no target', () => {
    const game = mkGame(P5);
    game.start();
    toPicks(game);
    const s = pub(game);
    const conductor = s.conductorId!;
    const member = s.tracks.left.memberIds[0] ?? s.tracks.right.memberIds[0];
    const cand = game.getPrivateState(member).candidates[0];

    expect(() => game.handleAction(conductor, { type: 'propose', cardId: cand.id })).toThrow(/REJECTED/);
    expect(() => game.handleAction(member, { type: 'propose', cardId: 'bogus' })).toThrow(/REJECTED/);

    // advance to the modifier step, then propose without a target
    runStep(game); // innocent
    runStep(game); // guilty
    const modMember = pub(game).tracks.left.memberIds[0] ?? pub(game).tracks.right.memberIds[0];
    const modCand = game.getPrivateState(modMember).candidates[0];
    expect(() => game.handleAction(modMember, { type: 'propose', cardId: modCand.id })).toThrow(/REJECTED/);
  });

  it('unconfirm drops a confirmation and keeps the step open', () => {
    const game = mkGame(P5);
    game.start();
    toPicks(game);
    const s = pub(game);
    const side = s.tracks.left.memberIds.length >= 2 ? 'left' : 'right';
    const [a, b] = s.tracks[side].memberIds;
    game.handleAction(a, { type: 'propose', cardId: game.getPrivateState(a).candidates[0].id });
    game.handleAction(a, { type: 'unconfirm' });
    expect(pub(game).tracks[side].pick!.confirmedCount).toBe(0);
    game.handleAction(b, { type: 'confirm' });
    game.handleAction(a, { type: 'confirm' });
    expect(pub(game).tracks[side].pick!.locked).toBe(true);
  });
});

describe('DilemaGame — verdict + scoring', () => {
  it('has no timer during the verdict and needs the Maquinista to choose', () => {
    const game = mkGame(P5);
    game.start();
    toVerdict(game);
    expect(pub(game).phase).toBe('verdict');
    expect(game.getTimer()).toBeNull();
    game.onTurnTimeout(); // no-op — the verdict does not time out
    expect(pub(game).phase).toBe('verdict');
  });

  it('spares the other track and scores every player on it', () => {
    const game = mkGame(P5);
    game.start();
    toVerdict(game);
    const s0 = pub(game);
    const conductor = s0.conductorId!;
    const sparedIds = s0.tracks.right.memberIds;

    game.handleAction(conductor, { type: 'castVerdict', killedTrack: 'left' });
    const s = pub(game);
    expect(s.phase).toBe('roundResults');
    expect(s.killedTrack).toBe('left');
    expect(s.sparedTrack).toBe('right');
    expect(s.verdictWasAuto).toBe(false);
    for (const st of s.standings) {
      if (sparedIds.includes(st.playerId)) {
        expect(st.spared).toBe(1);
        expect(st.roundDelta).toBe(1);
      } else {
        expect(st.spared).toBe(0);
      }
    }
  });

  it('rejects a verdict from anyone but the Maquinista', () => {
    const game = mkGame(P5);
    game.start();
    toVerdict(game);
    const nonConductor = P5.find((p) => p.id !== pub(game).conductorId)!;
    expect(() => game.handleAction(nonConductor.id, { type: 'castVerdict', killedTrack: 'left' })).toThrow(
      /REJECTED/,
    );
  });

  it('coin-flips the verdict if the Maquinista disconnects', () => {
    const game = mkGame(P5, { random: () => 0.9 });
    game.start();
    toVerdict(game);
    game.setPlayerConnected(pub(game).conductorId!, false);
    const s = pub(game);
    expect(s.phase).toBe('roundResults');
    expect(s.verdictWasAuto).toBe(true);
    expect(s.killedTrack === 'left' || s.killedTrack === 'right').toBe(true);
  });
});

describe('DilemaGame — rounds, endgame, pause', () => {
  it('re-divides teams and rotates the Maquinista each round', () => {
    const game = mkGame();
    game.start();
    const r1 = pub(game).conductorId;
    playRound(game);
    game.onTurnTimeout(); // roundResults → round 2
    const s = pub(game);
    expect(s.round).toBe(2);
    expect(s.phase).toBe('assigning');
    expect(s.conductorId).not.toBe(r1);
  });

  it('runs the whole match then ends with the most-spared player as winner', () => {
    const game = mkGame(P5);
    game.start();
    for (let r = 1; r <= TOTAL_ROUNDS; r++) {
      playRound(game);
      game.onTurnTimeout();
    }
    const s = pub(game);
    expect(s.phase).toBe('gameover');
    expect(game.getStatus()).toBe('complete');
    expect(s.winnerId).toBeTruthy();
    expect(game.getTimer()).toBeNull();
    const top = s.standings[0];
    expect(s.standings.every((st) => st.spared <= top.spared)).toBe(true);
    expect(s.winnerId).toBe(top.playerId);
  });

  it('a disconnected team member no longer blocks the lock', () => {
    const game = mkGame(P5);
    game.start();
    toPicks(game);
    const s = pub(game);
    const side = s.tracks.left.memberIds.length >= 2 ? 'left' : 'right';
    const [a, b] = s.tracks[side].memberIds;
    game.handleAction(a, { type: 'propose', cardId: game.getPrivateState(a).candidates[0].id });
    expect(pub(game).tracks[side].pick!.locked).toBe(false);
    game.setPlayerConnected(b, false);
    expect(pub(game).tracks[side].pick!.locked).toBe(true);
  });

  it('rejects a non-player and the Maquinista confirming', () => {
    const game = mkGame();
    game.start();
    toPicks(game);
    const conductor = pub(game).conductorId!;
    expect(() => game.handleAction('ghost', { type: 'confirm' })).toThrow(/REJECTED/);
    expect(() => game.handleAction(conductor, { type: 'confirm' })).toThrow(/REJECTED/);
  });

  it('freezes the timer and rejects actions while paused', () => {
    const game = mkGame();
    game.start();
    game.pause(1000);
    expect(pub(game).phase).toBe('paused');
    expect(game.getTimer()).toBeNull();
    expect(() => game.handleAction('p2', { type: 'confirm' })).toThrow(/GAME_PAUSED/);
    game.resume(5000);
    expect(pub(game).phase).toBe('assigning');
  });
});
