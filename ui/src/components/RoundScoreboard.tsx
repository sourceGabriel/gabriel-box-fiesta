import type { AvatarSpec } from '@party/shared';
import { Avatar } from './Avatar';

export interface ScoreRow {
  playerId: string;
  name: string;
  score: number;
  /** Points gained this round (shows as a "+N" chip). */
  roundPoints?: number;
  /** Current answer streak (shows as 🔥N). */
  streak?: number;
}

const MEDALS = ['🥇', '🥈', '🥉'];

/**
 * The between-rounds "scene": a big animated leaderboard for the host TV. Rows
 * are ranked by score, bars scale to the leader, the round delta pops in, and an
 * optional taunt sits under it. Drop it into a game's results/reveal phase.
 */
export function RoundScoreboard({
  title,
  standings,
  taunt,
  avatarFor,
}: {
  title?: string;
  standings: ScoreRow[];
  taunt?: string | null;
  avatarFor?: (playerId: string) => AvatarSpec | undefined;
}) {
  const ranked = [...standings].sort((a, b) => b.score - a.score);
  const top = ranked[0]?.score || 1;

  return (
    <div className="ui-scoreboard" role="table" aria-label={title ?? 'Placar'}>
      {title ? <p className="ui-scoreboard-title">{title}</p> : null}
      <ol className="ui-scoreboard-rows">
        {ranked.map((r, i) => (
          <li
            key={r.playerId}
            className={`ui-scoreboard-row ${i === 0 ? 'is-leader' : ''} ${i === ranked.length - 1 && ranked.length > 2 ? 'is-last' : ''}`}
            style={{ ['--i' as string]: i } as React.CSSProperties}
          >
            <span className="ui-scoreboard-rank">{MEDALS[i] ?? `${i + 1}º`}</span>
            {avatarFor?.(r.playerId) ? (
              <Avatar spec={avatarFor(r.playerId)!} size={40} className="ui-scoreboard-avatar" />
            ) : null}
            <span className="ui-scoreboard-name">{r.name}</span>
            {r.streak && r.streak >= 2 ? <span className="ui-scoreboard-streak">🔥{r.streak}</span> : null}
            <span className="ui-scoreboard-bar-wrap">
              <span className="ui-scoreboard-bar" style={{ width: `${Math.max(4, (r.score / top) * 100)}%` }} />
            </span>
            {r.roundPoints ? <span className="ui-scoreboard-delta">+{r.roundPoints}</span> : null}
            <span className="ui-scoreboard-score">{r.score}</span>
          </li>
        ))}
      </ol>
      {taunt ? <p className="round-taunt ui-scoreboard-taunt">{taunt}</p> : null}
    </div>
  );
}
