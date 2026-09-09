import type { SabeTudoGameEvent } from '@party/shared';
import type { SoundSpec } from '@party/ui';

/**
 * Which sound each Sabe-Tudo event triggers on the host — a synth `@party/ui`
 * name or a bundled CC0 clip via `{ sample: id }`.
 */
export function soundForEvent(event: SabeTudoGameEvent): SoundSpec | null {
  switch (event.type) {
    case 'question_started':
      return 'turn';
    case 'all_answers_in':
      return { sample: 'ui-confirm' };
    case 'reveal_started':
      return { sample: 'ui-question' };
    case 'round_finished':
      return { sample: 'stinger-round' };
    case 'game_finished':
      return { sample: 'stinger-fanfare' };
    default:
      return null;
  }
}
