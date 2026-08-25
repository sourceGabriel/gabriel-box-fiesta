import { nanoid } from 'nanoid';
import type { UnoCard, UnoColor } from '@party/shared';

const COLORS: Exclude<UnoColor, 'wild'>[] = ['red', 'yellow', 'green', 'blue'];

export const createDeck = (): UnoCard[] => {
  const cards: UnoCard[] = [];
  for (const color of COLORS) {
    cards.push({ id: nanoid(12), color, type: 'number', value: 0 });
    for (let value = 1; value <= 9; value += 1) {
      cards.push({ id: nanoid(12), color, type: 'number', value });
      cards.push({ id: nanoid(12), color, type: 'number', value });
    }
    for (let i = 0; i < 2; i += 1) {
      cards.push({ id: nanoid(12), color, type: 'skip', value: null });
      cards.push({ id: nanoid(12), color, type: 'reverse', value: null });
      cards.push({ id: nanoid(12), color, type: 'draw_two', value: null });
    }
  }
  for (let i = 0; i < 4; i += 1) {
    cards.push({ id: nanoid(12), color: 'wild', type: 'wild', value: null });
    cards.push({ id: nanoid(12), color: 'wild', type: 'wild_draw_four', value: null });
  }
  return cards;
};

export const shuffle = <T>(input: T[], random = Math.random): T[] => {
  const clone = [...input];
  for (let i = clone.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [clone[i], clone[j]] = [clone[j], clone[i]];
  }
  return clone;
};
