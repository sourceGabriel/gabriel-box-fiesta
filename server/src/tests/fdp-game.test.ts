import { describe, expect, it } from 'vitest';
import { SWEEP_BONUS, TOTAL_ROUNDS, VOTE_POINTS } from '../games/fdp/constants';
import { FdpGame } from '../games/fdp/fdp-game';

const P3 = [
  { id: 'p1', name: 'Ana' },
  { id: 'p2', name: 'Bia' },
  { id: 'p3', name: 'Caio' },
];
const P4 = [...P3, { id: 'p4', name: 'Duda' }];

const mkGame = (
  playerList: { id: string; name: string }[] = P3,
  opts: { now?: () => number; random?: () => number } = {},
): FdpGame =>
  new FdpGame({
    players: playerList,
    roomCode: 'ABCD',
    now: opts.now ?? (() => 1000),
    random: opts.random ?? (() => 0),
  });

const answerEverything = (game: FdpGame, players = P3): void => {
  for (const p of players) {
    game.handleAction(p.id, { type: 'submitAnswer', text: `resposta de ${p.name}` });
  }
};

/** Every eligible voter picks their first option, draining the round to results. */
const voteEverything = (game: FdpGame, players = P3): void => {
  for (const p of players) {
    const { voteOptions, myVoteId } = game.getPrivateState(p.id);
    if (voteOptions.length > 0 && myVoteId === null) {
      game.handleAction(p.id, { type: 'castVote', answerId: voteOptions[0].id });
    }
  }
};

describe('FdpGame — setup', () => {
  it('starts round 1 in the writing phase with the prompt visible', () => {
    const game = mkGame();
    game.start();
    const pub = game.getPublicState();

    expect(pub.phase).toBe('writing');
    expect(pub.round).toBe(1);
    expect(pub.totalRounds).toBe(TOTAL_ROUNDS);
    expect(pub.roundKind).toBe('normal');
    expect(pub.prompt).toBeTruthy();
    expect(pub.answersExpectedCount).toBe(3);
    expect(game.getStatus()).toBe('active');

    for (const p of P3) {
      const priv = game.getPrivateState(p.id);
      expect(priv.pendingDecision).toBe('write');
      expect(priv.myAnswer).toBeNull();
    }
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

  it('clamps a long answer and rejects an empty one', () => {
    const game = mkGame();
    game.start();
    expect(() => game.handleAction('p1', { type: 'submitAnswer', text: '   ' })).toThrow(/REJECTED/);
    game.handleAction('p1', { type: 'submitAnswer', text: 'a'.repeat(400) });
    expect((game.getPrivateState('p1').myAnswer ?? '').length).toBe(100);
  });
});

describe('FdpGame — writing → voting', () => {
  it('auto-advances to voting once every answer is in, answers anonymous', () => {
    const game = mkGame();
    game.start();
    answerEverything(game);

    const pub = game.getPublicState();
    expect(pub.phase).toBe('voting');
    expect(pub.answers).toHaveLength(3);
    expect(pub.answers.every((a) => a.authorId === null && a.votes === null)).toBe(true);
  });

  it('hides a player\'s own answer from their vote options', () => {
    const game = mkGame();
    game.start();
    answerEverything(game);

    for (const p of P3) {
      const priv = game.getPrivateState(p.id);
      expect(priv.voteOptions).toHaveLength(2);
      expect(priv.voteOptions.some((o) => o.text === `resposta de ${p.name}`)).toBe(false);
      expect(priv.pendingDecision).toBe('vote');
    }
  });

  it('rejects voting your own answer, a bad id, or twice', () => {
    const game = mkGame();
    game.start();
    answerEverything(game);

    const mine = game.getPublicState().answers.find((a) => a.text === 'resposta de Ana')!;
    expect(() => game.handleAction('p1', { type: 'castVote', answerId: mine.id })).toThrow(/REJECTED/);
    expect(() => game.handleAction('p1', { type: 'castVote', answerId: 'nope' })).toThrow(/REJECTED/);

    const ok = game.getPrivateState('p1').voteOptions[0].id;
    game.handleAction('p1', { type: 'castVote', answerId: ok });
    expect(() => game.handleAction('p1', { type: 'castVote', answerId: ok })).toThrow(/REJECTED/);
  });
});

describe('FdpGame — scoring', () => {
  it('awards VOTE_POINTS per vote and marks the round winner', () => {
    const game = mkGame(P4);
    game.start();
    answerEverything(game, P4);

    const anaAnswer = game.getPublicState().answers.find((a) => a.text === 'resposta de Ana')!;
    // Bia, Caio and Duda all vote for Ana's answer.
    for (const pid of ['p2', 'p3', 'p4']) {
      game.handleAction(pid, { type: 'castVote', answerId: anaAnswer.id });
    }
    // Ana still owes a vote — pick anyone else's.
    game.handleAction('p1', { type: 'castVote', answerId: game.getPrivateState('p1').voteOptions[0].id });

    const pub = game.getPublicState();
    expect(pub.phase).toBe('roundResults');
    expect(pub.roundWinnerId).toBe('p1');
    const std = Object.fromEntries(pub.standings.map((s) => [s.playerId, s.score]));
    // 3 votes × VOTE_POINTS + sweep bonus (all 3 non-authors picked it).
    expect(std.p1).toBe(3 * VOTE_POINTS + SWEEP_BONUS);

    const revealed = pub.answers.find((a) => a.id === anaAnswer.id)!;
    expect(revealed.authorName).toBe('Ana');
    expect(revealed.votes).toBe(3);
    expect(revealed.isRoundWinner).toBe(true);
    expect(revealed.sweptVotes).toBe(true);
    expect(revealed.voterNames?.sort()).toEqual(['Bia', 'Caio', 'Duda']);
  });

  it('the final round pays double', () => {
    const game = mkGame(P4);
    game.start();
    for (let r = 1; r < TOTAL_ROUNDS; r++) {
      answerEverything(game, P4);
      voteEverything(game, P4);
      game.onTurnTimeout(); // leave results
    }
    const pub = game.getPublicState();
    expect(pub.round).toBe(TOTAL_ROUNDS);
    expect(pub.roundKind).toBe('final');

    answerEverything(game, P4);
    const anaAnswer = game.getPublicState().answers.find((a) => a.text === 'resposta de Ana')!;
    for (const pid of ['p2', 'p3']) {
      game.handleAction(pid, { type: 'castVote', answerId: anaAnswer.id });
    }
    game.handleAction('p1', { type: 'castVote', answerId: game.getPrivateState('p1').voteOptions[0].id });
    game.handleAction('p4', { type: 'castVote', answerId: game.getPrivateState('p4').voteOptions[0].id });

    const anaRound = game.getPublicState().standings.find((s) => s.playerId === 'p1')!.roundPoints;
    expect(anaRound).toBe(2 * VOTE_POINTS * 2); // 2 votes × per-vote × final ×2
  });
});

describe('FdpGame — timeouts, rounds, pause', () => {
  it('closes the writing window and moves to voting with whatever is in', () => {
    const game = mkGame();
    game.start();
    game.handleAction('p1', { type: 'submitAnswer', text: 'só a Ana escreveu' });
    game.onTurnTimeout();
    const pub = game.getPublicState();
    expect(pub.phase).toBe('voting');
    expect(pub.answers).toHaveLength(1);
  });

  it('skips the vote when nobody wrote anything', () => {
    const game = mkGame();
    game.start();
    game.onTurnTimeout(); // writing window elapsed, no answers
    expect(game.getPublicState().phase).toBe('roundResults');
  });

  it('runs the full match then ends with the top scorer as winner', () => {
    const game = mkGame(P4);
    game.start();
    for (let r = 1; r <= TOTAL_ROUNDS; r++) {
      answerEverything(game, P4);
      // Everyone votes for Ana so there is a clear winner.
      const anaAnswer = game.getPublicState().answers.find((a) => a.text === 'resposta de Ana')!;
      for (const pid of ['p2', 'p3', 'p4']) {
        game.handleAction(pid, { type: 'castVote', answerId: anaAnswer.id });
      }
      game.handleAction('p1', { type: 'castVote', answerId: game.getPrivateState('p1').voteOptions[0].id });
      game.onTurnTimeout(); // leave results
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
    expect(() => game.handleAction('p1', { type: 'submitAnswer', text: 'x' })).toThrow(/GAME_PAUSED/);
    game.resume(5000);
    expect(game.getPublicState().phase).toBe('writing');
    expect(game.getTimer()).not.toBeNull();
  });
});
