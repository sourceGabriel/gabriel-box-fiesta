import { describe, expect, it } from 'vitest';
import { roundTaunt } from './taunt';

describe('roundTaunt', () => {
  it('needs at least two players', () => {
    expect(roundTaunt([], 0)).toBeNull();
    expect(roundTaunt([{ name: 'Ana', score: 10 }], 0)).toBeNull();
  });

  it('names the leader and the last place', () => {
    const s = [
      { name: 'Ana', score: 50 },
      { name: 'Beto', score: 30 },
      { name: 'Cadu', score: 10 },
    ];
    const line = roundTaunt(s, 0)!;
    expect(line).toContain('Ana');
    expect(line).toContain('Cadu');
    expect(line).not.toContain('{L}');
    expect(line).not.toContain('{U}');
  });

  it('is deterministic per seed and unsorted input is fine', () => {
    const s = [
      { name: 'Beto', score: 30 },
      { name: 'Cadu', score: 10 },
      { name: 'Ana', score: 50 },
    ];
    expect(roundTaunt(s, 3)).toBe(roundTaunt([...s].reverse(), 3));
  });

  it('calls out a flat tie', () => {
    const s = [{ name: 'Ana', score: 20 }, { name: 'Beto', score: 20 }];
    expect(roundTaunt(s, 1)).toMatch(/empate/i);
  });
});
