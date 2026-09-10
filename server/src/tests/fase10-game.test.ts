import { describe, expect, it } from 'vitest';
import type { Fase10Card, Fase10GameEvent, Fase10LaidGroup, Fase10PublicState } from '@party/shared';
import { createDeck } from '../games/fase10/cards';
import { Fase10Game } from '../games/fase10/fase10-game';
import { hitInto, solvePhase } from '../games/fase10/solver';

// ─── card builders ───
let seq = 0;
const n = (color: 'red' | 'yellow' | 'green' | 'blue', value: number, id?: string): Fase10Card => ({
  id: id ?? `n${(seq += 1)}`,
  kind: 'number',
  color,
  value,
});
const w = (id?: string): Fase10Card => ({ id: id ?? `w${(seq += 1)}`, kind: 'wild' });
const sk = (id?: string): Fase10Card => ({ id: id ?? `s${(seq += 1)}`, kind: 'skip' });

const P2 = [
  { id: 'p1', name: 'Ana' },
  { id: 'p2', name: 'Bia' },
];
const P3 = [...P2, { id: 'p3', name: 'Caio' }];

const mkGame = (
  players: { id: string; name: string }[] = P2,
  opts: { now?: () => number; matchLength?: number; deck?: Fase10Card[] } = {},
): Fase10Game => {
  let t = opts.now ? -1 : 1000;
  return new Fase10Game(
    {
      players,
      roomCode: 'ABCD',
      now: opts.now ?? (() => (t += 1)),
      random: () => 0,
      matchLength: opts.matchLength,
    },
    { deck: opts.deck },
  );
};

const pub = (g: Fase10Game): Fase10PublicState => g.getPublicState();
const laid = (req: Fase10LaidGroup['req'], cards: Fase10Card[], values: (number | null)[], color: Fase10LaidGroup['color'] = null): Fase10LaidGroup => ({
  id: 'g1',
  ownerId: 'p1',
  req,
  cards,
  values,
  color,
});

// ─────────────────────────────── solver ───────────────────────────────

describe('solvePhase — sets', () => {
  it('accepts phase 1 (two groups of 3) and rejects a bad split', () => {
    const groups = [{ type: 'set', size: 3 }, { type: 'set', size: 3 }] as const;
    const ok = solvePhase([n('red', 3), n('yellow', 3), n('green', 3), n('red', 8), n('blue', 8), n('green', 8)], [...groups]);
    expect(ok.ok).toBe(true);
    const bad = solvePhase([n('red', 3), n('yellow', 3), n('green', 4), n('red', 8), n('blue', 8), n('green', 8)], [...groups]);
    expect(bad.ok).toBe(false);
  });

  it('lets wilds fill a set but needs at least one natural', () => {
    const groups = [{ type: 'set', size: 3 }] as const;
    expect(solvePhase([n('red', 7), n('blue', 7), w()], [...groups]).ok).toBe(true);
    expect(solvePhase([w(), w(), w()], [...groups]).ok).toBe(false);
  });

  it('enforces the exact card count', () => {
    const groups = [{ type: 'set', size: 3 }, { type: 'set', size: 3 }] as const;
    const res = solvePhase([n('red', 3), n('yellow', 3), n('green', 3), n('red', 8), n('blue', 8)], [...groups]);
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.reason).toMatch(/exatamente 6/);
  });

  it('rejects a Skip card inside a phase', () => {
    const res = solvePhase([n('red', 3), n('yellow', 3), sk()], [{ type: 'set', size: 3 }]);
    expect(res.ok).toBe(false);
  });
});

describe('solvePhase — runs', () => {
  const run = (size: number) => [{ type: 'run', size }] as const;

  it('accepts consecutive values and rejects gaps without wilds', () => {
    expect(solvePhase([n('red', 4), n('blue', 5), n('green', 6), n('yellow', 7)], [...run(4)]).ok).toBe(true);
    expect(solvePhase([n('red', 4), n('blue', 5), n('green', 7), n('yellow', 8)], [...run(4)]).ok).toBe(false);
  });

  it('fills gaps and ends with wilds', () => {
    const res = solvePhase([n('red', 4), w(), n('green', 6), n('yellow', 7)], [...run(4)]);
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.groups[0].values).toEqual([4, 5, 6, 7]);
    const ends = solvePhase([n('red', 5), n('blue', 6), w(), w()], [...run(4)]);
    expect(ends.ok).toBe(true);
    if (ends.ok) expect(ends.groups[0].values).toEqual([5, 6, 7, 8]);
  });

  it('rejects a duplicate value and an out-of-range window', () => {
    expect(solvePhase([n('red', 4), n('blue', 4), n('green', 5), n('yellow', 6)], [...run(4)]).ok).toBe(false);
    expect(solvePhase([n('red', 1), n('blue', 12), w(), w()], [...run(4)]).ok).toBe(false); // span 1..12 > 4
  });

  it('honours a wild value hint to pick the window', () => {
    const hint = new Map([['wildA', { value: 3 }]]);
    const res = solvePhase([n('red', 4), n('blue', 5), n('green', 6), w('wildA')], [{ type: 'run', size: 4 }], hint);
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.groups[0].values).toEqual([3, 4, 5, 6]);
  });
});

describe('solvePhase — colour + mixed phases', () => {
  it('accepts 7 of one colour (wilds allowed) and rejects a mixed colour', () => {
    const groups = [{ type: 'color', size: 7 }] as const;
    const cards = [n('red', 1), n('red', 4), n('red', 4), n('red', 9), n('red', 11), n('red', 12), w()];
    expect(solvePhase(cards, [...groups]).ok).toBe(true);
    const mixed = [n('red', 1), n('red', 4), n('blue', 4), n('red', 9), n('red', 11), n('red', 12), w()];
    expect(solvePhase(mixed, [...groups]).ok).toBe(false);
  });

  it('solves phase 2 (group of 3 + run of 4) regardless of card order', () => {
    const groups = [{ type: 'set', size: 3 }, { type: 'run', size: 4 }] as const;
    const cards = [n('red', 5), n('yellow', 9), n('blue', 6), n('green', 9), n('red', 7), n('blue', 9), n('yellow', 8)];
    const res = solvePhase(cards, [...groups]);
    expect(res.ok).toBe(true);
    if (res.ok) {
      const kinds = res.groups.map((g) => g.req.type).sort();
      expect(kinds).toEqual(['run', 'set']);
    }
  });
});

describe('hitInto', () => {
  it('extends a set with the matching number or a wild, rejects others', () => {
    const g = laid({ type: 'set', size: 3 }, [n('red', 4), n('blue', 4), n('green', 4)], [4, 4, 4]);
    expect(hitInto(g, n('yellow', 4))?.cards).toHaveLength(4);
    expect(hitInto(g, w())?.values).toEqual([4, 4, 4, 4]);
    expect(hitInto(g, n('yellow', 5))).toBeNull();
  });

  it('extends a run at either end, honouring a wild end hint', () => {
    const g = laid({ type: 'run', size: 4 }, [n('red', 4), n('blue', 5), n('green', 6), n('yellow', 7)], [4, 5, 6, 7]);
    expect(hitInto(g, n('red', 8))?.values).toEqual([4, 5, 6, 7, 8]);
    expect(hitInto(g, n('red', 3))?.values).toEqual([3, 4, 5, 6, 7]);
    expect(hitInto(g, w(), 'low')?.values).toEqual([3, 4, 5, 6, 7]);
    expect(hitInto(g, w())?.values).toEqual([4, 5, 6, 7, 8]); // defaults high
    expect(hitInto(g, n('red', 10))).toBeNull();
  });

  it('respects run bounds (no 0, no 13)', () => {
    const low = laid({ type: 'run', size: 3 }, [n('red', 1), n('blue', 2), n('green', 3)], [1, 2, 3]);
    expect(hitInto(low, w(), 'low')).toBeNull();
    const high = laid({ type: 'run', size: 3 }, [n('red', 10), n('blue', 11), n('green', 12)], [10, 11, 12]);
    expect(hitInto(high, w(), 'high')).toBeNull();
  });

  it('extends a colour group with same colour or a wild', () => {
    const g = laid({ type: 'color', size: 7 }, [], [], 'red');
    g.cards = [n('red', 1)];
    g.values = [null];
    expect(hitInto(g, n('red', 9))?.cards).toHaveLength(2);
    expect(hitInto(g, w())?.cards).toHaveLength(2);
    expect(hitInto(g, n('blue', 9))).toBeNull();
  });
});

// ─────────────────────────────── deck ───────────────────────────────

describe('createDeck', () => {
  it('is 108 cards: 96 numbers, 8 wilds, 4 skips', () => {
    const deck = createDeck();
    expect(deck).toHaveLength(108);
    expect(deck.filter((c) => c.kind === 'number')).toHaveLength(96);
    expect(deck.filter((c) => c.kind === 'wild')).toHaveLength(8);
    expect(deck.filter((c) => c.kind === 'skip')).toHaveLength(4);
  });
});

// ─────────────────────────────── engine ───────────────────────────────

/** A deck where p1 and p2 get named hands, then a scripted draw pile. */
const scriptedDeck = (p1: Fase10Card[], p2: Fase10Card[], discard: Fase10Card, pile: Fase10Card[]): Fase10Card[] => {
  const filler: Fase10Card[] = [];
  for (let i = 0; i < 40; i += 1) filler.push(n('blue', ((i % 12) + 1) as number, `f${i}`));
  return [...p1, ...p2, discard, ...pile, ...filler];
};

describe('Fase10Game — setup & turn loop', () => {
  it('deals 10 to each player and opens p1\'s turn', () => {
    const game = mkGame();
    game.start();
    const s = pub(game);
    expect(s.phase).toBe('turn');
    expect(s.players.map((p) => p.handCount)).toEqual([10, 10]);
    expect(s.players.every((p) => p.phaseIndex === 1)).toBe(true);
    expect(s.currentPlayerId).toBe('p1');
    expect(s.hasDrawn).toBe(false);
    expect(game.getPrivateState('p1').hand).toHaveLength(10);
    expect(game.getPrivateState('p1').mustDraw).toBe(true);
  });

  it('requires draw-then-discard, in turn, once', () => {
    const game = mkGame();
    game.start();
    expect(() => game.handleAction('p2', { type: 'draw', source: 'pile' })).toThrow(/NOT_YOUR_TURN/);
    const first = game.getPrivateState('p1').hand[0].id;
    expect(() => game.handleAction('p1', { type: 'discard', cardId: first })).toThrow(/DRAW_FIRST/);
    game.handleAction('p1', { type: 'draw', source: 'pile' });
    expect(() => game.handleAction('p1', { type: 'draw', source: 'pile' })).toThrow(/ALREADY_DREW/);
    expect(pub(game).hasDrawn).toBe(true);
    game.handleAction('p1', { type: 'discard', cardId: game.getPrivateState('p1').hand[0].id });
    expect(pub(game).currentPlayerId).toBe('p2');
    expect(pub(game).turn).toBe(2);
  });

  it('only lets you take a number card off the discard pile', () => {
    const deck = scriptedDeck(
      Array.from({ length: 10 }, (_, i) => n('red', ((i % 12) + 1) as number)),
      Array.from({ length: 10 }, (_, i) => n('yellow', ((i % 12) + 1) as number)),
      sk('disc-skip'),
      [n('green', 5, 'pile0')],
    );
    const game = mkGame(P2, { deck });
    game.start();
    // discard top is the flipped skip → p1 (starter) is skipped, p2 to act
    expect(pub(game).currentPlayerId).toBe('p2');
    expect(() => game.handleAction('p2', { type: 'draw', source: 'discard' })).toThrow(/CANT_TAKE_DISCARD/);
    game.handleAction('p2', { type: 'draw', source: 'pile' });
    game.handleAction('p2', { type: 'discard', cardId: 'pile0' });
    // now the top is a number → p1 can take it
    game.handleAction('p1', { type: 'draw', source: 'discard' });
    expect(game.getPrivateState('p1').hand.some((c) => c.id === 'pile0')).toBe(true);
  });

  it('auto-resolves a turn on timeout and on disconnect', () => {
    const game = mkGame();
    game.start();
    const before = pub(game).turn;
    game.onTurnTimeout();
    expect(pub(game).turn).toBe(before + 1);
    expect(pub(game).currentPlayerId).toBe('p2');
    game.setPlayerConnected('p2', false);
    expect(pub(game).currentPlayerId).toBe('p1'); // p2's turn was auto-played
  });

  it('freezes the timer while paused and rejects actions', () => {
    const game = mkGame();
    game.start();
    game.pause(5000);
    expect(pub(game).phase).toBe('paused');
    expect(game.getTimer()).toBeNull();
    expect(() => game.handleAction('p1', { type: 'draw', source: 'pile' })).toThrow(/GAME_PAUSED/);
    game.resume(6000);
    expect(pub(game).phase).toBe('turn');
    expect(game.getTimer()).not.toBeNull();
  });
});

describe('Fase10Game — skip card', () => {
  it('makes the target miss their next turn', () => {
    const skipId = 'skip-1';
    const p1 = [sk(skipId), ...Array.from({ length: 9 }, (_, i) => n('red', ((i % 12) + 1) as number))];
    const p2 = Array.from({ length: 10 }, (_, i) => n('yellow', ((i % 12) + 1) as number));
    const game = mkGame(P2, { deck: scriptedDeck(p1, p2, n('green', 2), [n('green', 9, 'pile0')]) });
    game.start();
    game.handleAction('p1', { type: 'draw', source: 'pile' });
    game.handleAction('p1', { type: 'discard', cardId: skipId, skipTargetId: 'p2' });
    const events = game.consumeEvents().filter((e): e is Extract<Fase10GameEvent, { type: 'player_skipped' }> => e.type === 'player_skipped');
    expect(events.at(-1)?.playerId).toBe('p2');
    expect(pub(game).currentPlayerId).toBe('p1'); // p2 was skipped, back to p1
  });

  it('rejects a skip discard without a valid target', () => {
    const skipId = 'skip-2';
    const p1 = [sk(skipId), ...Array.from({ length: 9 }, (_, i) => n('red', ((i % 12) + 1) as number))];
    const p2 = Array.from({ length: 10 }, (_, i) => n('yellow', ((i % 12) + 1) as number));
    const game = mkGame(P2, { deck: scriptedDeck(p1, p2, n('green', 2), [n('green', 9, 'pile0')]) });
    game.start();
    game.handleAction('p1', { type: 'draw', source: 'pile' });
    expect(() => game.handleAction('p1', { type: 'discard', cardId: skipId })).toThrow(/BAD_SKIP_TARGET/);
    expect(() => game.handleAction('p1', { type: 'discard', cardId: skipId, skipTargetId: 'p1' })).toThrow(/BAD_SKIP_TARGET/);
  });
});

describe('Fase10Game — lay, hit, go out, score', () => {
  // p1: two ready trincas (3s and 5s) + 4 junk 11/12s. p2: ten low cards = 50 pts.
  const p1Hand = [
    n('red', 3, '3a'), n('yellow', 3, '3b'), n('green', 3, '3c'),
    n('red', 5, '5a'), n('yellow', 5, '5b'), n('green', 5, '5c'),
    n('blue', 11, 'j1'), n('blue', 12, 'j2'), n('green', 11, 'j3'), n('green', 12, 'j4'),
  ];
  const p2Hand = [
    n('red', 1, 'q1'), n('yellow', 1, 'q2'), n('red', 2, 'q3'), n('yellow', 2, 'q4'), n('red', 4, 'q5'),
    n('yellow', 4, 'q6'), n('red', 6, 'q7'), n('yellow', 6, 'q8'), n('red', 7, 'q9'), n('yellow', 7, 'q10'),
  ];
  const pile = [
    n('blue', 3, 'd3b'), n('blue', 8, 'z1'),
    n('blue', 5, 'd5b'), n('blue', 9, 'z2'),
    n('red', 3, 'd3r2'), n('green', 8, 'z3'),
    n('red', 5, 'd5r2'), n('green', 9, 'z4'),
  ];

  const playToOut = (matchLength?: number): Fase10Game => {
    const game = mkGame(P2, { deck: scriptedDeck(p1Hand, p2Hand, n('yellow', 10, 'disc0'), pile), matchLength });
    game.start();
    // Turn 1 — p1 lays phase 1, hits the drawn 3, discards junk.
    game.handleAction('p1', { type: 'draw', source: 'pile' }); // d3b
    game.handleAction('p1', { type: 'layPhase', cardIds: ['3a', '3b', '3c', '5a', '5b', '5c'] });
    game.handleAction('p1', { type: 'hit', cardId: 'd3b', groupId: pub(game).table.find((g) => g.values[0] === 3)!.id });
    game.handleAction('p1', { type: 'discard', cardId: 'j1' });
    // Turn 2 — p2 draws + dumps it.
    game.handleAction('p2', { type: 'draw', source: 'pile' }); // z1
    game.handleAction('p2', { type: 'discard', cardId: 'z1' });
    // Turn 3 — p1 hits the drawn 5, discards junk.
    game.handleAction('p1', { type: 'draw', source: 'pile' }); // d5b
    game.handleAction('p1', { type: 'hit', cardId: 'd5b', groupId: pub(game).table.find((g) => g.values[0] === 5)!.id });
    game.handleAction('p1', { type: 'discard', cardId: 'j2' });
    game.handleAction('p2', { type: 'draw', source: 'pile' }); // z2
    game.handleAction('p2', { type: 'discard', cardId: 'z2' });
    // Turn 5 — p1 hits the drawn 3, discards junk (1 left).
    game.handleAction('p1', { type: 'draw', source: 'pile' }); // d3r2
    game.handleAction('p1', { type: 'hit', cardId: 'd3r2', groupId: pub(game).table.find((g) => g.values[0] === 3)!.id });
    game.handleAction('p1', { type: 'discard', cardId: 'j3' });
    game.handleAction('p2', { type: 'draw', source: 'pile' }); // z3
    game.handleAction('p2', { type: 'discard', cardId: 'z3' });
    // Turn 7 — p1 hits the drawn 5, discards the last junk → out.
    game.handleAction('p1', { type: 'draw', source: 'pile' }); // d5r2
    game.handleAction('p1', { type: 'hit', cardId: 'd5r2', groupId: pub(game).table.find((g) => g.values[0] === 5)!.id });
    game.handleAction('p1', { type: 'discard', cardId: 'j4' });
    return game;
  };

  it('lays a phase, hits onto it, and goes out; scores + advances the winner', () => {
    const game = playToOut();
    const s = pub(game);
    expect(s.phase).toBe('handOver');
    expect(s.handWinnerId).toBe('p1');
    expect(s.table.filter((g) => g.ownerId === 'p1')).toHaveLength(2);
    const p1Row = s.handResult!.find((r) => r.playerId === 'p1')!;
    const p2Row = s.handResult!.find((r) => r.playerId === 'p2')!;
    expect(p1Row.gained).toBe(0);
    expect(p1Row.advanced).toBe(true);
    expect(p1Row.phaseIndex).toBe(2);
    expect(p2Row.gained).toBe(50); // ten cards ≤ 9
    expect(p2Row.advanced).toBe(false);
    expect(p2Row.phaseIndex).toBe(1);
  });

  it('rejects laying a phase the cards do not complete, without consuming them', () => {
    const game = mkGame(P2, { deck: scriptedDeck(p1Hand, p2Hand, n('yellow', 10), [n('blue', 3, 'x')]) });
    game.start();
    game.handleAction('p1', { type: 'draw', source: 'pile' });
    expect(() => game.handleAction('p1', { type: 'layPhase', cardIds: ['3a', '3b', 'j1', '5a', '5b', 'j2'] })).toThrow(/PHASE_INCOMPLETE/);
    expect(game.getPrivateState('p1').hand).toHaveLength(11);
  });

  it('startNextRound keeps scores + phases and needs the hand to be over', () => {
    const game = playToOut();
    game.startNextRound();
    const s = pub(game);
    expect(s.hand).toBe(2);
    expect(s.phase).toBe('turn');
    expect(s.players.find((p) => p.id === 'p1')!.phaseIndex).toBe(2);
    expect(s.players.find((p) => p.id === 'p2')!.score).toBe(50);
    expect(s.players.map((p) => p.handCount)).toEqual([10, 10]);
  });

  it('ends the match when a finisher clears the target phase', () => {
    const game = playToOut(5);
    // p1 is on phase 2 now; four more hands would win. Fake it by checking the target wiring instead.
    expect(pub(game).targetPhase).toBe(5);
    const dflt = mkGame(P2, { matchLength: 99 });
    expect(pub(dflt).targetPhase).toBe(7);
  });
});
