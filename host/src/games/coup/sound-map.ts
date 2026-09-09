import type { CoupGameEvent } from '@party/shared';
import type { SoundSpec } from '@party/ui';

/**
 * Which sound each Coup event triggers on the host — a synth `@party/ui` name
 * or a bundled CC0 clip via `{ sample: id }`. The shell has no idea what a
 * "challenge_made" is.
 */
export function soundForEvent(event: CoupGameEvent): SoundSpec | null {
  switch (event.type) {
    case 'turn_started':
      return 'turn';
    case 'action_declared':
      return { sample: 'card-play' };
    case 'coins_changed':
    case 'coins_transferred':
      return { sample: 'chip-lay' };
    case 'challenge_made':
      return { cue: 'meme.betrayal', fallback: { sample: 'chip-clash' } };
    case 'block_declared':
      return { sample: 'ui-toggle' };
    case 'challenge_resolved':
    case 'block_succeeded':
      return { sample: 'ui-open' };
    case 'influence_revealed':
      return { cue: 'meme.reveal', fallback: { sample: 'stinger-reveal' } };
    case 'card_replaced':
    case 'exchange_started':
      return { sample: 'card-fan' };
    case 'action_cancelled':
      return { sample: 'ui-back' };
    case 'player_eliminated':
      return { cue: 'meme.elimination', fallback: { sample: 'stinger-lose' } };
    case 'game_finished':
      return { cue: 'meme.win', fallback: { sample: 'stinger-fanfare' } };
    default:
      return null;
  }
}
