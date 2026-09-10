import { nanoid } from 'nanoid';
import type { Fase10Card, Fase10Color } from '@party/shared';

const COLORS: Fase10Color[] = ['red', 'yellow', 'green', 'blue'];

/** A standard Phase 10 deck: 96 number cards (1–12 ×2 per colour), 8 wilds, 4 skips = 108. */
export const createDeck = (): Fase10Card[] => {
  const cards: Fase10Card[] = [];
  for (const color of COLORS) {
    for (let value = 1; value <= 12; value += 1) {
      cards.push({ id: nanoid(12), kind: 'number', color, value });
      cards.push({ id: nanoid(12), kind: 'number', color, value });
    }
  }
  for (let i = 0; i < 8; i += 1) cards.push({ id: nanoid(12), kind: 'wild' });
  for (let i = 0; i < 4; i += 1) cards.push({ id: nanoid(12), kind: 'skip' });
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
