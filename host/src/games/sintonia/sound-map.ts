import type { SintoniaGameEvent } from '@party/shared';
import type { SoundSpec } from '@party/ui';

/**
 * Which sound each Sintonia event triggers on the host — a synth `@party/ui`
 * name, a bundled CC0 clip via `{ sample: id }`, or a `{ cue, fallback }` meme
 * hook. Mirrors `zap/sound-map.ts`.
 */
export function soundForEvent(event: SintoniaGameEvent): SoundSpec | null {
  switch (event.type) {
    case 'round_started':
      return { cue: 'meme.roundStart', fallback: 'turn' };
    case 'clue_given':
      return { sample: 'ui-confirm' };
    case 'clue_skipped':
      return { sample: 'ui-error' };
    case 'guessing_started':
      return { sample: 'card-deal' };
    case 'dial_locked':
      return { sample: 'ui-drop', gain: 0.7 };
    case 'round_revealed':
      return event.bandPoints >= 3
        ? { cue: 'meme.win', fallback: { sample: 'stinger-round' } }
        : { cue: 'meme.reveal', fallback: { sample: 'ui-open' } };
    case 'game_finished':
      return { cue: 'meme.gameover', fallback: { sample: 'stinger-fanfare' } };
    default:
      return null;
  }
}
