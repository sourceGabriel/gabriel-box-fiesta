/**
 * @party/ui — shared design system for @party/host and @party/mobile.
 *
 * - Design tokens: `import '@party/ui/tokens.css'` (src/tokens.css).
 * - Component styles: `import '@party/ui/components.css'` (src/components.css).
 * - Both are imported once per app in main.tsx, before the app's own index.css.
 */

export * from './components';
export {
  GENDERS,
  SKIN_TONES,
  HAIR_STYLES,
  HAIR_COLORS,
  EYE_COLORS,
  SHIRTS,
  HATS,
  BG_COLORS,
  DEFAULT_AVATAR,
  sanitizeAvatar,
  randomAvatar,
  bgHex,
  isGabsintoName,
  GABSINTO_NAME,
  AVATAR_PRESETS,
  AVATAR_PRESET_IDS,
  getAvatarPreset,
  type AvatarOption,
  type AvatarColorOption,
  type AvatarPreset,
} from './avatar';
export { createSounds, getSounds, type Sounds, type SoundName } from './sound';
