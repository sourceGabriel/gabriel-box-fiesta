import type { Character, Influence } from './types';

/** A seated player. Ported from the standalone repo's `src/engine/Player.ts` (no factions). */
export class Player {
  readonly id: string;
  readonly name: string;
  coins = 0;
  influences: Influence[] = [];
  seatIndex: number;

  constructor(id: string, name: string, seatIndex: number) {
    this.id = id;
    this.name = name;
    this.seatIndex = seatIndex;
  }

  get isAlive(): boolean {
    return this.influences.some((inf) => !inf.revealed);
  }

  get aliveInfluenceCount(): number {
    return this.influences.filter((inf) => !inf.revealed).length;
  }

  /** Unrevealed characters still in hand. */
  get hiddenCharacters(): Character[] {
    return this.influences.filter((inf) => !inf.revealed).map((inf) => inf.character);
  }

  hasCharacter(character: Character): boolean {
    return this.influences.some((inf) => inf.character === character && !inf.revealed);
  }

  revealInfluence(index: number): Character | null {
    if (index < 0 || index >= this.influences.length) return null;
    if (this.influences[index].revealed) return null;
    this.influences[index].revealed = true;
    return this.influences[index].character;
  }

  findInfluenceIndex(character: Character): number {
    return this.influences.findIndex((inf) => inf.character === character && !inf.revealed);
  }

  /** Replace an unrevealed influence (used after a successful challenge defense). */
  replaceInfluence(character: Character, newCharacter: Character): boolean {
    const index = this.findInfluenceIndex(character);
    if (index === -1) return false;
    this.influences[index].character = newCharacter;
    return true;
  }

  addCoins(amount: number): void {
    this.coins += amount;
  }

  removeCoins(amount: number): boolean {
    if (this.coins < amount) return false;
    this.coins -= amount;
    return true;
  }
}
