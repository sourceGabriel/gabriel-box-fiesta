import { describe, expect, it } from 'vitest';
import {
  CONSENSUS_POINTS,
  JOKER_COUNT,
  PICK_WINNER_BONUS,
  ROUND_PLAN,
  TOTAL_ROUNDS,
  VOTE_POINTS,
} from '../games/evoce/constants';
import { EvoceGame } from '../games/evoce/evoce-game';

const P3 = [
  { id: 'p1', name: 'Ana' },
  { id: 'p2', name: 'Bia' },
  { id: 'p3', name: 'Caio' },
];
const P4 = [...P3, { id: 'p4', name: 'Duda' }];

const mkGame = (
  playerList: { id: string; name: string }[] = P4,
  opts: { now?: () => number; random?: () => number } = {},
): EvoceGame =>
  new EvoceGame({
    players: playerList,
    roomCode: 'ABCD',
    now: opts.now ?? (() => 1000),
    random: opts.random ?? (() => 0),
  });

const dot = () => ({ strokes: [{ color: '#000', width: 8, points: [10, 10, 20, 20] }] });

/** Drain whatever the current round needs so we land in roundResults, then leave it. */
const playRound = (game: EvoceGame, players = P4): void => {
  const pub = game.getPublicState();
  if (pub.roundKind === 'enquete') {
    for (const p of players) game.handleAction(p.id, { type: 'votePlayer', targetId: players[0].id });
  } else {
    for (const p of players) {
      const priv = game.getPrivateState(p.id);
      if (priv.isDrawTarget) continue;
      if (pub.roundKind === 'legenda') game.handleAction(p.id, { type: 'submitCaption', text: `de ${p.name}` });
      else game.handleAction(p.id, { type: 'submitDrawing', drawing: dot() });
    }
    // voting
    for (const p of players) {
      const { voteOptions, myVoteId } = game.getPrivateState(p.id);
      if (voteOptions.length > 0 && myVoteId === null) {
        game.handleAction(p.id, { type: 'castVote', submissionId: voteOptions[0].id });
      }
    }
  }
  expect(game.getPublicState().phase).toBe('roundResults');
  game.onTurnTimeout();
};

describe('EvoceGame — setup', () => {
  it('starts round 1 as an enquete with the prompt visible', () => {
    const game = mkGame();
    game.start();
    const pub = game.getPublicState();
    expect(pub.phase).toBe('answering');
    expect(pub.round).toBe(1);
    expect(pub.totalRounds).toBe(TOTAL_ROUNDS);
    expect(pub.roundKind).toBe('enquete');
    expect(pub.prompt).toBeTruthy();
    expect(pub.answersExpectedCount).toBe(4);
    expect(pub.players.every((p) => p.jokersLeft === JOKER_COUNT)).toBe(true);
    expect(game.getStatus()).toBe('active');
    for (const p of P4) expect(game.getPrivateState(p.id).pendingDecision).toBe('vote_player');
  });

  it('rejects fewer than 3 players and a malformed payload', () => {
    expect(() => mkGame([P3[0], P3[1]]).start()).toThrow(/INVALID_PLAYER_COUNT/);
    const game = mkGame();
    game.start();
    expect(() => game.handleAction('p1', { type: 'nope' })).toThrow(/INVALID_ACTION/);
  });
});

describe('EvoceGame — enquete', () => {
  it('scores by consensus: everyone who voted together gets points per other agreer', () => {
    const game = mkGame();
    game.start();
    // p1,p2,p3 vote Caio; p4 votes Ana.
    game.handleAction('p1', { type: 'votePlayer', targetId: 'p3' });
    game.handleAction('p2', { type: 'votePlayer', targetId: 'p3' });
    game.handleAction('p3', { type: 'votePlayer', targetId: 'p3' });
    game.handleAction('p4', { type: 'votePlayer', targetId: 'p1' });

    const pub = game.getPublicState();
    expect(pub.phase).toBe('roundResults');
    expect(pub.pollWinnerId).toBe('p3');
    const std = Object.fromEntries(pub.standings.map((s) => [s.playerId, s.score]));
    expect(std.p1).toBe(CONSENSUS_POINTS * 2); // agreed with 2 others
    expect(std.p2).toBe(CONSENSUS_POINTS * 2);
    expect(std.p3).toBe(CONSENSUS_POINTS * 2);
    expect(std.p4).toBe(0); // voted alone
    expect(game.getPrivateState('p1').matchedGroup).toBe(true);
    expect(game.getPrivateState('p4').matchedGroup).toBe(false);
  });

  it('a Curinga doubles your enquete points when your vote matches the group pick, and is spent either way', () => {
    const game = mkGame();
    game.start();
    game.handleAction('p1', { type: 'playJoker' });
    expect(game.getPrivateState('p1').jokersLeft).toBe(JOKER_COUNT - 1);
    game.handleAction('p1', { type: 'votePlayer', targetId: 'p2' });
    game.handleAction('p2', { type: 'votePlayer', targetId: 'p2' });
    game.handleAction('p3', { type: 'votePlayer', targetId: 'p2' });
    game.handleAction('p4', { type: 'votePlayer', targetId: 'p1' });

    const std = Object.fromEntries(game.getPublicState().standings.map((s) => [s.playerId, s.score]));
    // p1 agreed with p2 and p3 (2 others) → base 2*CONSENSUS, doubled by the Curinga.
    expect(std.p1).toBe(CONSENSUS_POINTS * 2 * 2);
    expect(std.p2).toBe(CONSENSUS_POINTS * 2);
    expect(() => game.handleAction('p1', { type: 'playJoker' })).toThrow(/REJECTED/);
  });
});

describe('EvoceGame — legenda / rabisco / final', () => {
  it('round 2 is a legenda about a target player; captions go to a vote', () => {
    const game = mkGame();
    game.start();
    playRound(game); // round 1 enquete
    const pub = game.getPublicState();
    expect(pub.round).toBe(2);
    expect(pub.roundKind).toBe('legenda');
    expect(pub.targetId).not.toBeNull();
    expect(pub.prompt).not.toMatch(/\[NOME\]/);

    for (const p of P4) game.handleAction(p.id, { type: 'submitCaption', text: `resposta ${p.name}` });
    const voting = game.getPublicState();
    expect(voting.phase).toBe('voting');
    expect(voting.submissions).toHaveLength(4);
    expect(voting.submissions.every((s) => s.authorId === null)).toBe(true);

    // p2..p4 vote p1's caption.
    const p1sub = game.getPrivateState('p2').voteOptions.find((o) => o.text === 'resposta Ana')!;
    for (const pid of ['p2', 'p3', 'p4']) game.handleAction(pid, { type: 'castVote', submissionId: p1sub.id });
    game.handleAction('p1', { type: 'castVote', submissionId: game.getPrivateState('p1').voteOptions[0].id });

    const res = game.getPublicState();
    expect(res.phase).toBe('roundResults');
    expect(res.roundWinnerId).toBe('p1');
    const std = Object.fromEntries(res.standings.map((s) => [s.playerId, s.roundPoints]));
    expect(std.p1).toBe(VOTE_POINTS * 3);
    // p2,p3,p4 each picked the winner.
    expect(std.p3).toBe(PICK_WINNER_BONUS);
  });

  it('round 3 is a rabisco: the model does not draw and is not expected', () => {
    const game = mkGame();
    game.start();
    playRound(game); // 1
    playRound(game); // 2
    const pub = game.getPublicState();
    expect(pub.round).toBe(3);
    expect(pub.roundKind).toBe('rabisco');
    const modelId = pub.targetId!;
    expect(pub.answersExpectedCount).toBe(3); // 4 players minus the model
    expect(game.getPrivateState(modelId).isDrawTarget).toBe(true);
    expect(() => game.handleAction(modelId, { type: 'submitDrawing', drawing: dot() })).toThrow(/REJECTED/);

    for (const p of P4) {
      if (p.id === modelId) continue;
      game.handleAction(p.id, { type: 'submitDrawing', drawing: dot() });
    }
    expect(game.getPublicState().phase).toBe('voting');
    expect(game.getPublicState().submissions).toHaveLength(3);
  });

  it('rejects an empty drawing and an oversized stroke via the schema', () => {
    const game = mkGame();
    game.start();
    playRound(game);
    playRound(game); // now rabisco
    const drawer = P4.find((p) => p.id !== game.getPublicState().targetId)!;
    expect(() => game.handleAction(drawer.id, { type: 'submitDrawing', drawing: { strokes: [] } })).toThrow(/REJECTED/);
    expect(() =>
      game.handleAction(drawer.id, { type: 'submitDrawing', drawing: { strokes: [{ color: '#000', width: 8, points: new Array(5000).fill(1) }] } }),
    ).toThrow(/INVALID_ACTION/);
  });
});

describe('EvoceGame — full match, timeouts, pause', () => {
  it('runs all 6 rounds (ending on the final) then ends with a winner', () => {
    const game = mkGame();
    game.start();
    for (let r = 1; r <= TOTAL_ROUNDS; r++) {
      expect(game.getPublicState().roundKind).toBe(ROUND_PLAN[r - 1]);
      // give p1 an edge every round
      if (game.getPublicState().roundKind === 'enquete') {
        for (const p of P4) game.handleAction(p.id, { type: 'votePlayer', targetId: 'p1' });
      } else {
        for (const p of P4) {
          if (game.getPrivateState(p.id).isDrawTarget) continue;
          if (game.getPublicState().roundKind === 'legenda') game.handleAction(p.id, { type: 'submitCaption', text: `x${p.name}` });
          else game.handleAction(p.id, { type: 'submitDrawing', drawing: dot() });
        }
        const p1sub = game.getPrivateState('p2').voteOptions[0];
        // everyone but the author of option[0] votes it; author votes something else
        for (const p of P4) {
          const opts = game.getPrivateState(p.id).voteOptions;
          if (opts.length === 0 || game.getPrivateState(p.id).myVoteId) continue;
          const pick = opts.find((o) => o.id === p1sub.id) ?? opts[0];
          game.handleAction(p.id, { type: 'castVote', submissionId: pick.id });
        }
      }
      expect(game.getPublicState().phase).toBe('roundResults');
      game.onTurnTimeout();
    }
    const pub = game.getPublicState();
    expect(pub.phase).toBe('gameover');
    expect(game.getStatus()).toBe('complete');
    expect(pub.winnerId).not.toBeNull();
    expect(game.getTimer()).toBeNull();
  });

  it('the final round pays double', () => {
    const game = mkGame();
    game.start();
    for (let r = 1; r < TOTAL_ROUNDS; r++) playRound(game);
    expect(game.getPublicState().roundKind).toBe('final');

    for (const p of P4) game.handleAction(p.id, { type: 'submitDrawing', drawing: dot() });
    const target = game.getPrivateState('p2').voteOptions.find((o) => o.id === 's0') ?? game.getPrivateState('p2').voteOptions[0];
    // p2,p3 vote submission target; author + p4 vote elsewhere
    const authorOfTarget = P4.find((p) => {
      const opts = game.getPrivateState(p.id).voteOptions;
      return !opts.some((o) => o.id === target.id);
    });
    for (const p of P4) {
      if (p.id === authorOfTarget?.id) {
        game.handleAction(p.id, { type: 'castVote', submissionId: game.getPrivateState(p.id).voteOptions[0].id });
      } else {
        game.handleAction(p.id, { type: 'castVote', submissionId: target.id });
      }
    }
    const res = game.getPublicState();
    expect(res.phase).toBe('roundResults');
    const winnerPoints = res.standings.find((s) => s.playerId === res.roundWinnerId)!.roundPoints;
    // 3 votes × VOTE_POINTS × 2 (final)
    expect(winnerPoints).toBeGreaterThanOrEqual(VOTE_POINTS * 3 * 2);
  });

  it('closes the answering window on a timeout with whatever is in', () => {
    const game = mkGame();
    game.start();
    game.handleAction('p1', { type: 'votePlayer', targetId: 'p2' });
    game.onTurnTimeout();
    expect(game.getPublicState().phase).toBe('roundResults');
  });

  it('freezes and rejects actions while paused', () => {
    const game = mkGame();
    game.start();
    game.pause(1000);
    expect(game.getPublicState().phase).toBe('paused');
    expect(game.getTimer()).toBeNull();
    expect(() => game.handleAction('p1', { type: 'votePlayer', targetId: 'p2' })).toThrow(/GAME_PAUSED/);
    game.resume(5000);
    expect(game.getPublicState().phase).toBe('answering');
  });
});
