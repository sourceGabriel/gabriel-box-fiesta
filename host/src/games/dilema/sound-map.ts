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
    case 'pick_step_started':
      return { sample: 'card-deal' };
    case 'team_proposed':
      return { sample: 'ui-drop', gain: 0.5 };
    case 'team_locked':
      return { sample: 'ui-confirm' };
    // `both_locked` fires back-to-back with `pick_step_started` / `verdict_started` — let those be the cue.
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
