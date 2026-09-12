import type { Fase10GameEvent } from '@party/shared';
import type { SoundSpec } from '@party/ui';

/**
 * Which sound each Fase 10 event triggers on the host — a synth `@party/ui`
 * name, a bundled CC0 clip via `{ sample }`, or a `{ cue, fallback }` meme hook.
 * Mirrors `sintonia/sound-map.ts`.
 */
export function soundForEvent(event: Fase10GameEvent): SoundSpec | null {
  switch (event.type) {
    case 'hand_started':
      return { cue: 'meme.roundStart', fallback: { sample: 'card-shuffle' } };
    case 'card_drawn':
      return { sample: 'card-deal', gain: 0.4 };
    case 'card_discarded':
      return { sample: 'card-play', gain: 0.5 };
    case 'phase_laid':
      return { cue: 'meme.reveal', fallback: { sample: 'stinger-round' } };
    case 'hit_made':
      return { sample: 'ui-drop', gain: 0.5 };
    case 'player_skipped':
      return { sample: 'ui-error' };
    case 'hand_over':
      return { sample: 'stinger-round' };
    case 'game_over':
      return { cue: 'meme.win', fallback: { sample: 'stinger-fanfare' } };
    default:
      return null;
  }
}
