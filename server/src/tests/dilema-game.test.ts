import { describe, expect, it } from 'vitest';
import { TOTAL_ROUNDS } from '../games/dilema/constants';
import { DilemaGame } from '../games/dilema/dilema-game';
import { planRound } from '../games/dilema/pairing';

const P3 = [
  { id: 'p1', name: 'Ana' },
  { id: 'p2', name: 'Bia' },
  { id: 'p3', name: 'Caio' },
];
const P5 = [
  ...P3,
  { id: 'p4', name: 'Duda' },
  { id: 'p5', name: 'Eli' },
];

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

/** assigning → playing */
const toPlaying = (game: DilemaGame): void => {
  game.onTurnTimeout();
};

/** Everyone who is not the Maquinista passes, draining `playing` → `verdict`. */
const passEveryone = (game: DilemaGame, players = P3): void => {
  const conductor = game.getPublicState().conductorId;
  for (const p of players) {
    if (p.id === conductor) continue;
    try {
      game.handleAction(p.id, { type: 'pass' });
    } catch {
      /* already advanced */
    }
  }
};

/** Run one whole round: assigning → playing → verdict → results (left dies). */
const playRound = (game: DilemaGame, players = P3): void => {
  toPlaying(game);
  passEveryone(game, players);
  const conductor = game.getPublicState().conductorId!;
  game.handleAction(conductor, { type: 'castVerdict', killedTrack: 'left' });
};

describe('DilemaGame — setup', () => {
  it('starts round 1 in the assigning phase with a Maquinista and two tracks', () => {
    const game = mkGame();
    game.start();
    const pub = game.getPublicState();

    expect(pub.phase).toBe('assigning');
    expect(pub.round).toBe(1);
    expect(pub.totalRounds).toBe(TOTAL_ROUNDS);
    expect(pub.conductorId).toBeTruthy();
    expect(game.getStatus()).toBe('active');

    const members = [...pub.tracks.left.memberIds, ...pub.tracks.right.memberIds];
    expect(members).toHaveLength(2); // 3 players − 1 Maquinista
    expect(members).not.toContain(pub.conductorId);
    expect(pub.tracks.left.cards).toHaveLength(1); // one seed innocent
    expect(pub.tracks.right.cards).toHaveLength(1);
    expect(pub.tracks.left.cards[0].type).toBe('innocent');
  });

  it('reports setup before start and rejects a malformed payload', () => {
    expect(mkGame().getStatus()).toBe('setup');
    const game = mkGame();
    game.start();
    expect(() => game.handleAction('p1', { type: 'nope' })).toThrow(/INVALID_ACTION/);
  });

  it('rejects fewer than three players', () => {
    const game = mkGame([P3[0], P3[1]]);
    expect(() => game.start()).toThrow(/INVALID_PLAYER_COUNT/);
  });

  it('deals a hand to every player except the Maquinista', () => {
    const game = mkGame(P5);
    game.start();
    const { conductorId } = game.getPublicState();
    for (const p of P5) {
      const priv = game.getPrivateState(p.id);
      if (p.id === conductorId) {
        expect(priv.isConductor).toBe(true);
        expect(priv.hand).toHaveLength(0);
        expect(priv.myTrack).toBeNull();
      } else {
        expect(priv.isConductor).toBe(false);
        expect(priv.hand).toHaveLength(5);
        expect(priv.myTrack === 'left' || priv.myTrack === 'right').toBe(true);
      }
    }
  });

  it('honours a lobby-chosen match length', () => {
    const game = mkGame(P3, { matchLength: 3 });
    game.start();
    expect(game.getPublicState().totalRounds).toBe(3);
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

describe('DilemaGame — playing phase', () => {
  it('auto-advances assigning → playing on timeout', () => {
    const game = mkGame();
    game.start();
    toPlaying(game);
    expect(game.getPublicState().phase).toBe('playing');
  });

  it('puts an innocent on your own track and a guilty on the enemy track', () => {
    const game = mkGame(P5);
    game.start();
    toPlaying(game);
    const { conductorId } = game.getPublicState();
    const me = P5.find((p) => p.id !== conductorId)!;
    const priv = game.getPrivateState(me.id);
    const myTrack = priv.myTrack!;
    const enemy = myTrack === 'left' ? 'right' : 'left';

    const innocent = priv.hand.find((c) => c.type === 'innocent')!;
    const guilty = priv.hand.find((c) => c.type === 'guilty')!;

    game.handleAction(me.id, { type: 'playCard', cardId: innocent.id, targetTrack: myTrack });
    game.handleAction(me.id, { type: 'playCard', cardId: guilty.id, targetTrack: enemy });

    const pub = game.getPublicState();
    expect(pub.tracks[myTrack].cards.some((c) => c.text === innocent.text && c.authorId === me.id)).toBe(true);
    expect(pub.tracks[enemy].cards.some((c) => c.text === guilty.text)).toBe(true);
  });

  it('rejects an innocent on the enemy track, a guilty on your own, and the Maquinista playing', () => {
    const game = mkGame(P5);
    game.start();
    toPlaying(game);
    const { conductorId } = game.getPublicState();
    const me = P5.find((p) => p.id !== conductorId)!;
    const priv = game.getPrivateState(me.id);
    const myTrack = priv.myTrack!;
    const enemy = myTrack === 'left' ? 'right' : 'left';
    const innocent = priv.hand.find((c) => c.type === 'innocent')!;
    const guilty = priv.hand.find((c) => c.type === 'guilty')!;

    expect(() =>
      game.handleAction(me.id, { type: 'playCard', cardId: innocent.id, targetTrack: enemy }),
    ).toThrow(/REJECTED/);
    expect(() =>
      game.handleAction(me.id, { type: 'playCard', cardId: guilty.id, targetTrack: myTrack }),
    ).toThrow(/REJECTED/);
    expect(() =>
      game.handleAction(conductorId!, { type: 'playCard', cardId: 'h0', targetTrack: 'left' }),
    ).toThrow(/REJECTED/);
  });

  it('staples a modifier onto a specific base card (and rejects a loose one)', () => {
    const game = mkGame(P5);
    game.start();
    toPlaying(game);
    const { conductorId } = game.getPublicState();
    const me = P5.find((p) => p.id !== conductorId)!;
    const priv = game.getPrivateState(me.id);
    const myTrack = priv.myTrack!;
    const modifier = priv.hand.find((c) => c.type === 'modifier')!;
    const seedId = game.getPublicState().tracks[myTrack].cards[0].id;

    expect(() =>
      game.handleAction(me.id, { type: 'playCard', cardId: modifier.id, targetTrack: myTrack }),
    ).toThrow(/REJECTED/);
    expect(() =>
      game.handleAction(me.id, { type: 'playCard', cardId: modifier.id, targetTrack: myTrack, targetCardId: 'nope' }),
    ).toThrow(/REJECTED/);

    game.handleAction(me.id, {
      type: 'playCard',
      cardId: modifier.id,
      targetTrack: myTrack,
      targetCardId: seedId,
    });
    const base = game.getPublicState().tracks[myTrack].cards.find((c) => c.id === seedId)!;
    expect(base.modifiers).toHaveLength(1);
    expect(base.modifiers[0].text).toBe(modifier.text);
  });

  it('advances to verdict once every non-Maquinista has passed', () => {
    const game = mkGame();
    game.start();
    toPlaying(game);
    passEveryone(game);
    expect(game.getPublicState().phase).toBe('verdict');
  });

  it('closes the playing window on timeout with whatever is on the tracks', () => {
    const game = mkGame(P5);
    game.start();
    toPlaying(game);
    const me = P5.find((p) => p.id !== game.getPublicState().conductorId)!;
    const priv = game.getPrivateState(me.id);
    game.handleAction(me.id, {
      type: 'playCard',
      cardId: priv.hand.find((c) => c.type === 'innocent')!.id,
      targetTrack: priv.myTrack!,
    });
    game.onTurnTimeout();
    expect(game.getPublicState().phase).toBe('verdict');
  });
});

describe('DilemaGame — verdict + scoring', () => {
  it('spares the other track and scores every player on it', () => {
    const game = mkGame(P5);
    game.start();
    toPlaying(game);
    passEveryone(game, P5);

    const pub0 = game.getPublicState();
    const conductor = pub0.conductorId!;
    const sparedSide = 'right';
    const killedSide = 'left';
    const sparedIds = pub0.tracks[sparedSide].memberIds;

    game.handleAction(conductor, { type: 'castVerdict', killedTrack: killedSide });

    const pub = game.getPublicState();
    expect(pub.phase).toBe('roundResults');
    expect(pub.killedTrack).toBe(killedSide);
    expect(pub.sparedTrack).toBe(sparedSide);
    expect(pub.verdictWasAuto).toBe(false);

    for (const s of pub.standings) {
      if (sparedIds.includes(s.playerId)) {
        expect(s.spared).toBe(1);
        expect(s.roundDelta).toBe(1);
      } else {
        expect(s.spared).toBe(0);
      }
    }
  });

  it('rejects a verdict from anyone but the Maquinista', () => {
    const game = mkGame(P5);
    game.start();
    toPlaying(game);
    passEveryone(game, P5);
    const nonConductor = P5.find((p) => p.id !== game.getPublicState().conductorId)!;
    expect(() =>
      game.handleAction(nonConductor.id, { type: 'castVerdict', killedTrack: 'left' }),
    ).toThrow(/REJECTED/);
  });

  it('coin-flips the verdict on timeout and flags it as auto', () => {
    const game = mkGame(P5, { random: () => 0.9 });
    game.start();
    toPlaying(game);
    passEveryone(game, P5);
    game.onTurnTimeout(); // verdict window elapses
    const pub = game.getPublicState();
    expect(pub.phase).toBe('roundResults');
    expect(pub.verdictWasAuto).toBe(true);
    expect(pub.killedTrack === 'left' || pub.killedTrack === 'right').toBe(true);
  });
});

describe('DilemaGame — rounds, endgame, pause', () => {
  it('re-divides teams and rotates the Maquinista each round', () => {
    const game = mkGame();
    game.start();
    const r1Conductor = game.getPublicState().conductorId;
    playRound(game);
    game.onTurnTimeout(); // roundResults → round 2
    const pub = game.getPublicState();
    expect(pub.round).toBe(2);
    expect(pub.phase).toBe('assigning');
    expect(pub.conductorId).not.toBe(r1Conductor);
  });

  it('runs the whole match then ends with the most-spared player as winner', () => {
    const game = mkGame(P5);
    game.start();
    for (let r = 1; r <= TOTAL_ROUNDS; r++) {
      playRound(game, P5);
      game.onTurnTimeout(); // leave results
    }
    const pub = game.getPublicState();
    expect(pub.phase).toBe('gameover');
    expect(game.getStatus()).toBe('complete');
    expect(pub.winnerId).toBeTruthy();
    expect(game.getTimer()).toBeNull();
    // The winner has the highest `spared` count.
    const top = pub.standings[0];
    expect(pub.standings.every((s) => s.spared <= top.spared)).toBe(true);
    expect(pub.winnerId).toBe(top.playerId);
  });

  it('freezes the timer and rejects actions while paused', () => {
    const game = mkGame();
    game.start();
    toPlaying(game);
    game.pause(1000);
    expect(game.getPublicState().phase).toBe('paused');
    expect(game.getTimer()).toBeNull();
    expect(() => game.handleAction('p2', { type: 'pass' })).toThrow(/GAME_PAUSED/);
    game.resume(5000);
    expect(game.getPublicState().phase).toBe('playing');
    expect(game.getTimer()).not.toBeNull();
  });
});
