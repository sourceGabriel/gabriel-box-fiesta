import type { LorotaGameEvent } from '@party/shared';
import type { SoundName } from '@party/ui';

/**
 * Which `@party/ui` sound (if any) each Lorota! event triggers on the host.
 * Mirrors `host/src/games/{uno,zap}/sound-map.ts`.
 */
export function soundForEvent(event: LorotaGameEvent): SoundName | null {
  switch (event.type) {
    case 'round_started':
      return 'turn';
    case 'all_lies_in':
      return 'select';
    case 'guessing_started':
      return 'cardPlay';
    case 'reveal_started':
      return 'special';
    case 'round_finished':
    case 'game_finished':
      return 'win';
    default:
      return null;
  }
}
