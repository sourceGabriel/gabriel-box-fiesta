import type { LorotaGameEvent } from '@party/shared';
import type { SoundSpec } from '@party/ui';

/**
 * Which sound each Lorota! event triggers on the host — a synth `@party/ui`
 * name or a bundled CC0 clip via `{ sample: id }`.
 */
export function soundForEvent(event: LorotaGameEvent): SoundSpec | null {
  switch (event.type) {
    case 'round_started':
      return { cue: 'meme.roundStart', fallback: 'turn' };
    case 'all_lies_in':
      return { sample: 'ui-confirm' };
    case 'guessing_started':
      return { sample: 'card-fan' };
    case 'reveal_started':
      return { cue: 'meme.reveal', fallback: { sample: 'stinger-reveal' } };
    case 'round_finished':
      return { sample: 'stinger-round' };
    case 'game_finished':
      return { cue: 'meme.gameover', fallback: { sample: 'stinger-fanfare' } };
    default:
      return null;
  }
}
