import type { UnoGameEvent } from '@party/shared';
import type { SoundName } from '@party/ui';

/**
 * Which `@party/ui` sound (if any) each UNO event triggers on the host. Lives in
 * the UNO module — the shell has no idea what a "card_played" is.
 */
export function soundForEvent(event: UnoGameEvent): SoundName | null {
  switch (event.type) {
    case 'card_played':
      return 'cardPlay';
    case 'card_drawn':
      return 'draw';
    case 'turn_started':
      return 'turn';
    case 'color_changed':
    case 'direction_changed':
    case 'player_skipped':
      return 'special';
    case 'uno_called':
      return 'uno';
    case 'uno_penalty_applied':
      return 'error';
    case 'round_finished':
    case 'game_finished':
      return 'win';
    default:
      return null;
  }
}
