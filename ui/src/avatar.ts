/**
 * Avatar catalogs + helpers. `AvatarSpec` (the wire contract) lives in
 * `@party/shared`; the sprite layers + hair palettes are generated into
 * `./avatar-assets/` by `tools/build-avatars.py`. Keep the ids below in sync
 * with the catalog in that script.
 */
import type { AvatarSpec } from '@party/shared';

export type AvatarOption = { id: string; label: string };
export type AvatarColorOption = AvatarOption & { hex: string };

/** Body base. */
export const GENDERS: AvatarOption[] = [
  { id: 'female', label: 'Feminino' },
  { id: 'male', label: 'Masculino' },
];

/** Skin tones — `hex` is only a swatch hint (real colour is baked into the sprite). */
export const SKIN_TONES: AvatarColorOption[] = [
  { id: 'light', label: 'Clara', hex: '#f2c9a0' },
  { id: 'amber', label: 'Amêndoa', hex: '#e0a878' },
  { id: 'taupe', label: 'Morena', hex: '#c68a5e' },
  { id: 'bronze', label: 'Bronze', hex: '#a56a43' },
  { id: 'brown', label: 'Castanha', hex: '#7d4b2e' },
  { id: 'black', label: 'Retinta', hex: '#5a3620' },
];

/** Hair styles. `bald` renders no hair. */
export const HAIR_STYLES: AvatarOption[] = [
  { id: 'bald', label: 'Careca' },
  { id: 'buzz', label: 'Raspado' },
  { id: 'fade', label: 'Corte alto' },
  { id: 'cowlick', label: 'Repartido' },
  { id: 'curly', label: 'Cacheado' },
  { id: 'afro', label: 'Black power' },
  { id: 'cornrows', label: 'Tranças rente' },
  { id: 'dreads', label: 'Dreads' },
  { id: 'messy', label: 'Bagunçado' },
  { id: 'bedhead', label: 'Amassado' },
  { id: 'mop', label: 'Espetado' },
  { id: 'page', label: 'Tigela' },
  { id: 'parted', label: 'Social' },
  { id: 'bob', label: 'Chanel' },
  { id: 'lob', label: 'Long bob' },
  { id: 'straight', label: 'Liso longo' },
  { id: 'long', label: 'Comprido' },
  { id: 'loose', label: 'Solto ondulado' },
  { id: 'curtains', label: 'Cortina' },
  { id: 'halfup', label: 'Meio preso' },
  { id: 'bun', label: 'Coque' },
  { id: 'pigtails', label: 'Maria-chiquinha' },
  { id: 'pigtails_bangs', label: 'Chiquinha c/ franja' },
  { id: 'braid', label: 'Trança lateral' },
  { id: 'ponytail', label: 'Rabo de cavalo' },
];

/** Hair colours — matches the ramps in `avatar-assets/palettes.ts`. */
export const HAIR_COLORS: AvatarColorOption[] = [
  { id: 'black', label: 'Preto', hex: '#1b1b1b' },
  { id: 'dark_brown', label: 'Castanho escuro', hex: '#3a2213' },
  { id: 'chestnut', label: 'Castanho', hex: '#7a3d10' },
  { id: 'light_brown', label: 'Castanho claro', hex: '#a5691f' },
  { id: 'blonde', label: 'Loiro', hex: '#e6b34a' },
  { id: 'platinum', label: 'Platinado', hex: '#e8dcae' },
  { id: 'ash', label: 'Acinzentado', hex: '#c79aa0' },
  { id: 'ginger', label: 'Ruivo', hex: '#d06a12' },
  { id: 'red', label: 'Vermelho', hex: '#c21f1f' },
  { id: 'raven', label: 'Azulado', hex: '#12374d' },
  { id: 'pink', label: 'Rosa', hex: '#e64196' },
  { id: 'purple', label: 'Roxo', hex: '#8b5cf6' },
];

/** Eye colours. */
export const EYE_COLORS: AvatarColorOption[] = [
  { id: 'brown', label: 'Castanho', hex: '#5b3a1e' },
  { id: 'blue', label: 'Azul', hex: '#2f6fb3' },
  { id: 'green', label: 'Verde', hex: '#3b7d4f' },
  { id: 'gray', label: 'Cinza', hex: '#64748b' },
  { id: 'orange', label: 'Âmbar', hex: '#c17d2b' },
  { id: 'purple', label: 'Violeta', hex: '#7c3aed' },
];

/** Shirts / tops. */
export const SHIRTS: AvatarColorOption[] = [
  { id: 'tee', label: 'Camiseta', hex: '#d13b3b' },
  { id: 'vneck', label: 'Gola V', hex: '#3f6fb5' },
  { id: 'scoop', label: 'Gola canoa', hex: '#2fa39a' },
  { id: 'longsleeve', label: 'Manga longa', hex: '#7d5bbe' },
  { id: 'tank', label: 'Regata', hex: '#e0a92b' },
  { id: 'polo', label: 'Polo', hex: '#3f7d4a' },
  { id: 'cardigan', label: 'Cardigã', hex: '#6b7280' },
  { id: 'wrap', label: 'Casaquinho', hex: '#d16d8a' },
];

/** Funny hats. `none` renders no hat. */
export const HATS: AvatarOption[] = [
  { id: 'none', label: 'Sem chapéu' },
  { id: 'crown', label: 'Coroa' },
  { id: 'tophat', label: 'Cartola' },
  { id: 'tiara', label: 'Tiara' },
  { id: 'wizard', label: 'Mago' },
  { id: 'tricorne', label: 'Pirata' },
  { id: 'bandana', label: 'Bandana' },
  { id: 'headband', label: 'Faixa ninja' },
  { id: 'santa', label: 'Noel' },
  { id: 'bonnie', label: 'Bicorne' },
];

/** Background colours. */
export const BG_COLORS: AvatarColorOption[] = [
  { id: 'amber', label: 'Âmbar', hex: '#f59e0b' },
  { id: 'red', label: 'Vermelho', hex: '#ef4444' },
  { id: 'blue', label: 'Azul', hex: '#3b82f6' },
  { id: 'green', label: 'Verde', hex: '#22c55e' },
  { id: 'purple', label: 'Roxo', hex: '#a855f7' },
  { id: 'pink', label: 'Rosa', hex: '#ec4899' },
  { id: 'teal', label: 'Turquesa', hex: '#14b8a6' },
  { id: 'slate', label: 'Chumbo', hex: '#64748b' },
];

export const DEFAULT_AVATAR: AvatarSpec = {
  gender: 'female',
  skin: 'light',
  hair: 'bob',
  hairColor: 'chestnut',
  eyes: 'brown',
  shirt: 'tee',
  hat: 'none',
  bg: 'amber',
};

const has = (list: AvatarOption[], v: unknown): v is string =>
  typeof v === 'string' && list.some((o) => o.id === v);

export const bgHex = (id: string): string =>
  (BG_COLORS.find((o) => o.id === id) ?? BG_COLORS[0]).hex;

/** Clamp any untrusted input (wire payload, localStorage) to a valid spec. */
export function sanitizeAvatar(raw: unknown): AvatarSpec {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  return {
    gender: has(GENDERS, r.gender) ? r.gender : DEFAULT_AVATAR.gender,
    skin: has(SKIN_TONES, r.skin) ? r.skin : DEFAULT_AVATAR.skin,
    hair: has(HAIR_STYLES, r.hair) ? r.hair : DEFAULT_AVATAR.hair,
    hairColor: has(HAIR_COLORS, r.hairColor) ? r.hairColor : DEFAULT_AVATAR.hairColor,
    eyes: has(EYE_COLORS, r.eyes) ? r.eyes : DEFAULT_AVATAR.eyes,
    shirt: has(SHIRTS, r.shirt) ? r.shirt : DEFAULT_AVATAR.shirt,
    hat: has(HATS, r.hat) ? r.hat : DEFAULT_AVATAR.hat,
    bg: has(BG_COLORS, r.bg) ? r.bg : DEFAULT_AVATAR.bg,
  };
}

/** A random valid avatar. Pass a seeded RNG in tests. */
export function randomAvatar(rng: () => number = Math.random): AvatarSpec {
  const pick = <T extends AvatarOption>(list: T[]): string =>
    list[Math.floor(rng() * list.length) % list.length].id;
  return {
    gender: pick(GENDERS),
    skin: pick(SKIN_TONES),
    hair: pick(HAIR_STYLES),
    hairColor: pick(HAIR_COLORS),
    eyes: pick(EYE_COLORS),
    shirt: pick(SHIRTS),
    hat: pick(HATS),
    bg: pick(BG_COLORS),
  };
}
