import { describe, expect, it } from 'vitest';
import { CORRECT_POINTS, STREAK_STEP, TOTAL_ROUNDS } from '../games/sabetudo/constants';
import { SabeTudoGame } from '../games/sabetudo/sabetudo-game';

const P2 = [
  { id: 'p1', name: 'Ana' },
  { id: 'p2', name: 'Bia' },
];
const P3 = [...P2, { id: 'p3', name: 'Caio' }];

const mkGame = (
  playerList: { id: string; name: string }[] = P3,
  opts: { now?: () => number; random?: () => number; matchLength?: number } = {},
): SabeTudoGame =>
  new SabeTudoGame({
    players: playerList,
    roomCode: 'ABCD',
    now: opts.now ?? (() => 1000),
    random: opts.random ?? (() => 0),
    matchLength: opts.matchLength,
  });

/** The correct option index for the current question (reads engine internals, like the Lorota tests). */
const correctOf = (game: SabeTudoGame): number =>
  (game as unknown as { active: { correctIndex: number } }).active.correctIndex;

const wrongIndex = (correct: number): number => (correct === 0 ? 1 : 0);

describe('SabeTudoGame — match length', () => {
  it('defaults to TOTAL_ROUNDS when no matchLength is given', () => {
    expect(mkGame().getPublicState().totalRounds).toBe(TOTAL_ROUNDS);
  });
  it('honours a lobby-chosen matchLength', () => {
    const game = mkGame(P3, { matchLength: 16 });
    game.start();
    expect(game.getPublicState().totalRounds).toBe(16);
  });
});

describe('SabeTudoGame — setup', () => {
  it('starts round 1 in the question phase with four options visible', () => {
    const game = mkGame();
    game.start();
    const pub = game.getPublicState();

    expect(pub.phase).toBe('question');
    expect(pub.round).toBe(1);
    expect(pub.totalRounds).toBe(TOTAL_ROUNDS);
    expect(pub.question).toBeTruthy();
    expect(pub.options).toHaveLength(4);
    expect(pub.answersExpectedCount).toBe(3);
    expect(pub.correctIndex).toBeNull();
    expect(game.getStatus()).toBe('active');

    for (const p of P3) {
      const priv = game.getPrivateState(p.id);
      expect(priv.pendingDecision).toBe('answer');
      expect(priv.myAnswerIndex).toBeNull();
    }
  });

  it('reports setup before start and rejects a malformed payload', () => {
    expect(mkGame().getStatus()).toBe('setup');
    const game = mkGame();
    game.start();
    expect(() => game.handleAction('p1', { type: 'nope' })).toThrow(/INVALID_ACTION/);
    expect(() => game.handleAction('p1', { type: 'submitAnswer', optionIndex: 9 })).toThrow(/INVALID_ACTION/);
  });

  it('rejects fewer than two players', () => {
    const game = mkGame([{ id: 'p1', name: 'Solo' }]);
    expect(() => game.start()).toThrow(/INVALID_PLAYER_COUNT/);
  });

  it('locks a player answer — a second submit is rejected', () => {
    const game = mkGame();
    game.start();
    const c = correctOf(game);
    game.handleAction('p1', { type: 'submitAnswer', optionIndex: c });
    expect(game.getPrivateState('p1').myAnswerIndex).toBe(c);
    expect(() => game.handleAction('p1', { type: 'submitAnswer', optionIndex: wrongIndex(c) })).toThrow(/REJECTED/);
  });
});

describe('SabeTudoGame — question → reveal', () => {
  it('auto-advances to reveal once every connected player has answered', () => {
    const game = mkGame();
    game.start();
    const c = correctOf(game);
    for (const p of P3) game.handleAction(p.id, { type: 'submitAnswer', optionIndex: c });

    const pub = game.getPublicState();
    expect(pub.phase).toBe('reveal');
    expect(pub.correctIndex).toBe(c);
    expect(pub.optionResults).not.toBeNull();
    const correctResult = pub.optionResults!.find((r) => r.correct)!;
    expect(correctResult.count).toBe(3);
    expect(correctResult.pickedBy.map((x) => x.playerId).sort()).toEqual(['p1', 'p2', 'p3']);
  });

  it('a wrong answer scores nothing and resets the streak; correct scores at least the base', () => {
    const game = mkGame();
    game.start();
    const c = correctOf(game);
    game.handleAction('p1', { type: 'submitAnswer', optionIndex: c });
    game.handleAction('p2', { type: 'submitAnswer', optionIndex: wrongIndex(c) });
    game.handleAction('p3', { type: 'submitAnswer', optionIndex: wrongIndex(c) });

    const std = Object.fromEntries(game.getPublicState().standings.map((s) => [s.playerId, s]));
    expect(std.p1.score).toBeGreaterThanOrEqual(CORRECT_POINTS);
    expect(std.p2.score).toBe(0);
    expect(std.p2.streak).toBe(0);
    expect(std.p1.streak).toBe(1);
  });

  it('a faster correct answer scores more than a slower one', () => {
    let clock = 1000;
    const game = mkGame(P2, { now: () => clock });
    game.start();
    const c = correctOf(game);
    clock = 1000; // Ana answers instantly
    game.handleAction('p1', { type: 'submitAnswer', optionIndex: c });
    clock = 1000 + 20_000; // Bia answers near the buzzer
    game.handleAction('p2', { type: 'submitAnswer', optionIndex: c });

    const std = Object.fromEntries(game.getPublicState().standings.map((s) => [s.playerId, s.score]));
    expect(std.p1).toBeGreaterThan(std.p2);
  });

  it('builds a streak bonus over consecutive correct answers', () => {
    let clock = 1000;
    const game = mkGame(P2, { now: () => clock });
    game.start();
    // Round 1: both instant-correct.
    for (let r = 1; r <= 2; r++) {
      const c = correctOf(game);
      game.handleAction('p1', { type: 'submitAnswer', optionIndex: c });
      game.handleAction('p2', { type: 'submitAnswer', optionIndex: c });
      clock += 1; // leave reveal
      game.onTurnTimeout();
    }
    const c3 = correctOf(game);
    game.handleAction('p1', { type: 'submitAnswer', optionIndex: c3 });
    game.handleAction('p2', { type: 'submitAnswer', optionIndex: c3 });
    // p1's 3rd correct in a row carries a +2*STREAK_STEP bonus vs a lone correct.
    const p1 = game.getPublicState().standings.find((s) => s.playerId === 'p1')!;
    expect(p1.streak).toBe(3);
    expect(p1.roundPoints).toBeGreaterThanOrEqual(CORRECT_POINTS + 2 * STREAK_STEP);
  });
});

describe('SabeTudoGame — timeouts, rounds, pause', () => {
  it('closes the question window with the answers it has', () => {
    const game = mkGame();
    game.start();
    const c = correctOf(game);
    game.handleAction('p1', { type: 'submitAnswer', optionIndex: c });
    game.onTurnTimeout(); // p2/p3 never answered
    const pub = game.getPublicState();
    expect(pub.phase).toBe('reveal');
    const std = Object.fromEntries(pub.standings.map((s) => [s.playerId, s.score]));
    expect(std.p1).toBeGreaterThanOrEqual(CORRECT_POINTS);
    expect(std.p2).toBe(0);
  });

  it('runs the full match then ends with the top scorer as winner', () => {
    const game = mkGame();
    game.start();
    for (let r = 1; r <= TOTAL_ROUNDS; r++) {
      const c = correctOf(game);
      game.handleAction('p1', { type: 'submitAnswer', optionIndex: c }); // p1 always right
      game.onTurnTimeout(); // close question
      expect(game.getPublicState().phase).toBe('reveal');
      game.onTurnTimeout(); // leave reveal
    }
    const pub = game.getPublicState();
    expect(pub.phase).toBe('gameover');
    expect(game.getStatus()).toBe('complete');
    expect(pub.winnerId).toBe('p1');
    expect(game.getTimer()).toBeNull();
  });

  it('freezes the timer and rejects actions while paused', () => {
    const game = mkGame();
    game.start();
    game.pause(1000);
    expect(game.getPublicState().phase).toBe('paused');
    expect(game.getTimer()).toBeNull();
    expect(() => game.handleAction('p1', { type: 'submitAnswer', optionIndex: 0 })).toThrow(/GAME_PAUSED/);
    game.resume(5000);
    expect(game.getPublicState().phase).toBe('question');
    expect(game.getTimer()).not.toBeNull();
  });
});
