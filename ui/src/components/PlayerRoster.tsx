import type { AvatarSpec } from '@party/shared';
import { Avatar } from './Avatar';

export type RosterPlayer = { id: string; name: string; connected: boolean; avatar?: AvatarSpec };

/**
 * A simple lobby/waiting roster of {name, connected}. Two layouts:
 * `list` (rows with a connection dot, host lobby) and `pills` (mobile waiting).
 * When a player carries an `avatar`, a mini avatar is shown before the name.
 * In-game rosters with scores/hand-counts stay in the game module.
 */
export function PlayerRoster({
  players,
  title,
  meId,
  layout = 'list',
}: {
  players: RosterPlayer[];
  title?: string;
  meId?: string;
  layout?: 'list' | 'pills';
}) {
  const avatarSize = layout === 'list' ? 30 : 22;
  return (
    <div className={`ui-roster ui-roster--${layout}`}>
      {title ? <h2 className="ui-roster-title">{title}</h2> : null}
      {players.length === 0 ? (
        <p className="ui-roster-empty">Ninguém entrou ainda.</p>
      ) : (
        <ul>
          {players.map((player) => (
            <li key={player.id} className={player.id === meId ? 'is-me' : undefined}>
              {player.avatar ? (
                <Avatar spec={player.avatar} size={avatarSize} className="ui-roster-avatar" title={player.name} />
              ) : null}
              <span className="ui-roster-name">{player.name}</span>
              {layout === 'list' ? (
                <span className={`ui-conn-dot ${player.connected ? 'on' : 'off'}`} aria-hidden="true" />
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
