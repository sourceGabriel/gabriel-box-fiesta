/**
 * @party/ui — shared design system for @party/host and @party/mobile.
 *
 * - Design tokens: `import '@party/ui/tokens.css'` (src/tokens.css).
 * - Component styles: `import '@party/ui/components.css'` (src/components.css).
 * - Both are imported once per app in main.tsx, before the app's own index.css.
 */

export * from './components';
export { createSounds, getSounds, type Sounds, type SoundName } from './sound';
