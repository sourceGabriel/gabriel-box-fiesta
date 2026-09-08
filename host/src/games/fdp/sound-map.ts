import type { FdpGameEvent } from '@party/shared';
import type { SoundName } from '@party/ui';

/**
 * Which `@party/ui` sound (if any) each FDP event triggers on the host.
 * Mirrors `host/src/games/{uno,zap,lorota,sabetudo}/sound-map.ts`.
 */
export function soundForEvent(event: FdpGameEvent): SoundName | null {
  switch (event.type) {
    case 'round_started':
      return 'turn';
    case 'all_answers_in':
      return 'select';
    case 'voting_started':
      return 'cardPlay';
    case 'results_started':
      return 'special';
    case 'round_finished':
    case 'game_finished':
      return 'win';
    default:
      return null;
  }
}
