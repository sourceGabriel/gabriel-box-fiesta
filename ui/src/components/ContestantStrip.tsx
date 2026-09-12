import type { AvatarSpec } from '@party/shared';
import { Avatar } from './Avatar';

export interface ContestantStripEntry {
  id: string;
  name: string;
  avatar?: AvatarSpec;
  /** Shown under the name when present (points, a countdown, whatever the game scores). */
  score?: number | string;
  /** A tiny badge past the score — a lock icon, "✅", a role tag. */
  tag?: string;
  /** Lifted + accent-ringed — the leader, the current speaker, whoever the scene is about. */
  highlighted?: boolean;
  /** Faded — eliminated, disconnected, sat out this round. */
  dimmed?: boolean;
}

/**
 * The bottom-of-stage row of faces every host-stage game wants: passed as
 * `<HostStage strip={...}>`. Score colour follows the theme's
 * `accentSecondary` (`--stage-accent-2`, falling back to the primary accent) —
 * set one in the game's `HostTheme` for a distinct tint (e.g. Zap!'s gold).
 */
export function ContestantStrip({ entries, size = 34 }: { entries: ContestantStripEntry[]; size?: number }) {
  return (
    <ul className="ui-cstrip">
      {entries.map((e) => (
        <li
          key={e.id}
          className={`ui-cstrip-item ${e.highlighted ? 'is-highlighted' : ''} ${e.dimmed ? 'is-dimmed' : ''}`}
        >
          {e.avatar ? <Avatar spec={e.avatar} size={size} /> : null}
          <span className="ui-cstrip-name">{e.name}</span>
          {e.score !== undefined ? <span className="ui-cstrip-score">{e.score}</span> : null}
          {e.tag ? <span className="ui-cstrip-tag">{e.tag}</span> : null}
        </li>
      ))}
    </ul>
  );
}
