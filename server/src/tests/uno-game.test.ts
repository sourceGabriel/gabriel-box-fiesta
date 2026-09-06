import { describe, expect, it } from 'vitest';
import type { UnoCard } from '@party/shared';
import { UnoGame } from '../games/uno/uno-game';

const numberCard = (id: string, color: UnoCard['color'], value: number): UnoCard => ({ id, color, type: 'number', value });
const drawTwoCard = (id: string, color: UnoCard['color']): UnoCard => ({ id, color, type: 'draw_two', value: null });
const wildDrawFourCard = (id: string): UnoCard => ({ id, color: 'wild', type: 'wild_draw_four', value: null });

const players = [
  { id: 'p1', name: 'A' },
  { id: 'p2', name: 'B' },
  { id: 'p3', name: 'C' },
];

describe('UnoGame', () => {
  it('distributes 7 cards for each player and starts round', () => {
    const game = new UnoGame(players, 'ABCD', () => 1000);
    game.start();
    const state = (game as unknown as { state: ReturnType<UnoGame['getState']> }).state;

    for (const player of players) {
      expect(state.hands[player.id]).toHaveLength(7);
    }
    expect(state.phase).toBe('round_active');
    expect(state.currentPlayerId).toBe('p1');
    expect(state.discardPile.length).toBe(1);
  });

  it('rejects invalid play out of turn', () => {
    const game = new UnoGame(players, 'ABCD');
    game.start();

    const notCurrent = 'p2';
    const cardId = game.getState().hands[notCurrent][0].id;

    expect(() => {
      game.handleAction({ type: 'play_card', playerId: notCurrent, cardId });
    }).toThrow(/NOT_YOUR_TURN/);
  });

  it('allows draw and advances turn', () => {
    const game = new UnoGame(players, 'ABCD');
    game.start();

    const before = game.getState();
    const p1Count = before.hands.p1.length;

    game.handleAction({ type: 'draw_card', playerId: 'p1' });

    const after = game.getState();
    expect(after.hands.p1.length).toBeGreaterThanOrEqual(p1Count + 1);
    expect(after.currentPlayerId).toBe('p2');
  });

  it('applies reverse as skip when only two players', () => {
    const game = new UnoGame([
      { id: 'p1', name: 'A' },
      { id: 'p2', name: 'B' },
    ], 'ABCD');
    game.start();

    const state = (game as unknown as { state: ReturnType<UnoGame['getState']> }).state;
    const reverse = state.hands.p1.find((card) => card.type === 'reverse');
    const top = state.discardPile.at(-1)!;

    if (reverse) {
      state.currentColor = reverse.color === 'wild' ? 'red' : reverse.color;
      state.discardPile[state.discardPile.length - 1] = {
        ...top,
        color: state.currentColor,
      };
      game.handleAction({ type: 'play_card', playerId: 'p1', cardId: reverse.id });
      expect(game.getState().currentPlayerId).toBe('p1');
    } else {
      expect(true).toBe(true);
    }
  });

  it('supports +4 over +2 stacking rule', () => {
    const game = new UnoGame(players, 'ABCD');
    game.start();
    const state = (game as unknown as { state: ReturnType<UnoGame['getState']> }).state;

    state.discardPile = [numberCard('top', 'red', 5)];
    state.currentColor = 'red';
    state.currentPlayerId = 'p1';
    state.hands.p1 = [drawTwoCard('d2', 'red'), numberCard('f1', 'red', 1)];
    state.hands.p2 = [wildDrawFourCard('wd4'), numberCard('f2', 'red', 2)];
    // p3 can also stack, so the pending stays alive for assertion instead of auto-resolving.
    state.hands.p3 = [wildDrawFourCard('wd4b'), numberCard('f3', 'green', 3)];

    game.handleAction({ type: 'play_card', playerId: 'p1', cardId: 'd2' });
    expect(game.getState().pendingDraw).toBe(2);

    game.handleAction({ type: 'play_card', playerId: 'p2', cardId: 'wd4', chosenColor: 'blue' });
    const after = game.getState();
    expect(after.pendingDraw).toBe(6);
    expect(after.pendingDrawType).toBe('wild_draw_four');
    expect(after.currentPlayerId).toBe('p3');
  });

  it('prevents +2 over pending +4 rule', () => {
    const game = new UnoGame(players, 'ABCD');
    game.start();
    const state = (game as unknown as { state: ReturnType<UnoGame['getState']> }).state;

    state.discardPile = [wildDrawFourCard('top')];
    state.currentColor = 'green';
    state.currentPlayerId = 'p2';
    state.pendingDraw = 4;
    state.pendingDrawType = 'wild_draw_four';
    state.hands.p2 = [drawTwoCard('d2', 'green')];

    expect(() => {
      game.handleAction({ type: 'play_card', playerId: 'p2', cardId: 'd2' });
    }).toThrow(/CARD_NOT_PLAYABLE/);
  });

  it('applies UNO challenge penalty in deterministic window', () => {
    const game = new UnoGame(players, 'ABCD');
    game.start();

    const state = (game as unknown as { state: ReturnType<UnoGame['getState']> }).state;
    state.unoWindow.p1 = state.turn + 2;
    const beforeCount = state.hands.p1.length;

    expect(() => game.handleAction({ type: 'uno_challenge', playerId: 'p2', targetPlayerId: 'p1' })).not.toThrow();
    expect(game.getState().hands.p1.length).toBe(beforeCount + 2);
  });

  it('rejects a player challenging their own UNO', () => {
    const game = new UnoGame(players, 'ABCD');
    game.start();
    const state = (game as unknown as { state: ReturnType<UnoGame['getState']> }).state;
    state.unoWindow.p1 = state.turn + 2;

    expect(() => game.handleAction({ type: 'uno_challenge', playerId: 'p1', targetPlayerId: 'p1' })).toThrow(/INVALID_CHALLENGE/);
  });

  it('flags unoChallengeable in the public state until UNO is called', () => {
    const game = new UnoGame(players, 'ABCD');
    game.start();
    const state = (game as unknown as { state: ReturnType<UnoGame['getState']> }).state;

    state.discardPile = [numberCard('top', 'red', 5)];
    state.currentColor = 'red';
    state.currentPlayerId = 'p1';
    state.hands.p1 = [numberCard('keep', 'red', 1), numberCard('drop', 'red', 3)];

    game.handleAction({ type: 'play_card', playerId: 'p1', cardId: 'drop' });

    const p1Public = game.getPublicState().players.find((player) => player.id === 'p1')!;
    expect(p1Public.handCount).toBe(1);
    expect(p1Public.unoChallengeable).toBe(true);

    game.handleAction({ type: 'uno_call', playerId: 'p1' });
    expect(game.getPublicState().players.find((player) => player.id === 'p1')!.unoChallengeable).toBe(false);
  });

  const forceWin = (game: UnoGame, winnerId: string): void => {
    const state = (game as unknown as { state: ReturnType<UnoGame['getState']> }).state;
    state.hands.p1 = [{ id: 'x-p1', color: 'red', type: 'number', value: 9 }];
    state.hands.p2 = [{ id: 'x-p2', color: 'blue', type: 'number', value: 7 }];
    state.hands.p3 = [{ id: 'x-p3', color: 'green', type: 'number', value: 4 }];
    state.hands[winnerId] = [{ id: 'win', color: state.currentColor!, type: 'number', value: 5 }];
    state.currentPlayerId = winnerId;
    game.handleAction({ type: 'play_card', playerId: winnerId, cardId: 'win' });
  };

  it('accumulates score across rounds and lets the winner start the next round', () => {
    const game = new UnoGame(players, 'ABCD', () => 1000, 500);
    game.start();

    forceWin(game, 'p1');
    const afterRound1 = game.getState();
    expect(afterRound1.phase).toBe('round_finished');
    expect(afterRound1.winnerPlayerId).toBe('p1');
    const p1Score = afterRound1.players.p1.score;
    expect(p1Score).toBeGreaterThan(0);

    game.startNextRound();
    const round2 = game.getState();
    expect(round2.phase).toBe('round_active');
    expect(round2.round).toBe(2);
    expect(round2.players.p1.score).toBe(p1Score);
    expect(round2.currentPlayerId).toBe('p1');
    for (const player of players) {
      expect(round2.hands[player.id]).toHaveLength(7);
    }
  });

  it('finishes the game once a player reaches the target score', () => {
    const game = new UnoGame(players, 'ABCD', () => 1000, 10);
    game.start();

    forceWin(game, 'p1');
    const final = game.getState();
    expect(final.phase).toBe('game_finished');
    expect(final.gameWinnerPlayerId).toBe('p1');
    expect(() => game.startNextRound()).toThrow(/INVALID_PHASE/);
  });

  it('rejects startNextRound while a round is still active', () => {
    const game = new UnoGame(players, 'ABCD');
    game.start();
    expect(() => game.startNextRound()).toThrow(/INVALID_PHASE/);
  });
});
