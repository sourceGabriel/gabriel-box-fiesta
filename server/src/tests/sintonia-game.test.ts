import { describe, expect, it } from 'vitest';
import type { SintoniaPublicState } from '@party/shared';
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

const pub = (game: SintoniaGame): SintoniaPublicState => game.getPublicState();

/** Drive a game to `guessing` with the médium's clue in. */
const toGuessing = (game: SintoniaGame, clue = 'perto do meio'): void => {
  game.handleAction(pub(game).mediumId!, { type: 'submitClue', clue });
};

/** Every guesser sets `value` and locks. */
const allGuess = (game: SintoniaGame, value: number, players = P5): void => {
  const mediumId = pub(game).mediumId;
  for (const p of players) {
    if (p.id === mediumId) continue;
    game.handleAction(p.id, { type: 'setGuess', value });
    try {
      game.handleAction(p.id, { type: 'lockGuess' });
    } catch {
      /* round may have advanced */
    }
  }
};

describe('SintoniaGame — setup', () => {
  it('starts round 1 in cluing with a médium and a spectrum, no teams', () => {
    const game = mkGame();
    game.start();
    const s = pub(game);
    expect(s.phase).toBe('cluing');
    expect(s.round).toBe(1);
    expect(s.totalRounds).toBe(TOTAL_ROUNDS);
    expect(s.mediumId).toBeTruthy();
    expect(s.spectrum[0]).toBeTruthy();
    expect(s.spectrum[1]).toBeTruthy();
    expect(s.target).toBeNull();
    expect(s.guessersTotalCount).toBe(4); // 5 players − médium
    expect(s.players).toHaveLength(5);
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
    expect(pub(game).totalRounds).toBe(4);
  });

  it('only the médium sees the target; everyone else is a guesser in guessing', () => {
    const game = mkGame();
    game.start();
    const { mediumId } = pub(game);
    toGuessing(game);
    for (const p of P5) {
      const priv = game.getPrivateState(p.id);
      if (p.id === mediumId) {
        expect(priv.isMedium).toBe(true);
        expect(priv.role).toBe('medium');
        expect(priv.target).not.toBeNull();
      } else {
        expect(priv.role).toBe('guesser');
        expect(priv.target).toBeNull();
      }
    }
  });
});

describe('planRound — pure planner', () => {
  it('rotates the médium by join order', () => {
    expect(planRound(P5, 0).mediumId).toBe('p1');
    expect(planRound(P5, 1).mediumId).toBe('p2');
    expect(planRound(P5, 5).mediumId).toBe('p1');
  });
});

describe('SintoniaGame — clue rules', () => {
  it('rejects a clue from a non-médium, empty, with digits, or too long', () => {
    const game = mkGame();
    game.start();
    const { mediumId } = pub(game);
    const other = P5.find((p) => p.id !== mediumId)!;
    expect(() => game.handleAction(other.id, { type: 'submitClue', clue: 'oi' })).toThrow(/REJECTED/);
    expect(() => game.handleAction(mediumId!, { type: 'submitClue', clue: '   ' })).toThrow(/REJECTED/);
    expect(() => game.handleAction(mediumId!, { type: 'submitClue', clue: 'nível 7' })).toThrow(/REJECTED/);
    expect(() => game.handleAction(mediumId!, { type: 'submitClue', clue: 'x'.repeat(80) })).toThrow(/REJECTED/);
  });

  it('a valid clue advances to guessing and shows the clue publicly', () => {
    const game = mkGame();
    game.start();
    toGuessing(game, '  bem   pertinho  do  meio ');
    const s = pub(game);
    expect(s.phase).toBe('guessing');
    expect(s.clue).toBe('bem pertinho do meio');
  });

  it('skips the round if the médium never sends a clue — nobody scores', () => {
    const game = mkGame();
    game.start();
    game.onTurnTimeout();
    const s = pub(game);
    expect(s.phase).toBe('reveal');
    expect(s.roundSkipped).toBe(true);
    expect(s.results).toHaveLength(0);
    expect(s.players.every((p) => p.score === 0)).toBe(true);
  });
});

describe('SintoniaGame — guessing + proximity scoring', () => {
  it('the médium has no dial; a guesser can set + lock their own', () => {
    const game = mkGame();
    game.start();
    toGuessing(game);
    const { mediumId } = pub(game);
    const guesser = P5.find((p) => p.id !== mediumId)!;
    expect(() => game.handleAction(mediumId!, { type: 'setGuess', value: 30 })).toThrow(/REJECTED/);
    game.handleAction(guesser.id, { type: 'setGuess', value: 30 });
    expect(game.getPrivateState(guesser.id).myGuess).toBe(30);
    game.handleAction(guesser.id, { type: 'lockGuess' });
    expect(game.getPrivateState(guesser.id).myLocked).toBe(true);
    expect(pub(game).guessersLockedCount).toBe(1);
  });

  it('reveals once every guesser locks and scores each by distance', () => {
    // random()===0 → target = TARGET_MIN (4).
    const game = mkGame(P5, { random: () => 0 });
    game.start();
    toGuessing(game);
    allGuess(game, 5); // distance 1 → top band (10)
    const s = pub(game);
    expect(s.phase).toBe('reveal');
    expect(s.target).toBe(4);
    expect(s.results).toHaveLength(4);
    expect(s.results.every((r) => r.points === 10)).toBe(true);
    // médium gets the rounded-down average (10)
    expect(s.mediumPoints).toBe(10);
    expect(s.players.find((p) => p.id === s.mediumId)!.score).toBe(10);
    expect(s.standings.every((st) => st.score === 10)).toBe(true);
  });

  it('a far guess earns nothing', () => {
    const game = mkGame(P5, { random: () => 0 }); // target 4
    game.start();
    toGuessing(game);
    allGuess(game, 90); // distance 86 → 0
    const s = pub(game);
    expect(s.results.every((r) => r.points === 0)).toBe(true);
    expect(s.mediumPoints).toBe(0);
  });

  it('locks whatever is set on a guessing timeout', () => {
    const game = mkGame();
    game.start();
    toGuessing(game);
    const guesser = P5.find((p) => p.id !== pub(game).mediumId)!;
    game.handleAction(guesser.id, { type: 'setGuess', value: 60 });
    game.onTurnTimeout();
    const s = pub(game);
    expect(s.phase).toBe('reveal');
    expect(s.results.find((r) => r.playerId === guesser.id)!.value).toBe(60);
  });

  it('unlock lets a guesser change their dial before the reveal', () => {
    const game = mkGame();
    game.start();
    toGuessing(game);
    const guessers = P5.filter((p) => p.id !== pub(game).mediumId);
    game.handleAction(guessers[0].id, { type: 'setGuess', value: 20 });
    game.handleAction(guessers[0].id, { type: 'lockGuess' });
    game.handleAction(guessers[0].id, { type: 'unlockGuess' });
    game.handleAction(guessers[0].id, { type: 'setGuess', value: 40 });
    expect(game.getPrivateState(guessers[0].id).myGuess).toBe(40);
    expect(pub(game).phase).toBe('guessing');
  });
});

describe('SintoniaGame — rounds, endgame, pause', () => {
  const playRound = (game: SintoniaGame, value = 50): void => {
    toGuessing(game);
    allGuess(game, value);
    game.onTurnTimeout(); // reveal → next round / gameover
  };

  it('rotates the médium each round', () => {
    const game = mkGame();
    game.start();
    const r1 = pub(game).mediumId;
    playRound(game);
    const s = pub(game);
    expect(s.round).toBe(2);
    expect(s.phase).toBe('cluing');
    expect(s.mediumId).not.toBe(r1);
  });

  it('runs the whole match then ends, crowning the highest total', () => {
    const game = mkGame(P5, { random: () => 0 });
    game.start();
    for (let r = 1; r <= TOTAL_ROUNDS; r++) playRound(game, 4 + r); // vary the guess so scores diverge
    const s = pub(game);
    expect(s.phase).toBe('gameover');
    expect(game.getStatus()).toBe('complete');
    expect(game.getTimer()).toBeNull();
    const top = s.standings[0];
    expect(s.standings.every((st) => st.score <= top.score)).toBe(true);
    if (s.winnerId) expect(s.winnerId).toBe(top.playerId);
  });

  it('a perfect tie ends with no winner', () => {
    const game = mkGame(P5, { random: () => 0 });
    game.start();
    for (let r = 1; r <= TOTAL_ROUNDS; r++) playRound(game, 5); // everyone identical every round
    const s = pub(game);
    expect(s.phase).toBe('gameover');
    expect(s.winnerId).toBeNull();
  });

  it('freezes the timer and rejects actions while paused', () => {
    const game = mkGame();
    game.start();
    toGuessing(game);
    game.pause(1000);
    expect(pub(game).phase).toBe('paused');
    expect(game.getTimer()).toBeNull();
    expect(() => game.handleAction('p2', { type: 'lockGuess' })).toThrow(/GAME_PAUSED/);
    game.resume(5000);
    expect(pub(game).phase).toBe('guessing');
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
