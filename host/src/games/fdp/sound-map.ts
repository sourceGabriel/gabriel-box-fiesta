import type { FdpGameEvent } from '@party/shared';
import type { SoundSpec } from '@party/ui';

/**
 * Which sound each FDP event triggers on the host — a synth `@party/ui` name
 * or a bundled CC0 clip via `{ sample: id }`.
 */
export function soundForEvent(event: FdpGameEvent): SoundSpec | null {
  switch (event.type) {
    case 'round_started':
      return { cue: 'meme.roundStart', fallback: 'turn' };
    case 'all_answers_in':
      return { sample: 'ui-confirm' };
    case 'voting_started':
      return { sample: 'card-fan' };
    case 'results_started':
      return { cue: 'meme.reveal', fallback: { sample: 'stinger-reveal' } };
    case 'round_finished':
      return { sample: 'stinger-round' };
    case 'game_finished':
      return { cue: 'meme.gameover', fallback: { sample: 'stinger-fanfare' } };
    default:
      return null;
  }
}
