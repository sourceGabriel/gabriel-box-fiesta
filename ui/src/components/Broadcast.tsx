import type { AvatarSpec } from '@party/shared';
import { Avatar } from './Avatar';

/**
 * Broadcast graphics — the "narrator" as TV lower-thirds, not a text log.
 * Fed by `useStageDirector` from each game's `broadcastFor(event)`.
 */

export type BroadcastTier = 'critical' | 'important' | 'ambient';
export type BroadcastGraphic = 'lower-third' | 'headline' | 'ticker';

export interface BroadcastItem {
  tier: BroadcastTier;
  graphic: BroadcastGraphic;
  /** Small kicker, e.g. "AGORA" / "DESAFIO". */
  eyebrow?: string;
  title: string;
  /** Optional player the line is about — shows their face on a lower-third. */
  playerId?: string;
  /** Override the tier's default on-screen time. */
  durationMs?: number;
}

export interface ResolvedBroadcast extends BroadcastItem {
  /** stable id for the React key + de-dup (seq-derived). */
  id: string;
  avatar?: AvatarSpec;
  name?: string;
}

export function Broadcast({ item }: { item: ResolvedBroadcast }) {
  if (item.graphic === 'headline') {
    return (
      <div className={`ui-bcast ui-bcast-headline tier-${item.tier}`} role="status" aria-live="polite">
        {item.eyebrow ? <span className="ui-bcast-eyebrow">{item.eyebrow}</span> : null}
        <span className="ui-bcast-title">{item.title}</span>
      </div>
    );
  }
  return (
    <div className={`ui-bcast ui-bcast-${item.graphic} tier-${item.tier}`} role="status" aria-live="polite">
      {item.avatar ? <Avatar spec={item.avatar} size={40} className="ui-bcast-face" /> : null}
      <div className="ui-bcast-lines">
        {item.eyebrow ? <span className="ui-bcast-eyebrow">{item.eyebrow}</span> : null}
        <span className="ui-bcast-title">{item.title}</span>
      </div>
    </div>
  );
}
