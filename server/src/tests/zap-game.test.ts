import { describe, expect, it } from 'vitest';
import { POINTS_PER_VOTE, SWEEP_BONUS, TOTAL_ROUNDS } from '../games/zap/constants';
import { ZapGame } from '../games/zap/zap-game';

const P3 = [
  { id: 'p1', name: 'Ana' },
  { id: 'p2', name: 'Bia' },
  { id: 'p3', name: 'Caio' },
];
const P4 = [...P3, { id: 'p4', name: 'Duda' }];

const mkGame = (
  playerList: { id: string; name: string }[] = P3,
  opts: { now?: () => number; random?: () => number } = {},
): ZapGame =>
  new ZapGame({
    players: playerList,
    roomCode: 'ABCD',
    now: opts.now ?? (() => 1000),
    random: opts.random ?? (() => 0),
  });

/** Submit an answer for every assignment every player owns this round. */
const answerEverything = (game: ZapGame, players = P3): void => {
  for (const p of players) {
    for (const a of game.getPrivateState(p.id).assignments) {
      game.handleAction(p.id, { type: 'submitAnswer', slot: a.slot, text: `${p.name} #${a.slot}` });
    }
  }
};

/** Every eligible voter votes for their first ballot option, draining the round to results. */
const voteEverything = (game: ZapGame, players = P3): void => {
  for (let guard = 0; guard < 50 && game.getPublicState().phase === 'voting'; guard++) {
    let progressed = false;
    for (const p of players) {
      const { ballot } = game.getPrivateState(p.id);
      if (ballot && ballot.votedSlot === null) {
        game.handleAction(p.id, { type: 'castVote', duelIndex: ballot.duelIndex, slot: ballot.options[0].slot });
        progressed = true;
      }
    }
    if (!progressed) break;
  }
};

describe('ZapGame — setup', () => {
  it('starts round 1 in the answering phase with 2 prompts per player', () => {
    const game = mkGame();
    game.start();
    const pub = game.getPublicState();

    expect(pub.phase).toBe('answering');
    expect(pub.round).toBe(1);
    expect(pub.totalRounds).toBe(TOTAL_ROUNDS);
    expect(pub.roundKind).toBe('normal');
    expect(pub.activePrompt).toBeNull();
    expect(pub.answersExpectedCount).toBe(6); // 3 players × 2
    expect(game.getStatus()).toBe('active');

    for (const p of P3) {
      const priv = game.getPrivateState(p.id);
      expect(priv.assignments).toHaveLength(2);
      expect(priv.assignments.every((a) => a.prompt.length > 0 && a.answer === null)).toBe(true);
      expect(priv.pendingDecision).toBe('answer');
      expect(priv.submittedAll).toBe(false);
    }
  });

  it('reports setup before start', () => {
    expect(mkGame().getStatus()).toBe('setup');
  });

  it('rejects a malformed payload', () => {
    const game = mkGame();
    game.start();
    expect(() => game.handleAction('p1', { type: 'nope' })).toThrow(/INVALID_ACTION/);
  });

  it('rejects an answer for a prompt the player was not assigned', () => {
    const game = mkGame();
    game.start();
    expect(() => game.handleAction('p1', { type: 'submitAnswer', slot: 5, text: 'x' })).toThrow(/REJECTED/);
  });

  it('rejects an empty answer', () => {
    const game = mkGame();
    game.start();
    expect(() => game.handleAction('p1', { type: 'submitAnswer', slot: 0, text: '   ' })).toThrow(/REJECTED/);
  });

  it('clamps a long answer to the max length', () => {
    const game = mkGame();
    game.start();
    game.handleAction('p1', { type: 'submitAnswer', slot: 0, text: 'a'.repeat(500) });
    const stored = game.getPrivateState('p1').assignments.find((a) => a.slot === 0)?.answer ?? '';
    expect(stored.length).toBe(80);
  });
});

describe('ZapGame — answering → voting', () => {
  it('auto-advances to voting once every answer is in, building one duel per player', () => {
    const game = mkGame();
    game.start();
    answerEverything(game);

    const pub = game.getPublicState();
    expect(pub.phase).toBe('voting');
    expect(pub.currentDuelIndex).toBe(0);
    expect(pub.duels).toHaveLength(1); // only duels up to the current one are exposed
    expect(pub.duels[0].answers).toHaveLength(2);
    expect(pub.duels[0].answers.every((a) => a.authorId === null)).toBe(true); // authors hidden while voting
  });

  it('gives a 2-option ballot to the one non-contestant and nothing to the contestants', () => {
    const game = mkGame();
    game.start();
    answerEverything(game);

    const duel0Authors = new Set<string>();
    let voterCount = 0;
    for (const p of P3) {
      const priv = game.getPrivateState(p.id);
      if (priv.ballot) {
        voterCount += 1;
        expect(priv.ballot.options).toHaveLength(2);
        expect(priv.pendingDecision).toBe('vote');
      } else {
        expect(priv.pendingDecision).toBe('wait');
        duel0Authors.add(p.id);
      }
    }
    expect(voterCount).toBe(1);
    expect(duel0Authors.size).toBe(2);
  });

  it('rejects voting for your own answer, out of turn, twice, or on a stale duel', () => {
    const game = mkGame(P4);
    game.start();
    answerEverything(game, P4);

    const voter = P4.find((p) => game.getPrivateState(p.id).ballot)!;
    const ballot = game.getPrivateState(voter.id).ballot!;
    // stale duel index
    expect(() => game.handleAction(voter.id, { type: 'castVote', duelIndex: 9, slot: 0 })).toThrow(/REJECTED/);
    // a contestant of duel 0 cannot vote in it
    const contestant = P4.find((p) => !game.getPrivateState(p.id).ballot)!;
    expect(() =>
      game.handleAction(contestant.id, { type: 'castVote', duelIndex: 0, slot: 0 }),
    ).toThrow(/REJECTED/);
    // valid vote, then a second one is refused
    game.handleAction(voter.id, { type: 'castVote', duelIndex: ballot.duelIndex, slot: ballot.options[0].slot });
    expect(() =>
      game.handleAction(voter.id, { type: 'castVote', duelIndex: ballot.duelIndex, slot: ballot.options[0].slot }),
    ).toThrow(/REJECTED/);
  });
});

describe('ZapGame — scoring', () => {
  it('awards 100 per vote and a sweep bonus when a 2-way duel is unanimous', () => {
    const game = mkGame();
    game.start();
    answerEverything(game);
    voteEverything(game);

    const pub = game.getPublicState();
    expect(pub.phase).toBe('roundResults');
    expect(pub.standings).toHaveLength(3);
    // Every 3-player normal duel has exactly one voter → each decided duel is a sweep.
    const top = pub.standings[0];
    expect(top.score).toBe(POINTS_PER_VOTE + SWEEP_BONUS);
    expect(pub.duels.every((d) => d.result !== null)).toBe(true);
    expect(pub.duels[0].answers.every((a) => a.authorId !== null)).toBe(true); // revealed after voting
  });

  it('splits votes without a sweep bonus on a tie', () => {
    const game = mkGame(P4);
    game.start();
    answerEverything(game, P4);

    // duel 0 has two eligible voters — send them to opposite answers.
    const voters = P4.filter((p) => game.getPrivateState(p.id).ballot);
    expect(voters).toHaveLength(2);
    const b0 = game.getPrivateState(voters[0].id).ballot!;
    game.handleAction(voters[0].id, { type: 'castVote', duelIndex: 0, slot: b0.options[0].slot });
    const b1 = game.getPrivateState(voters[1].id).ballot!;
    game.handleAction(voters[1].id, { type: 'castVote', duelIndex: 0, slot: b1.options[1].slot });

    const duel0 = game.getPublicState().duels[0];
    expect(duel0.result).not.toBeNull();
    expect(duel0.result!.winnerSlot).toBeNull();
    expect(duel0.result!.zap).toBe(false);
    expect(duel0.result!.pointsAwarded.every((a) => a.points === POINTS_PER_VOTE)).toBe(true);
  });
});

describe('ZapGame — timeouts & rounds', () => {
  it('fills blanks and moves on when the answering window expires', () => {
    const game = mkGame();
    game.start();
    game.handleAction('p1', { type: 'submitAnswer', slot: 0, text: 'só uma' });

    game.onTurnTimeout(); // answering window elapsed

    const pub = game.getPublicState();
    expect(pub.phase).toBe('voting');
    // p1's other prompt + everyone else's are blanks; some duels may collapse.
    expect(pub.duels[0].answers.some((a) => a.isBlank)).toBe(true);
  });

  it('closes a duel with the votes it has when the voting window expires', () => {
    const game = mkGame();
    game.start();
    answerEverything(game);
    expect(game.getPublicState().phase).toBe('voting');

    game.onTurnTimeout(); // no votes cast → duel 0 closes 0-0
    const duel0 = game.getPublicState().duels[0];
    expect(duel0.result).not.toBeNull();
    expect(duel0.result!.winnerSlot).toBeNull();
  });

  it('advances to the next round after the results window, and round 3 is the final', () => {
    const game = mkGame();
    game.start();

    // Rounds 1 and 2.
    for (let r = 1; r <= 2; r++) {
      answerEverything(game);
      voteEverything(game);
      expect(game.getPublicState().round).toBe(r);
      game.onTurnTimeout(); // leave roundResults
    }

    const pub = game.getPublicState();
    expect(pub.round).toBe(3);
    expect(pub.roundKind).toBe('final');
    expect(pub.phase).toBe('answering');
    expect(pub.activePrompt).not.toBeNull();
    for (const p of P3) {
      expect(game.getPrivateState(p.id).assignments).toHaveLength(1);
    }
  });

  it('the final round is one N-way duel worth triple, then the game ends', () => {
    const game = mkGame();
    game.start();
    for (let r = 1; r <= 2; r++) {
      answerEverything(game);
      voteEverything(game);
      game.onTurnTimeout();
    }
    // Final round.
    answerEverything(game);
    const votingPub = game.getPublicState();
    expect(votingPub.duels[0].answers).toHaveLength(3); // everyone in one duel

    voteEverything(game);
    expect(game.getPublicState().phase).toBe('roundResults');

    // A final-round vote is worth 3× (300), no 2-way sweep bonus.
    const scored = game.getPublicState().standings.find((s) => s.roundPoints > 0);
    expect(scored!.roundPoints % (POINTS_PER_VOTE * 3)).toBe(0);

    game.onTurnTimeout(); // leave the last roundResults
    const done = game.getPublicState();
    expect(done.phase).toBe('gameover');
    expect(game.getStatus()).toBe('complete');
    expect(done.winnerId).toBe(done.standings[0].playerId);
    expect(game.getTimer()).toBeNull();
  });
});

describe('ZapGame — pause', () => {
  it('freezes the timer and rejects actions while paused', () => {
    const game = mkGame(P3, { now: () => 1000 });
    game.start();
    game.pause(1000);

    expect(game.getPublicState().phase).toBe('paused');
    expect(game.getTimer()).toBeNull();
    expect(() => game.handleAction('p1', { type: 'submitAnswer', slot: 0, text: 'x' })).toThrow(/GAME_PAUSED/);

    game.resume(5000);
    expect(game.getPublicState().phase).toBe('answering');
    expect(game.getTimer()).not.toBeNull();
  });
});
