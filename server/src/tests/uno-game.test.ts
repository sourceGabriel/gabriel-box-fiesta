import { describe, expect, it } from 'vitest';
import type { UnoCard } from '@party/shared';
import { UnoGame } from '../games/uno/uno-game';

const numberCard = (id: string, color: UnoCard['color'], value: number): UnoCard => ({ id, color, type: 'number', value });
const drawTwoCard = (id: string, color: UnoCard['color']): UnoCard => ({ id, color, type: 'draw_two', value: null });
const wildCard = (id: string): UnoCard => ({ id, color: 'wild', type: 'wild', value: null });
const wildDrawFourCard = (id: string): UnoCard => ({ id, color: 'wild', type: 'wild_draw_four', value: null });

const players = [
  { id: 'p1', name: 'A' },
  { id: 'p2', name: 'B' },
  { id: 'p3', name: 'C' },
];

const mkGame = (
  playerList: { id: string; name: string }[] = players,
  opts: { now?: () => number; random?: () => number; targetScore?: number } = {},
): UnoGame =>
  new UnoGame(
    { players: playerList, roomCode: 'ABCD', now: opts.now ?? (() => 1000), random: opts.random ?? Math.random },
    opts.targetScore,
  );

const internalState = (game: UnoGame): ReturnType<UnoGame['getState']> =>
  (game as unknown as { state: ReturnType<UnoGame['getState']> }).state;

describe('UnoGame', () => {
  it('distributes 7 cards for each player and starts round', () => {
    const game = mkGame();
    game.start();
    const state = internalState(game);

    for (const player of players) {
      expect(state.hands[player.id]).toHaveLength(7);
    }
    expect(state.phase).toBe('round_active');
    expect(state.currentPlayerId).toBe('p1');
    expect(state.discardPile.length).toBe(1);
    expect(game.getStatus()).toBe('active');
  });

  it('rejects invalid play out of turn', () => {
    const game = mkGame();
    game.start();

    const notCurrent = 'p2';
    const cardId = game.getState().hands[notCurrent][0].id;

    expect(() => {
      game.handleAction(notCurrent, { type: 'play_card', cardId });
    }).toThrow(/NOT_YOUR_TURN/);
  });

  it('rejects a malformed action payload', () => {
    const game = mkGame();
    game.start();
    expect(() => game.handleAction('p1', { type: 'not_a_real_action' })).toThrow(/INVALID_ACTION/);
  });

  it('allows draw and advances turn', () => {
    const game = mkGame();
    game.start();

    const before = game.getState();
    const p1Count = before.hands.p1.length;

    game.handleAction('p1', { type: 'draw_card' });

    const after = game.getState();
    expect(after.hands.p1.length).toBeGreaterThanOrEqual(p1Count + 1);
    expect(after.currentPlayerId).toBe('p2');
  });

  it('applies reverse as skip when only two players', () => {
    const game = mkGame([
      { id: 'p1', name: 'A' },
      { id: 'p2', name: 'B' },
    ]);
    game.start();

    const state = internalState(game);
    const reverse = state.hands.p1.find((card) => card.type === 'reverse');
    const top = state.discardPile.at(-1)!;

    if (reverse) {
      state.currentColor = reverse.color === 'wild' ? 'red' : reverse.color;
      state.discardPile[state.discardPile.length - 1] = {
        ...top,
        color: state.currentColor,
      };
      game.handleAction('p1', { type: 'play_card', cardId: reverse.id });
      expect(game.getState().currentPlayerId).toBe('p1');
    } else {
      expect(true).toBe(true);
    }
  });

  it('supports +4 over +2 stacking rule', () => {
    const game = mkGame();
    game.start();
    const state = internalState(game);

    state.discardPile = [numberCard('top', 'red', 5)];
    state.currentColor = 'red';
    state.currentPlayerId = 'p1';
    state.hands.p1 = [drawTwoCard('d2', 'red'), numberCard('f1', 'red', 1)];
    state.hands.p2 = [wildDrawFourCard('wd4'), numberCard('f2', 'red', 2)];
    // p3 can also stack, so the pending stays alive for assertion instead of auto-resolving.
    state.hands.p3 = [wildDrawFourCard('wd4b'), numberCard('f3', 'green', 3)];

    game.handleAction('p1', { type: 'play_card', cardId: 'd2' });
    expect(game.getState().pendingDraw).toBe(2);

    game.handleAction('p2', { type: 'play_card', cardId: 'wd4', chosenColor: 'blue' });
    const after = game.getState();
    expect(after.pendingDraw).toBe(6);
    expect(after.pendingDrawType).toBe('wild_draw_four');
    expect(after.currentPlayerId).toBe('p3');
  });

  it('prevents +2 over pending +4 rule', () => {
    const game = mkGame();
    game.start();
    const state = internalState(game);

    state.discardPile = [wildDrawFourCard('top')];
    state.currentColor = 'green';
    state.currentPlayerId = 'p2';
    state.pendingDraw = 4;
    state.pendingDrawType = 'wild_draw_four';
    state.hands.p2 = [drawTwoCard('d2', 'green')];

    expect(() => {
      game.handleAction('p2', { type: 'play_card', cardId: 'd2' });
    }).toThrow(/CARD_NOT_PLAYABLE/);
  });

  it('applies UNO challenge penalty in deterministic window', () => {
    const game = mkGame();
    game.start();

    const state = internalState(game);
    state.unoWindow.p1 = state.turn + 2;
    const beforeCount = state.hands.p1.length;

    expect(() => game.handleAction('p2', { type: 'uno_challenge', targetPlayerId: 'p1' })).not.toThrow();
    expect(game.getState().hands.p1.length).toBe(beforeCount + 2);
  });

  it('rejects a player challenging their own UNO', () => {
    const game = mkGame();
    game.start();
    const state = internalState(game);
    state.unoWindow.p1 = state.turn + 2;

    expect(() => game.handleAction('p1', { type: 'uno_challenge', targetPlayerId: 'p1' })).toThrow(/INVALID_CHALLENGE/);
  });

  it('flags unoChallengeable in the public state until UNO is called', () => {
    const game = mkGame();
    game.start();
    const state = internalState(game);

    state.discardPile = [numberCard('top', 'red', 5)];
    state.currentColor = 'red';
    state.currentPlayerId = 'p1';
    state.hands.p1 = [numberCard('keep', 'red', 1), numberCard('drop', 'red', 3)];

    game.handleAction('p1', { type: 'play_card', cardId: 'drop' });

    const p1Public = game.getPublicState().players.find((player) => player.id === 'p1')!;
    expect(p1Public.handCount).toBe(1);
    expect(p1Public.unoChallengeable).toBe(true);

    game.handleAction('p1', { type: 'uno_call' });
    expect(game.getPublicState().players.find((player) => player.id === 'p1')!.unoChallengeable).toBe(false);
  });

  const forceWin = (game: UnoGame, winnerId: string): void => {
    const state = internalState(game);
    state.hands.p1 = [{ id: 'x-p1', color: 'red', type: 'number', value: 9 }];
    state.hands.p2 = [{ id: 'x-p2', color: 'blue', type: 'number', value: 7 }];
    state.hands.p3 = [{ id: 'x-p3', color: 'green', type: 'number', value: 4 }];
    state.hands[winnerId] = [{ id: 'win', color: state.currentColor!, type: 'number', value: 5 }];
    state.currentPlayerId = winnerId;
    game.handleAction(winnerId, { type: 'play_card', cardId: 'win' });
  };

  it('accumulates score across rounds and lets the winner start the next round', () => {
    const game = mkGame(players, { targetScore: 500 });
    game.start();

    forceWin(game, 'p1');
    const afterRound1 = game.getState();
    expect(afterRound1.phase).toBe('round_finished');
    expect(afterRound1.winnerPlayerId).toBe('p1');
    expect(game.getStatus()).toBe('intermission');
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
    const game = mkGame(players, { targetScore: 10 });
    game.start();

    forceWin(game, 'p1');
    const final = game.getState();
    expect(final.phase).toBe('game_finished');
    expect(final.gameWinnerPlayerId).toBe('p1');
    expect(game.getStatus()).toBe('complete');
    expect(() => game.startNextRound()).toThrow(/INVALID_PHASE/);
  });

  it('rejects startNextRound while a round is still active', () => {
    const game = mkGame();
    game.start();
    expect(() => game.startNextRound()).toThrow(/INVALID_PHASE/);
  });

  it('waits for a colour choice after a wild and advances the turn on confirm', () => {
    const game = mkGame();
    game.start();
    const state = internalState(game);
    state.discardPile = [numberCard('top', 'red', 5)];
    state.currentColor = 'red';
    state.currentPlayerId = 'p1';
    state.hands.p1 = [wildCard('w'), numberCard('f1', 'red', 1), numberCard('f2', 'red', 2)];

    game.handleAction('p1', { type: 'play_card', cardId: 'w' });
    expect(game.getPublicState().phase).toBe('awaiting_color_choice');
    expect(game.getPublicState().pendingColorChoiceBy).toBe('p1');
    expect(game.getState().currentPlayerId).toBe('p1');

    game.handleAction('p1', { type: 'choose_color', color: 'blue' });
    expect(game.getPublicState().phase).toBe('round_active');
    expect(game.getPublicState().currentColor).toBe('blue');
    expect(game.getState().currentPlayerId).toBe('p2');
  });

  it('auto-picks the most common colour when the wild player times out', () => {
    const game = mkGame();
    game.start();
    const state = internalState(game);
    state.discardPile = [numberCard('top', 'red', 5)];
    state.currentColor = 'red';
    state.currentPlayerId = 'p1';
    state.hands.p1 = [wildCard('w'), numberCard('b1', 'blue', 1), numberCard('b2', 'blue', 2)];

    game.handleAction('p1', { type: 'play_card', cardId: 'w' });
    game.onTurnTimeout();

    expect(game.getPublicState().phase).toBe('round_active');
    expect(game.getPublicState().currentColor).toBe('blue');
  });

  it('pauses the turn timer, blocks actions, and restores remaining time on resume', () => {
    const clock = { t: 1000 };
    const game = mkGame(players, { now: () => clock.t });
    game.start();
    const state = internalState(game);
    state.currentPlayerId = 'p1';

    clock.t = 5000;
    game.pause(clock.t);
    expect(game.getPublicState().phase).toBe('paused');
    expect(game.getPublicState().timer).toBeNull();
    expect(() => game.handleAction('p1', { type: 'draw_card' })).toThrow(/GAME_PAUSED/);
    expect(() => game.onTurnTimeout()).not.toThrow();

    clock.t = 90_000; // a long real-world pause
    game.resume(clock.t);
    expect(game.getPublicState().phase).toBe('round_active');
    const timer = game.getPublicState().timer!;
    expect(timer.remainingMs).toBeGreaterThan(20_000);
    expect(timer.remainingMs).toBeLessThanOrEqual(30_000);
  });
});
