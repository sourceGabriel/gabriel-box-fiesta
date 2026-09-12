import { describe, expect, it } from 'vitest';
import { CoupGame } from '../games/coup/coup-game';
import type { Game } from '../games/coup/game';
import type { Character } from '../games/coup/types';

const players = [
  { id: 'p1', name: 'A' },
  { id: 'p2', name: 'B' },
  { id: 'p3', name: 'C' },
];

const mkGame = (
  playerList: { id: string; name: string }[] = players,
  opts: { now?: () => number; random?: () => number } = {},
): CoupGame =>
  new CoupGame({
    players: playerList,
    roomCode: 'ABCD',
    now: opts.now ?? (() => 1000),
    random: opts.random ?? (() => 0),
  });

/** Reach the internal authoritative Game (mirrors uno-game.test.ts's `internalState`). */
const g = (game: CoupGame): Game => (game as unknown as { game: Game }).game;

const setHand = (game: CoupGame, playerId: string, chars: Character[]): void => {
  g(game).getPlayer(playerId)!.influences = chars.map((c) => ({ character: c, revealed: false }));
};
const setCoins = (game: CoupGame, playerId: string, n: number): void => {
  g(game).getPlayer(playerId)!.coins = n;
};
const setDeck = (game: CoupGame, chars: Character[]): void => g(game).deck.setCards(chars);
const setCurrent = (game: CoupGame, playerId: string): void => {
  g(game).currentPlayerIndex = g(game).players.findIndex((p) => p.id === playerId);
};
const revealedCount = (game: CoupGame, playerId: string): number =>
  g(game).getPlayer(playerId)!.influences.filter((i) => i.revealed).length;

/** Every alive player except the actor passes the current challenge window. */
const allPassChallenge = (game: CoupGame, exclude: string[] = []): void => {
  for (const p of g(game).players) {
    if (p.isAlive && !exclude.includes(p.id)) {
      try {
        game.handleAction(p.id, { kind: 'pass_challenge' });
      } catch {
        /* not eligible */
      }
    }
  }
};
const allPassBlock = (game: CoupGame, exclude: string[] = []): void => {
  for (const p of g(game).players) {
    if (p.isAlive && !exclude.includes(p.id)) {
      try {
        game.handleAction(p.id, { kind: 'pass_block' });
      } catch {
        /* not eligible */
      }
    }
  }
};
const allPassBlockChallenge = (game: CoupGame, exclude: string[] = []): void => {
  for (const p of g(game).players) {
    if (p.isAlive && !exclude.includes(p.id)) {
      try {
        game.handleAction(p.id, { kind: 'pass_challenge_block' });
      } catch {
        /* not eligible */
      }
    }
  }
};

describe('CoupGame — setup', () => {
  it('deals 2 influences and 2 coins each, 9-card deck, p1 to act', () => {
    const game = mkGame();
    game.start();
    const pub = game.getPublicState();

    expect(pub.players).toHaveLength(3);
    for (const p of pub.players) {
      expect(p.influenceCount).toBe(2);
      expect(p.coins).toBe(2);
    }
    expect(pub.deckCount).toBe(15 - 3 * 2);
    expect(pub.phase).toBe('awaiting_action');
    expect(pub.currentPlayerId).toBe('p1');
    expect(game.getStatus()).toBe('active');
  });

  it('hides opponents cards but shows own in private state', () => {
    const game = mkGame();
    game.start();
    const priv = game.getPrivateState('p1');
    expect(priv.influences).toHaveLength(2);
    expect(priv.influences.every((i) => i.character !== null)).toBe(true);
    expect(priv.pendingDecision).toBe('action');
    // p2 sees no decision
    expect(game.getPrivateState('p2').pendingDecision).toBeNull();
  });

  it('rejects a malformed payload', () => {
    const game = mkGame();
    game.start();
    expect(() => game.handleAction('p1', { kind: 'nope' })).toThrow(/INVALID_ACTION/);
  });

  it('rejects an action out of turn', () => {
    const game = mkGame();
    game.start();
    expect(() => game.handleAction('p2', { kind: 'declare_action', action: 'Income' })).toThrow(/REJECTED/);
  });
});

describe('CoupGame — basic actions', () => {
  it('Income gives +1 and advances the turn', () => {
    const game = mkGame();
    game.start();
    game.handleAction('p1', { kind: 'declare_action', action: 'Income' });
    const pub = game.getPublicState();
    expect(pub.players.find((p) => p.id === 'p1')!.coins).toBe(3);
    expect(pub.currentPlayerId).toBe('p2');
  });

  it('Foreign Aid unblocked gives +2', () => {
    const game = mkGame();
    game.start();
    game.handleAction('p1', { kind: 'declare_action', action: 'ForeignAid' });
    expect(game.getPublicState().phase).toBe('awaiting_block');
    allPassBlock(game, ['p1']);
    const pub = game.getPublicState();
    expect(pub.players.find((p) => p.id === 'p1')!.coins).toBe(4);
    expect(pub.currentPlayerId).toBe('p2');
  });

  it('Foreign Aid blocked by Duke (unchallenged) is cancelled, cost stays 0', () => {
    const game = mkGame();
    game.start();
    setHand(game, 'p2', ['Duke', 'Captain']);
    game.handleAction('p1', { kind: 'declare_action', action: 'ForeignAid' });
    game.handleAction('p2', { kind: 'block', character: 'Duke' });
    expect(game.getPublicState().phase).toBe('awaiting_block_challenge');
    allPassBlockChallenge(game, ['p2']);
    const pub = game.getPublicState();
    expect(pub.players.find((p) => p.id === 'p1')!.coins).toBe(2);
    expect(pub.currentPlayerId).toBe('p2');
  });

  it('Coup costs 7 and forces the target to lose influence', () => {
    const game = mkGame();
    game.start();
    setCoins(game, 'p1', 7);
    game.handleAction('p1', { kind: 'declare_action', action: 'Coup', targetId: 'p2' });
    expect(game.getPublicState().phase).toBe('awaiting_influence_loss');
    expect(game.getPublicState().influenceLossPlayerId).toBe('p2');
    game.handleAction('p2', { kind: 'lose_influence', influenceIndex: 0 });
    const pub = game.getPublicState();
    expect(pub.players.find((p) => p.id === 'p1')!.coins).toBe(0);
    expect(revealedCount(game, 'p2')).toBe(1);
    expect(pub.currentPlayerId).toBe('p2');
  });

  it('forces Coup at 10+ coins', () => {
    const game = mkGame();
    game.start();
    setCoins(game, 'p1', 10);
    expect(() => game.handleAction('p1', { kind: 'declare_action', action: 'Income' })).toThrow(/Coup/);
  });

  it('rejects Steal against a 0-coin target', () => {
    const game = mkGame();
    game.start();
    setHand(game, 'p1', ['Captain', 'Duke']);
    setCoins(game, 'p2', 0);
    expect(() => game.handleAction('p1', { kind: 'declare_action', action: 'Steal', targetId: 'p2' })).toThrow(/REJECTED/);
  });

  it('Steal transfers min(2, target coins)', () => {
    const game = mkGame();
    game.start();
    setHand(game, 'p1', ['Captain', 'Duke']);
    setCoins(game, 'p2', 5);
    game.handleAction('p1', { kind: 'declare_action', action: 'Steal', targetId: 'p2' });
    allPassChallenge(game, ['p1']);
    allPassBlock(game, ['p1']);
    const pub = game.getPublicState();
    expect(pub.players.find((p) => p.id === 'p1')!.coins).toBe(4);
    expect(pub.players.find((p) => p.id === 'p2')!.coins).toBe(3);
  });
});

describe('CoupGame — challenges', () => {
  it('bluffed Tax: challenge succeeds, bluffer loses influence, action cancelled', () => {
    const game = mkGame();
    game.start();
    setHand(game, 'p1', ['Captain', 'Contessa']); // no Duke
    game.handleAction('p1', { kind: 'declare_action', action: 'Tax' });
    game.handleAction('p2', { kind: 'challenge' });
    // p1 has 2 influences → must choose which to lose
    expect(game.getPublicState().phase).toBe('awaiting_influence_loss');
    game.handleAction('p1', { kind: 'lose_influence', influenceIndex: 0 });
    const pub = game.getPublicState();
    expect(revealedCount(game, 'p1')).toBe(1);
    expect(pub.players.find((p) => p.id === 'p1')!.coins).toBe(2); // no tax
    expect(pub.currentPlayerId).toBe('p2');
  });

  it('honest Tax: challenge fails, challenger loses influence, Tax resolves', () => {
    const game = mkGame();
    game.start();
    setHand(game, 'p1', ['Duke', 'Contessa']);
    setDeck(game, ['Captain', 'Captain', 'Captain']);
    game.handleAction('p1', { kind: 'declare_action', action: 'Tax' });
    game.handleAction('p2', { kind: 'challenge' });
    // p2 has 2 influences → chooses one to lose
    expect(game.getPublicState().phase).toBe('awaiting_influence_loss');
    expect(game.getPublicState().influenceLossPlayerId).toBe('p2');
    game.handleAction('p2', { kind: 'lose_influence', influenceIndex: 0 });
    const pub = game.getPublicState();
    expect(revealedCount(game, 'p2')).toBe(1);
    expect(pub.players.find((p) => p.id === 'p1')!.coins).toBe(5); // +3 tax
    // the proven Duke was shuffled back and replaced — p1 still has 2 hidden influences
    expect(g(game).getPlayer('p1')!.aliveInfluenceCount).toBe(2);
    expect(revealedCount(game, 'p1')).toBe(0);
    expect(pub.currentPlayerId).toBe('p2');
  });

  it('lastReveal is exposed after a challenge and cleared next turn', () => {
    const game = mkGame();
    game.start();
    setHand(game, 'p1', ['Captain', 'Contessa']);
    game.handleAction('p1', { kind: 'declare_action', action: 'Tax' });
    game.handleAction('p2', { kind: 'challenge' });
    expect(game.getPublicState().lastReveal).not.toBeNull();
    expect(game.getPublicState().lastReveal!.challengedHeldCard).toBe(false);
    game.handleAction('p1', { kind: 'lose_influence', influenceIndex: 0 });
    expect(game.getPublicState().lastReveal).toBeNull();
  });

  it('emits a challenge_resolved event', () => {
    const game = mkGame();
    game.start();
    setHand(game, 'p1', ['Captain', 'Contessa']);
    game.consumeEvents();
    game.handleAction('p1', { kind: 'declare_action', action: 'Tax' });
    game.handleAction('p2', { kind: 'challenge' });
    const events = game.consumeEvents();
    expect(events.some((e) => e.type === 'challenge_made')).toBe(true);
    expect(events.some((e) => e.type === 'challenge_resolved')).toBe(true);
  });
});

describe('CoupGame — assassination & blocks', () => {
  it('Assassinate resolves through the influence-loss phase', () => {
    const game = mkGame();
    game.start();
    setHand(game, 'p1', ['Assassin', 'Duke']);
    setCoins(game, 'p1', 3);
    game.handleAction('p1', { kind: 'declare_action', action: 'Assassinate', targetId: 'p2' });
    allPassChallenge(game, ['p1']);
    allPassBlock(game, ['p1']);
    expect(game.getPublicState().phase).toBe('awaiting_influence_loss');
    game.handleAction('p2', { kind: 'lose_influence', influenceIndex: 0 });
    const pub = game.getPublicState();
    expect(revealedCount(game, 'p2')).toBe(1);
    expect(pub.players.find((p) => p.id === 'p1')!.coins).toBe(0);
    expect(pub.currentPlayerId).toBe('p2');
  });

  it('Assassinate blocked by Contessa (unchallenged): coins spent, no influence lost', () => {
    const game = mkGame();
    game.start();
    setHand(game, 'p1', ['Assassin', 'Duke']);
    setHand(game, 'p2', ['Contessa', 'Captain']);
    setCoins(game, 'p1', 3);
    game.handleAction('p1', { kind: 'declare_action', action: 'Assassinate', targetId: 'p2' });
    allPassChallenge(game, ['p1']);
    game.handleAction('p2', { kind: 'block', character: 'Contessa' });
    allPassBlockChallenge(game, ['p2']);
    const pub = game.getPublicState();
    expect(revealedCount(game, 'p2')).toBe(0);
    expect(pub.players.find((p) => p.id === 'p1')!.coins).toBe(0);
    expect(pub.currentPlayerId).toBe('p2');
  });

  it('Assassinate challenged (actor genuinely has Assassin): challenger loses influence, then the ORIGINAL TARGET still gets to block with Contessa', () => {
    const game = mkGame();
    game.start();
    setHand(game, 'p1', ['Assassin', 'Duke']);
    setHand(game, 'p2', ['Contessa', 'Captain']);
    setHand(game, 'p3', ['Captain', 'Duke']);
    setCoins(game, 'p1', 3);
    setDeck(game, ['Ambassador']); // replacement for p1's proven Assassin
    game.handleAction('p1', { kind: 'declare_action', action: 'Assassinate', targetId: 'p2' });
    game.handleAction('p3', { kind: 'challenge' });
    // Challenge fails (p1 genuinely holds the Assassin) — p3 (challenger) must lose an influence.
    expect(game.getPublicState().phase).toBe('awaiting_influence_loss');
    expect(game.getPublicState().influenceLossPlayerId).toBe('p3');
    game.handleAction('p3', { kind: 'lose_influence', influenceIndex: 0 });
    // Assassinate is still blockable — p2 (the original target, NOT the challenger) should get the decision.
    const pub = game.getPublicState();
    expect(pub.phase).toBe('awaiting_block');
    expect(game.getPrivateState('p2').pendingDecision).toBe('block');
    expect(game.getPrivateState('p2').blockOptions).toEqual(['Contessa']);
    game.handleAction('p2', { kind: 'block', character: 'Contessa' });
    allPassBlockChallenge(game, ['p2']);
    const final = game.getPublicState();
    expect(revealedCount(game, 'p2')).toBe(0); // blocked successfully — no influence lost
    expect(final.players.find((p) => p.id === 'p1')!.coins).toBe(0); // Assassinate's cost stays spent
  });

  it('Assassinate challenged BY ITS OWN TARGET (actor genuinely has Assassin): target loses an influence for the failed challenge, then still gets to block with Contessa (regression for the "surrenders despite holding Contessa" bug)', () => {
    const game = mkGame();
    game.start();
    setHand(game, 'p1', ['Assassin', 'Duke']);
    setHand(game, 'p2', ['Captain', 'Contessa']);
    setCoins(game, 'p1', 3);
    setDeck(game, ['Ambassador']); // replacement for p1's proven Assassin
    game.handleAction('p1', { kind: 'declare_action', action: 'Assassinate', targetId: 'p2' });
    // p2 (the target) challenges the Assassin claim themselves, instead of blocking outright.
    game.handleAction('p2', { kind: 'challenge' });
    // Challenge fails (p1 genuinely holds the Assassin) — p2 must lose an influence for the failed challenge.
    expect(game.getPublicState().phase).toBe('awaiting_influence_loss');
    expect(game.getPublicState().influenceLossPlayerId).toBe('p2');
    game.handleAction('p2', { kind: 'lose_influence', influenceIndex: 0 }); // reveals Captain, Contessa remains
    // p2 must still get the block decision — having challenged and lost does not forfeit their own right to block.
    const pub = game.getPublicState();
    expect(pub.phase).toBe('awaiting_block');
    expect(game.getPrivateState('p2').pendingDecision).toBe('block');
    expect(game.getPrivateState('p2').blockOptions).toEqual(['Contessa']);
    game.handleAction('p2', { kind: 'block', character: 'Contessa' });
    allPassBlockChallenge(game, ['p2']);
    const final = game.getPublicState();
    expect(revealedCount(game, 'p2')).toBe(1); // only the failed-challenge loss — blocked successfully, no second loss
    expect(final.players.find((p) => p.id === 'p1')!.coins).toBe(0); // Assassinate's cost stays spent
  });

  it('only the target may block a steal', () => {
    const game = mkGame();
    game.start();
    setHand(game, 'p1', ['Captain', 'Duke']);
    game.handleAction('p1', { kind: 'declare_action', action: 'Steal', targetId: 'p2' });
    allPassChallenge(game, ['p1']);
    expect(() => game.handleAction('p3', { kind: 'block', character: 'Captain' })).toThrow(/REJECTED/);
  });
});

describe('CoupGame — exchange', () => {
  it('Exchange keeps chosen cards and returns the rest', () => {
    const game = mkGame();
    game.start();
    setHand(game, 'p1', ['Ambassador', 'Duke']);
    setDeck(game, ['Captain', 'Contessa', 'Assassin']);
    game.handleAction('p1', { kind: 'declare_action', action: 'Exchange' });
    allPassChallenge(game, ['p1']);
    expect(game.getPublicState().phase).toBe('awaiting_exchange');
    const priv = game.getPrivateState('p1');
    expect(priv.exchange).not.toBeNull();
    expect(priv.exchange!.drawnCards).toHaveLength(2);
    expect(priv.exchange!.keepCount).toBe(2);
    // keep the two original cards (indices 0,1)
    game.handleAction('p1', { kind: 'exchange', keepIndices: [0, 1] });
    expect(g(game).getPlayer('p1')!.hiddenCharacters.sort()).toEqual(['Ambassador', 'Duke']);
    expect(game.getPublicState().currentPlayerId).toBe('p2');
  });

  it('rejects an exchange with the wrong keep count', () => {
    const game = mkGame();
    game.start();
    setHand(game, 'p1', ['Ambassador', 'Duke']);
    setDeck(game, ['Captain', 'Contessa', 'Assassin']);
    game.handleAction('p1', { kind: 'declare_action', action: 'Exchange' });
    allPassChallenge(game, ['p1']);
    expect(() => game.handleAction('p1', { kind: 'exchange', keepIndices: [0] })).toThrow(/REJECTED/);
  });
});

describe('CoupGame — elimination & win', () => {
  it('eliminates a player who loses their last influence', () => {
    const game = mkGame();
    game.start();
    setHand(game, 'p2', ['Captain']); // 1 influence
    setCoins(game, 'p1', 7);
    game.consumeEvents();
    game.handleAction('p1', { kind: 'declare_action', action: 'Coup', targetId: 'p2' });
    // p2 has 1 influence → auto-revealed, no prompt
    const pub = game.getPublicState();
    expect(pub.players.find((p) => p.id === 'p2')!.isAlive).toBe(false);
    expect(game.consumeEvents().some((e) => e.type === 'player_eliminated')).toBe(true);
    expect(pub.currentPlayerId).toBe('p3');
  });

  it('ends the game when one player remains', () => {
    const game = mkGame([
      { id: 'p1', name: 'A' },
      { id: 'p2', name: 'B' },
    ]);
    game.start();
    setHand(game, 'p2', ['Captain']);
    setCoins(game, 'p1', 7);
    game.handleAction('p1', { kind: 'declare_action', action: 'Coup', targetId: 'p2' });
    const pub = game.getPublicState();
    expect(pub.phase).toBe('game_over');
    expect(pub.winnerId).toBe('p1');
    expect(game.getStatus()).toBe('complete');
    expect(game.getTimer()).toBeNull();
  });
});

describe('CoupGame — timeouts', () => {
  it('auto-Income on turn timeout below 10 coins', () => {
    const game = mkGame();
    game.start();
    game.onTurnTimeout();
    const pub = game.getPublicState();
    expect(pub.players.find((p) => p.id === 'p1')!.coins).toBe(3);
    expect(pub.currentPlayerId).toBe('p2');
  });

  it('auto-Coup on turn timeout at 10+ coins', () => {
    const game = mkGame();
    game.start();
    setCoins(game, 'p1', 10);
    game.onTurnTimeout();
    // random() === 0 → first opponent (p2); p2 has 2 influences → influence-loss phase
    expect(game.getPublicState().phase).toBe('awaiting_influence_loss');
    expect(game.getPublicState().pendingAction!.type).toBe('Coup');
  });

  it('auto-resolves an unchallenged claim on timeout', () => {
    const game = mkGame();
    game.start();
    setHand(game, 'p1', ['Duke', 'Captain']);
    game.handleAction('p1', { kind: 'declare_action', action: 'Tax' });
    expect(game.getPublicState().phase).toBe('awaiting_action_challenge');
    game.onTurnTimeout();
    expect(game.getPublicState().players.find((p) => p.id === 'p1')!.coins).toBe(5);
    expect(game.getPublicState().currentPlayerId).toBe('p2');
  });

  it('auto-loses the first influence on influence-loss timeout', () => {
    const game = mkGame();
    game.start();
    setCoins(game, 'p1', 7);
    game.handleAction('p1', { kind: 'declare_action', action: 'Coup', targetId: 'p2' });
    game.onTurnTimeout();
    expect(revealedCount(game, 'p2')).toBe(1);
    expect(game.getPublicState().currentPlayerId).toBe('p2');
  });
});

describe('CoupGame — pause', () => {
  it('freezes the timer and rejects actions while paused', () => {
    const game = mkGame();
    game.start();
    game.pause(1000);
    expect(game.isPaused()).toBe(true);
    expect(game.getTimer()).toBeNull();
    expect(game.getPublicState().phase).toBe('paused');
    expect(() => game.handleAction('p1', { kind: 'declare_action', action: 'Income' })).toThrow(/GAME_PAUSED/);
    game.resume(5000);
    expect(game.isPaused()).toBe(false);
    expect(game.getTimer()).not.toBeNull();
    game.handleAction('p1', { kind: 'declare_action', action: 'Income' });
    expect(game.getPublicState().players.find((p) => p.id === 'p1')!.coins).toBe(3);
  });
});
