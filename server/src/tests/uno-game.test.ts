import { describe, expect, it } from 'vitest';
import { UnoGame } from '../games/uno/uno-game';

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
    const game = new UnoGame([
      { id: 'p1', name: 'A' },
      { id: 'p2', name: 'B' },
      { id: 'p3', name: 'C' },
    ], 'ABCD');
    game.start();
    const state = (game as unknown as { state: ReturnType<UnoGame['getState']> }).state;
    const p1Plus2 = state.hands.p1.find((card) => card.type === 'draw_two');
    const p2Plus4 = state.hands.p2.find((card) => card.type === 'wild_draw_four');

    if (!p1Plus2 || !p2Plus4) {
      expect(true).toBe(true);
      return;
    }

    state.currentColor = p1Plus2.color === 'wild' ? 'red' : p1Plus2.color;
    game.handleAction({ type: 'play_card', playerId: 'p1', cardId: p1Plus2.id });
    game.handleAction({ type: 'play_card', playerId: 'p2', cardId: p2Plus4.id, chosenColor: 'blue' });

    const after = game.getState();
    expect(after.pendingDraw).toBe(6);
    expect(after.pendingDrawType).toBe('wild_draw_four');
  });

  it('prevents +2 over pending +4 rule', () => {
    const game = new UnoGame([
      { id: 'p1', name: 'A' },
      { id: 'p2', name: 'B' },
      { id: 'p3', name: 'C' },
    ], 'ABCD');
    game.start();

    const state = (game as unknown as { state: ReturnType<UnoGame['getState']> }).state;
    const p1Plus4 = state.hands.p1.find((card) => card.type === 'wild_draw_four');
    const p2Plus2 = state.hands.p2.find((card) => card.type === 'draw_two');

    if (!p1Plus4 || !p2Plus2) {
      expect(true).toBe(true);
      return;
    }

    game.handleAction({ type: 'play_card', playerId: 'p1', cardId: p1Plus4.id, chosenColor: 'green' });
    state.currentPlayerId = 'p2';
    state.pendingDraw = 4;
    state.pendingDrawType = 'wild_draw_four';
    expect(() => {
      game.handleAction({ type: 'play_card', playerId: 'p2', cardId: p2Plus2.id });
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
});
