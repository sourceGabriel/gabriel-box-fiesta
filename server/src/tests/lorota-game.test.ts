import { describe, expect, it } from 'vitest';
import { FOOL_POINTS, TOTAL_ROUNDS, TRUTH_POINTS } from '../games/lorota/constants';
import { LorotaGame } from '../games/lorota/lorota-game';

const P3 = [
  { id: 'p1', name: 'Ana' },
  { id: 'p2', name: 'Bia' },
  { id: 'p3', name: 'Caio' },
];
const P4 = [...P3, { id: 'p4', name: 'Duda' }];

const mkGame = (
  playerList: { id: string; name: string }[] = P3,
  opts: { now?: () => number; random?: () => number } = {},
): LorotaGame =>
  new LorotaGame({
    players: playerList,
    roomCode: 'ABCD',
    now: opts.now ?? (() => 1000),
    random: opts.random ?? (() => 0),
  });

/** The real answer for the current round (reads engine internals, like the Coup tests). */
const truthOf = (game: LorotaGame): string =>
  (game as unknown as { question: { answer: string } }).question.answer;

/** Everyone submits a distinct lie. */
const lieEverything = (game: LorotaGame, players = P3): void => {
  for (const p of players) {
    game.handleAction(p.id, { type: 'submitLie', text: `mentira de ${p.name}` });
  }
};

/** Every eligible guesser picks their first option, draining the round to reveal. */
const guessEverything = (game: LorotaGame, players = P3): void => {
  for (const p of players) {
    const { guessOptions, myGuessId } = game.getPrivateState(p.id);
    if (guessOptions.length > 0 && myGuessId === null) {
      game.handleAction(p.id, { type: 'submitGuess', optionId: guessOptions[0].id });
    }
  }
};

describe('LorotaGame — setup', () => {
  it('starts round 1 in the lying phase with the prompt visible', () => {
    const game = mkGame();
    game.start();
    const pub = game.getPublicState();

    expect(pub.phase).toBe('lying');
    expect(pub.round).toBe(1);
    expect(pub.totalRounds).toBe(TOTAL_ROUNDS);
    expect(pub.roundKind).toBe('normal');
    expect(pub.prompt).toMatch(/___/);
    expect(pub.liesExpectedCount).toBe(3);
    expect(game.getStatus()).toBe('active');

    for (const p of P3) {
      const priv = game.getPrivateState(p.id);
      expect(priv.pendingDecision).toBe('lie');
      expect(priv.myLie).toBeNull();
    }
  });

  it('reports setup before start and rejects a malformed payload', () => {
    expect(mkGame().getStatus()).toBe('setup');
    const game = mkGame();
    game.start();
    expect(() => game.handleAction('p1', { type: 'nope' })).toThrow(/INVALID_ACTION/);
  });

  it('bounces a lie that is actually the truth (no lie stored, player flagged)', () => {
    const game = mkGame();
    game.start();
    const truth = truthOf(game);
    game.handleAction('p1', { type: 'submitLie', text: `  ${truth.toUpperCase()}.  ` }); // loose match, no throw
    expect(game.getPrivateState('p1').lieWasTheTruth).toBe(true);
    expect(game.getPrivateState('p1').myLie).toBeNull();

    game.handleAction('p1', { type: 'submitLie', text: 'algo bem diferente' });
    expect(game.getPrivateState('p1').lieWasTheTruth).toBe(false);
    expect(game.getPrivateState('p1').myLie).toBe('algo bem diferente');
  });

  it('clamps a long lie to the max length', () => {
    const game = mkGame();
    game.start();
    game.handleAction('p1', { type: 'submitLie', text: 'a'.repeat(500) });
    expect((game.getPrivateState('p1').myLie ?? '').length).toBe(90);
  });
});

describe('LorotaGame — lying → guessing', () => {
  it('auto-advances to guessing once every lie is in, options = lies + truth', () => {
    const game = mkGame();
    game.start();
    const truth = truthOf(game);
    lieEverything(game);

    const pub = game.getPublicState();
    expect(pub.phase).toBe('guessing');
    expect(pub.options).toHaveLength(4); // 3 lies + truth
    expect(pub.options.some((o) => o.text === truth)).toBe(true);
    expect(pub.options.every((o) => o.isTruth === null && o.authorIds === null)).toBe(true); // hidden while guessing
  });

  it('hides a player\'s own lie from their guess options', () => {
    const game = mkGame();
    game.start();
    lieEverything(game);

    for (const p of P3) {
      const priv = game.getPrivateState(p.id);
      expect(priv.guessOptions).toHaveLength(3); // 4 options minus my own lie
      expect(priv.guessOptions.some((o) => o.text === `mentira de ${p.name}`)).toBe(false);
      expect(priv.pendingDecision).toBe('guess');
    }
  });

  it('collapses identical lies into one option crediting every author', () => {
    const game = mkGame(P4);
    game.start();
    game.handleAction('p1', { type: 'submitLie', text: 'Batman' });
    game.handleAction('p2', { type: 'submitLie', text: '  batman.' }); // same, loose match
    game.handleAction('p3', { type: 'submitLie', text: 'Robin' });
    game.handleAction('p4', { type: 'submitLie', text: 'Coringa' });

    const pub = game.getPublicState();
    // 3 distinct lies (Batman collapsed) + truth = 4 options.
    expect(pub.options).toHaveLength(4);

    // p4 picks the "Batman" option → p1 AND p2 are credited.
    const p4Opts = game.getPrivateState('p4').guessOptions;
    const batman = p4Opts.find((o) => /batman/i.test(o.text))!;
    game.handleAction('p4', { type: 'submitGuess', optionId: batman.id });
    guessEverything(game, [P4[0], P4[1], P4[2]]);

    const std = Object.fromEntries(game.getPublicState().standings.map((s) => [s.playerId, s.roundPoints]));
    expect(std.p1).toBe(FOOL_POINTS);
    expect(std.p2).toBe(FOOL_POINTS);
  });

  it('rejects guessing your own lie, a bad id, or twice', () => {
    const game = mkGame();
    game.start();
    lieEverything(game);

    const mine = game.getPublicState().options.find((o) => o.text === 'mentira de Ana')!;
    expect(() => game.handleAction('p1', { type: 'submitGuess', optionId: mine.id })).toThrow(/REJECTED/);
    expect(() => game.handleAction('p1', { type: 'submitGuess', optionId: 'nope' })).toThrow(/REJECTED/);

    const ok = game.getPrivateState('p1').guessOptions[0].id;
    game.handleAction('p1', { type: 'submitGuess', optionId: ok });
    expect(() => game.handleAction('p1', { type: 'submitGuess', optionId: ok })).toThrow(/REJECTED/);
  });
});

describe('LorotaGame — scoring', () => {
  it('awards TRUTH_POINTS for finding the truth and FOOL_POINTS per player fooled', () => {
    const game = mkGame();
    game.start();
    const truth = truthOf(game);
    lieEverything(game);

    const truthOpt = game.getPublicState().options.find((o) => o.text === truth)!;
    const anaLie = game.getPublicState().options.find((o) => o.text === 'mentira de Ana')!;

    game.handleAction('p1', { type: 'submitGuess', optionId: truthOpt.id }); // Ana finds the truth
    game.handleAction('p2', { type: 'submitGuess', optionId: anaLie.id }); // Bia falls for Ana's lie
    game.handleAction('p3', { type: 'submitGuess', optionId: anaLie.id }); // Caio too

    const pub = game.getPublicState();
    expect(pub.phase).toBe('reveal');
    const std = Object.fromEntries(pub.standings.map((s) => [s.playerId, s.score]));
    expect(std.p1).toBe(TRUTH_POINTS + FOOL_POINTS * 2); // found truth + fooled 2
    expect(std.p2).toBe(0);
    expect(std.p3).toBe(0);

    // options carry authors + pickedBy after reveal
    const revealedLie = pub.options.find((o) => o.id === anaLie.id)!;
    expect(revealedLie.authorNames).toEqual(['Ana']);
    expect(revealedLie.pickedBy?.map((x) => x.playerId).sort()).toEqual(['p2', 'p3']);
    expect(game.getPrivateState('p1').foundTruth).toBe(true);
  });

  it('the final round pays double', () => {
    const game = mkGame();
    game.start();
    for (let r = 1; r <= 2; r++) {
      lieEverything(game);
      guessEverything(game);
      expect(game.getPublicState().round).toBe(r);
      game.onTurnTimeout(); // leave reveal
    }
    const pub = game.getPublicState();
    expect(pub.round).toBe(3);
    expect(pub.roundKind).toBe('final');

    const truth = truthOf(game);
    lieEverything(game);
    const truthOpt = game.getPublicState().options.find((o) => o.text === truth)!;
    game.handleAction('p1', { type: 'submitGuess', optionId: truthOpt.id });
    guessEverything(game, [P3[1], P3[2]]);

    const anaRound = game.getPublicState().standings.find((s) => s.playerId === 'p1')!.roundPoints;
    expect(anaRound).toBe(TRUTH_POINTS * 2);
  });
});

describe('LorotaGame — timeouts, rounds, pause', () => {
  it('closes the lying window and moves to guessing (options may be truth-only)', () => {
    const game = mkGame();
    game.start();
    game.handleAction('p1', { type: 'submitLie', text: 'só a Ana mentiu' });

    game.onTurnTimeout(); // lying window elapsed
    const pub = game.getPublicState();
    expect(pub.phase).toBe('guessing');
    expect(pub.options.length).toBeGreaterThanOrEqual(2); // Ana's lie + truth
  });

  it('closes the guessing window with the guesses it has', () => {
    const game = mkGame();
    game.start();
    lieEverything(game);
    game.onTurnTimeout(); // no guesses → straight to reveal
    expect(game.getPublicState().phase).toBe('reveal');
  });

  it('runs three rounds then ends with the top scorer as winner', () => {
    const game = mkGame();
    game.start();
    for (let r = 1; r <= TOTAL_ROUNDS; r++) {
      lieEverything(game);
      // p1 always finds the truth so there is a clear winner
      const truth = truthOf(game);
      const truthOpt = game.getPublicState().options.find((o) => o.text === truth)!;
      game.handleAction('p1', { type: 'submitGuess', optionId: truthOpt.id });
      guessEverything(game, [P3[1], P3[2]]);
      game.onTurnTimeout(); // leave reveal
    }
    const pub = game.getPublicState();
    expect(pub.phase).toBe('gameover');
    expect(game.getStatus()).toBe('complete');
    expect(pub.winnerId).toBe('p1');
    expect(pub.truthText).not.toBeNull();
    expect(game.getTimer()).toBeNull();
  });

  it('freezes the timer and rejects actions while paused', () => {
    const game = mkGame();
    game.start();
    game.pause(1000);
    expect(game.getPublicState().phase).toBe('paused');
    expect(game.getTimer()).toBeNull();
    expect(() => game.handleAction('p1', { type: 'submitLie', text: 'x' })).toThrow(/GAME_PAUSED/);
    game.resume(5000);
    expect(game.getPublicState().phase).toBe('lying');
    expect(game.getTimer()).not.toBeNull();
  });
});
