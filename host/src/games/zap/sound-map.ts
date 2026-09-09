import type { ZapGameEvent } from '@party/shared';
import type { SoundSpec } from '@party/ui';

/**
 * Which sound each Zap! event triggers on the host — a synth `@party/ui` name
 * or a bundled CC0 clip via `{ sample: id }`. The shell has no idea what a
 * "duel_revealed" is.
 */
export function soundForEvent(event: ZapGameEvent): SoundSpec | null {
  switch (event.type) {
    case 'round_started':
      return 'turn';
    case 'all_answers_in':
      return { sample: 'ui-confirm' };
    case 'duel_started':
      return { sample: 'card-play' };
    case 'duel_revealed':
      return event.zap ? { sample: 'stinger-zap' } : { sample: 'ui-open' };
    case 'round_finished':
      return { sample: 'stinger-round' };
    case 'game_finished':
      return { sample: 'stinger-fanfare' };
    default:
      return null;
  }
}
