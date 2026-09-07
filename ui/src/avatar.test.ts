import { describe, expect, it } from 'vitest';
import {
  BG_COLORS,
  DEFAULT_AVATAR,
  EYE_COLORS,
  GENDERS,
  HAIR_COLORS,
  HAIR_STYLES,
  HATS,
  SHIRTS,
  SKIN_TONES,
  randomAvatar,
  sanitizeAvatar,
} from './avatar';

const isValid = (a: ReturnType<typeof sanitizeAvatar>): boolean =>
  GENDERS.some((o) => o.id === a.gender) &&
  SKIN_TONES.some((o) => o.id === a.skin) &&
  HAIR_STYLES.some((o) => o.id === a.hair) &&
  HAIR_COLORS.some((o) => o.id === a.hairColor) &&
  EYE_COLORS.some((o) => o.id === a.eyes) &&
  SHIRTS.some((o) => o.id === a.shirt) &&
  HATS.some((o) => o.id === a.hat) &&
  BG_COLORS.some((o) => o.id === a.bg);

describe('avatar helpers', () => {
  it('DEFAULT_AVATAR is a valid spec', () => {
    expect(isValid(DEFAULT_AVATAR)).toBe(true);
  });

  it('sanitizeAvatar clamps junk to the default', () => {
    expect(sanitizeAvatar(null)).toEqual(DEFAULT_AVATAR);
    expect(sanitizeAvatar({ gender: 'nope', hat: 123, bg: 'teal' })).toEqual({
      ...DEFAULT_AVATAR,
      bg: 'teal',
    });
  });

  it('sanitizeAvatar keeps every known field', () => {
    const spec = {
      gender: 'male',
      skin: 'brown',
      hair: 'afro',
      hairColor: 'pink',
      eyes: 'purple',
      shirt: 'polo',
      hat: 'crown',
      bg: 'teal',
    };
    expect(sanitizeAvatar(spec)).toEqual(spec);
  });

  it('randomAvatar always returns a valid spec', () => {
    const seq = [0, 0.99, 0.5, 0.25, 0.75, 0.1, 0.999999, 0.33];
    let i = 0;
    const rng = () => seq[i++ % seq.length];
    for (let n = 0; n < 24; n += 1) {
      expect(isValid(randomAvatar(rng))).toBe(true);
    }
  });
});
