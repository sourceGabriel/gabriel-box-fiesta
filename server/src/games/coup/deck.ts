import { CARDS_PER_CHARACTER } from './constants';
import { CHARACTERS, type Character } from './types';

/**
 * The court deck. Ported from the standalone repo's `src/engine/Deck.ts`,
 * trimmed to the classic 5-character deck and with an injected RNG
 * (`random: () => number` in `[0, 1)`) instead of `crypto.randomInt`.
 */
export class Deck {
  private cards: Character[] = [];

  constructor(private readonly random: () => number) {
    this.reset();
  }

  reset(): void {
    this.cards = [];
    for (const char of CHARACTERS) {
      for (let i = 0; i < CARDS_PER_CHARACTER; i += 1) {
        this.cards.push(char);
      }
    }
  }

  shuffle(): void {
    for (let i = this.cards.length - 1; i > 0; i -= 1) {
      const j = Math.floor(this.random() * (i + 1));
      [this.cards[i], this.cards[j]] = [this.cards[j], this.cards[i]];
    }
  }

  draw(): Character | undefined {
    return this.cards.pop();
  }

  drawMultiple(count: number): Character[] {
    const drawn: Character[] = [];
    for (let i = 0; i < count; i += 1) {
      const card = this.draw();
      if (card !== undefined) {
        drawn.push(card);
      }
    }
    return drawn;
  }

  returnCard(card: Character): void {
    this.cards.push(card);
  }

  /** Return a card then shuffle (used after a successful challenge defense). */
  returnAndShuffle(card: Character): void {
    this.returnCard(card);
    this.shuffle();
  }

  get size(): number {
    return this.cards.length;
  }

  getCards(): Character[] {
    return [...this.cards];
  }

  /** Test/reset hook — replace the draw pile wholesale. */
  setCards(cards: Character[]): void {
    this.cards = [...cards];
  }
}
