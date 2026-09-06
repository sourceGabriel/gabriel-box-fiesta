export type RosterPlayer = { id: string; name: string; connected: boolean };

/**
 * A simple lobby/waiting roster of {name, connected}. Two layouts:
 * `list` (rows with a connection dot, host lobby) and `pills` (mobile waiting).
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
  return (
    <div className={`ui-roster ui-roster--${layout}`}>
      {title ? <h2 className="ui-roster-title">{title}</h2> : null}
      {players.length === 0 ? (
        <p className="ui-roster-empty">Ninguém entrou ainda.</p>
      ) : (
        <ul>
          {players.map((player) => (
            <li key={player.id} className={player.id === meId ? 'is-me' : undefined}>
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
