import type { UnoGameEvent } from '@party/shared';
import type { SoundSpec } from '@party/ui';

/**
 * Which sound (if any) each UNO event triggers on the host — a synth
 * `@party/ui` name, or a bundled CC0 clip via `{ sample: id }`. Lives in the
 * UNO module — the shell has no idea what a "card_played" is.
 */
export function soundForEvent(event: UnoGameEvent): SoundSpec | null {
  switch (event.type) {
    case 'card_played':
      return { sample: 'card-play' };
    case 'card_drawn':
      return { sample: 'card-deal' };
    case 'turn_started':
      return 'turn';
    case 'color_changed':
    case 'direction_changed':
    case 'player_skipped':
      return 'special';
    case 'uno_called':
      return 'uno';
    case 'uno_penalty_applied':
      return { sample: 'ui-error' };
    case 'round_finished':
      return { sample: 'stinger-round' };
    case 'game_finished':
      return { cue: 'meme.win', fallback: { sample: 'stinger-fanfare' } };
    default:
      return null;
  }
}
