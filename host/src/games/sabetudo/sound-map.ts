import type { SabeTudoGameEvent } from '@party/shared';
import type { SoundName } from '@party/ui';

/**
 * Which `@party/ui` sound (if any) each Sabe-Tudo event triggers on the host.
 * Mirrors `host/src/games/{uno,zap,lorota}/sound-map.ts`.
 */
export function soundForEvent(event: SabeTudoGameEvent): SoundName | null {
  switch (event.type) {
    case 'question_started':
      return 'turn';
    case 'all_answers_in':
      return 'select';
    case 'reveal_started':
      return 'special';
    case 'round_finished':
    case 'game_finished':
      return 'win';
    default:
      return null;
  }
}
