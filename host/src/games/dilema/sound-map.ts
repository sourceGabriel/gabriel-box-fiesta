import type { DilemaGameEvent } from '@party/shared';
import type { SoundSpec } from '@party/ui';

/**
 * Which sound each Dilema event triggers on the host — a synth `@party/ui` name,
 * a bundled CC0 clip via `{ sample: id }`, or a `{ cue, fallback }` meme hook.
 */
export function soundForEvent(event: DilemaGameEvent): SoundSpec | null {
  switch (event.type) {
    case 'round_started':
      return { cue: 'meme.roundStart', fallback: 'turn' };
    case 'assignments_made':
      return { sample: 'card-shuffle' };
    case 'playing_started':
      return { sample: 'card-deal' };
    case 'card_played':
      return { sample: 'ui-drop', gain: 0.6 };
    case 'all_cards_in':
      return { sample: 'ui-confirm' };
    case 'verdict_started':
      return { cue: 'meme.reveal', fallback: { sample: 'ui-question' } };
    case 'verdict_cast':
      return { sample: 'chip-clash' };
    case 'round_finished':
      return { sample: 'stinger-round' };
    case 'game_finished':
      return { cue: 'meme.gameover', fallback: { sample: 'stinger-fanfare' } };
    default:
      return null;
  }
}
