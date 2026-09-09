import type { EvoceGameEvent } from '@party/shared';
import type { SoundSpec } from '@party/ui';

/**
 * Which sound each É Você! event triggers on the host — a synth `@party/ui`
 * name or a bundled CC0 clip via `{ sample: id }`.
 */
export function soundForEvent(event: EvoceGameEvent): SoundSpec | null {
  switch (event.type) {
    case 'round_started':
      return 'turn';
    case 'joker_played':
      return { sample: 'stinger-zap' };
    case 'all_answers_in':
      return { sample: 'ui-confirm' };
    case 'voting_started':
      return { sample: 'card-fan' };
    case 'results_started':
      return { sample: 'stinger-reveal' };
    case 'round_finished':
      return { sample: 'stinger-round' };
    case 'game_finished':
      return { sample: 'stinger-fanfare' };
    default:
      return null;
  }
}
