import type { ZapGameEvent } from '@party/shared';
import type { SoundName } from '@party/ui';

/**
 * Which `@party/ui` sound (if any) each Zap! event triggers on the host. Lives in
 * the Zap! module — the shell has no idea what a "duel_revealed" is. Mirrors
 * `host/src/games/uno/sound-map.ts`.
 */
export function soundForEvent(event: ZapGameEvent): SoundName | null {
  switch (event.type) {
    case 'round_started':
      return 'turn';
    case 'all_answers_in':
      return 'select';
    case 'duel_started':
      return 'cardPlay';
    case 'duel_revealed':
      return event.zap ? 'uno' : 'special';
    case 'round_finished':
    case 'game_finished':
      return 'win';
    default:
      return null;
  }
}
