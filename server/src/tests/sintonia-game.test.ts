import { describe, expect, it } from 'vitest';
import { TOTAL_ROUNDS } from '../games/sintonia/constants';
import { planRound } from '../games/sintonia/pairing';
import { SintoniaGame } from '../games/sintonia/sintonia-game';
import { SPECTRUMS_LEVE, sintoniaSpectrums } from '../games/sintonia/spectrums';

const P3 = [
  { id: 'p1', name: 'Ana' },
  { id: 'p2', name: 'Bia' },
  { id: 'p3', name: 'Caio' },
];
const P5 = [...P3, { id: 'p4', name: 'Duda' }, { id: 'p5', name: 'Eli' }];

const mkGame = (
  players: { id: string; name: string }[] = P5,
  opts: { now?: () => number; random?: () => number; matchLength?: number; contentTier?: 'leve' | 'pesado' } = {},
): SintoniaGame =>
  new SintoniaGame({
    players,
    roomCode: 'ABCD',
    now: opts.now ?? (() => 1000),
    random: opts.random ?? (() => 0),
    matchLength: opts.matchLength,
    contentTier: opts.contentTier,
  });

/** Drive a game to `guessing` with the médium's clue in. */
const toGuessing = (game: SintoniaGame, clue = 'perto do meio'): void => {
  const medium = game.getPublicState().mediumId!;
  game.handleAction(medium, { type: 'submitClue', clue });
};

describe('SintoniaGame — setup', () => {
  it('starts round 1 in cluing with a médium, two teams and a spectrum', () => {
    const game = mkGame();
    game.start();
    const pub = game.getPublicState();
    expect(pub.phase).toBe('cluing');
    expect(pub.round).toBe(1);
    expect(pub.totalRounds).toBe(TOTAL_ROUNDS);
    expect(pub.mediumId).toBeTruthy();
    expect(pub.spectrum[0]).toBeTruthy();
    expect(pub.spectrum[1]).toBeTruthy();
    expect(pub.target).toBeNull(); // hidden until reveal
    const members = [...pub.teams[0].memberIds, ...pub.teams[1].memberIds];
    expect(members).toHaveLength(5);
    expect(game.getStatus()).toBe('active');
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

  it('honours a lobby-chosen match length', () => {
    const game = mkGame(P5, { matchLength: 4 });
    game.start();
    expect(game.getPublicState().totalRounds).toBe(4);
  });

  it('only the médium sees the target', () => {
    const game = mkGame();
    game.start();
    const { mediumId } = game.getPublicState();
    for (const p of P5) {
      const priv = game.getPrivateState(p.id);
      if (p.id === mediumId) {
        expect(priv.role).toBe('medium');
        expect(priv.target).not.toBeNull();
        expect(priv.target).toBeGreaterThanOrEqual(0);
        expect(priv.target).toBeLessThanOrEqual(100);
      } else {
        expect(priv.target).toBeNull();
      }
    }
  });
});

describe('planRound — pure planner', () => {
  it('rotates the médium by join order and keeps it on the active team', () => {
    const r0 = planRound(P5, 0, () => 0);
    const r1 = planRound(P5, 1, () => 0);
    expect(r0.mediumId).toBe('p1');
    expect(r1.mediumId).toBe('p2');
    expect(r0.teams[r0.activeTeamId]).toContain(r0.mediumId);
  });

  it('splits everyone into two near-even teams', () => {
    const { teams } = planRound(P5, 0, () => 0.5);
    expect(Math.abs(teams[0].length - teams[1].length)).toBeLessThanOrEqual(1);
    expect(new Set([...teams[0], ...teams[1]]).size).toBe(5);
  });
});

describe('SintoniaGame — clue rules', () => {
  it('rejects a clue from a non-médium, an empty clue, digits and an over-long clue', () => {
    const game = mkGame();
    game.start();
    const { mediumId } = game.getPublicState();
    const other = P5.find((p) => p.id !== mediumId)!;
    expect(() => game.handleAction(other.id, { type: 'submitClue', clue: 'oi' })).toThrow(/REJECTED/);
    expect(() => game.handleAction(mediumId!, { type: 'submitClue', clue: '   ' })).toThrow(/REJECTED/);
    expect(() => game.handleAction(mediumId!, { type: 'submitClue', clue: 'nível 7' })).toThrow(/REJECTED/);
    expect(() =>
      game.handleAction(mediumId!, { type: 'submitClue', clue: 'x'.repeat(80) }),
    ).toThrow(/REJECTED/);
  });

  it('a valid clue advances to guessing and shows the clue publicly', () => {
    const game = mkGame();
    game.start();
    toGuessing(game, '  bem   pertinho  do  meio ');
    const pub = game.getPublicState();
    expect(pub.phase).toBe('guessing');
    expect(pub.clue).toBe('bem pertinho do meio');
  });

  it('skips the round if the médium never sends a clue', () => {
    const game = mkGame();
    game.start();
    game.onTurnTimeout(); // cluing window elapses
    const pub = game.getPublicState();
    expect(pub.phase).toBe('reveal');
    expect(pub.roundSkipped).toBe(true);
    expect(pub.bandPoints).toBe(0);
    expect(pub.teams[0].score).toBe(0);
    expect(pub.teams[1].score).toBe(0);
  });
});

describe('SintoniaGame — dial + side bet + scoring', () => {
  it('only a dial mover can move the dial; only the other team bets the side', () => {
    const game = mkGame();
    game.start();
    const pub = game.getPublicState();
    toGuessing(game);
    const active = pub.teams[pub.activeTeamId];
    const dialMover = active.memberIds.find((id) => id !== pub.mediumId)!;
    const opponent = pub.teams[pub.activeTeamId === 0 ? 1 : 0].memberIds[0];

    game.handleAction(dialMover, { type: 'moveDial', value: 73 });
    expect(game.getPublicState().dialValue).toBe(73);
    expect(() => game.handleAction(opponent, { type: 'moveDial', value: 10 })).toThrow(/REJECTED/);
    expect(() => game.handleAction(dialMover, { type: 'betSide', side: 'left' })).toThrow(/REJECTED/);
  });

  it('scores the active team by band and the other team for the right side call', () => {
    // random()===0 → target = TARGET_MIN (4). Put the dial at 8 → distance 4 → band 4 pts.
    const game = mkGame(P5, { random: () => 0 });
    game.start();
    const pub0 = game.getPublicState();
    const activeId = pub0.activeTeamId;
    const opponentId = activeId === 0 ? 1 : 0;
    toGuessing(game);
    const dialMover = pub0.teams[activeId].memberIds.find((id) => id !== pub0.mediumId)!;
    game.handleAction(dialMover, { type: 'moveDial', value: 8 });
    // target (4) is to the LEFT of the dial (8) → 'left' is the right call.
    for (const id of pub0.teams[opponentId].memberIds) {
      game.handleAction(id, { type: 'betSide', side: 'left' });
    }
    const pub = game.getPublicState();
    expect(pub.phase).toBe('reveal');
    expect(pub.target).toBe(4);
    expect(pub.bandPoints).toBe(4);
    expect(pub.sideCorrect).toBe(true);
    expect(pub.teams[activeId].score).toBe(4);
    expect(pub.teams[opponentId].score).toBe(1);
    const standings = pub.standings;
    expect(standings.every((s) => s.score === pub.teams[s.teamId].score)).toBe(true);
  });

  it('a wrong side call earns nothing', () => {
    const game = mkGame(P5, { random: () => 0 });
    game.start();
    const pub0 = game.getPublicState();
    const activeId = pub0.activeTeamId;
    const opponentId = activeId === 0 ? 1 : 0;
    toGuessing(game);
    const dialMover = pub0.teams[activeId].memberIds.find((id) => id !== pub0.mediumId)!;
    game.handleAction(dialMover, { type: 'moveDial', value: 8 });
    for (const id of pub0.teams[opponentId].memberIds) {
      game.handleAction(id, { type: 'betSide', side: 'right' });
    }
    expect(game.getPublicState().teams[opponentId].score).toBe(0);
  });

  it('locks the dial on timeout and still reveals', () => {
    const game = mkGame();
    game.start();
    toGuessing(game);
    game.onTurnTimeout();
    expect(game.getPublicState().phase).toBe('reveal');
  });
});

describe('SintoniaGame — rounds, endgame, pause', () => {
  const playRound = (game: SintoniaGame): void => {
    toGuessing(game);
    game.onTurnTimeout(); // guessing → reveal
    game.onTurnTimeout(); // reveal → next round / gameover
  };

  it('re-splits teams and rotates the médium each round', () => {
    const game = mkGame();
    game.start();
    const r1Medium = game.getPublicState().mediumId;
    playRound(game);
    const pub = game.getPublicState();
    expect(pub.round).toBe(2);
    expect(pub.phase).toBe('cluing');
    expect(pub.mediumId).not.toBe(r1Medium);
  });

  it('runs the whole match then ends, crowning the higher team', () => {
    const game = mkGame(P5, { random: () => 0 });
    game.start();
    for (let r = 1; r <= TOTAL_ROUNDS; r++) playRound(game);
    const pub = game.getPublicState();
    expect(pub.phase).toBe('gameover');
    expect(game.getStatus()).toBe('complete');
    expect(game.getTimer()).toBeNull();
    const [a, b] = [pub.teams[0].score, pub.teams[1].score];
    if (a === b) expect(pub.winnerTeamId).toBeNull();
    else expect(pub.winnerTeamId).toBe(a > b ? 0 : 1);
  });

  it('freezes the timer and rejects actions while paused', () => {
    const game = mkGame();
    game.start();
    toGuessing(game);
    game.pause(1000);
    expect(game.getPublicState().phase).toBe('paused');
    expect(game.getTimer()).toBeNull();
    expect(() => game.handleAction('p2', { type: 'betSide', side: 'left' })).toThrow(/GAME_PAUSED/);
    game.resume(5000);
    expect(game.getPublicState().phase).toBe('guessing');
    expect(game.getTimer()).not.toBeNull();
  });
});

describe('sintoniaSpectrums — content tier', () => {
  it('leve is a strict prefix of pesado', () => {
    const leve = sintoniaSpectrums('leve');
    const pesado = sintoniaSpectrums('pesado');
    expect(leve).toEqual([...SPECTRUMS_LEVE]);
    expect(pesado.length).toBeGreaterThan(leve.length);
    expect(pesado.slice(0, leve.length)).toEqual(leve);
    expect(sintoniaSpectrums(undefined)).toEqual(pesado);
  });
});
