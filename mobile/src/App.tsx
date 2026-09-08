import { useEffect, useState } from 'react';
import type { AvatarSpec } from '@party/shared';
import { DEFAULT_AVATAR, sanitizeAvatar } from '@party/ui';
import { useRoomConnection } from './shell/useRoomConnection';
import { JoinScreen } from './shell/JoinScreen';
import { WaitingScreen } from './shell/WaitingScreen';
import { CONTROLLER_GAMES } from './games/registry';
import './shell/shell.css';

const AVATAR_STORAGE_KEY = 'party:avatar';

const loadAvatar = (): AvatarSpec => {
  try {
    const raw = localStorage.getItem(AVATAR_STORAGE_KEY);
    return raw ? sanitizeAvatar(JSON.parse(raw)) : DEFAULT_AVATAR;
  } catch {
    return DEFAULT_AVATAR;
  }
};

/**
 * Thin phone-controller shell: owns the room connection + session/reconnect, shows
 * the join and waiting screens, then hands off to the active game's controller view.
 * Nothing here knows about UNO — adding a game is one entry in `CONTROLLER_GAMES`.
 */
function App() {
  const conn = useRoomConnection();
  const [playerName, setPlayerName] = useState('');
  const [avatar, setAvatar] = useState<AvatarSpec>(loadAvatar);

  useEffect(() => {
    try {
      localStorage.setItem(AVATAR_STORAGE_KEY, JSON.stringify(avatar));
    } catch {
      // ignore storage errors (private mode, quota, disabled)
    }
  }, [avatar]);

  const me = conn.roomPlayers.find((player) => player.id === conn.playerId);
  const myName = me?.name ?? (playerName.trim() || 'Você');
  const myAvatar = me?.avatar ?? avatar;

  // Re-edit the avatar from the waiting screen (server accepts it only pre-game).
  const changeAvatar = (next: AvatarSpec) => {
    setAvatar(next);
    conn.send('UPDATE_AVATAR', { avatar: next });
  };
  const selectedGame = conn.catalog.find((game) => game.id === conn.selectedGameId);
  const TIERED_GAMES = new Set(['zap', 'lorota', 'sabetudo', 'fdp']);
  const GameView = conn.activeGameId ? CONTROLLER_GAMES[conn.activeGameId] : undefined;

  let screen;
  if (!conn.playerId) {
    screen = (
      <JoinScreen
        roomCode={conn.roomCode}
        onRoomCodeChange={conn.setRoomCode}
        playerName={playerName}
        onPlayerNameChange={setPlayerName}
        avatar={avatar}
        onAvatarChange={setAvatar}
        connected={conn.connected}
        onJoin={() => conn.joinOrReconnect({ playerName, avatar })}
      />
    );
  } else if (!conn.privateState || !conn.publicState || !GameView) {
    screen = (
      <WaitingScreen
        roomCode={conn.roomCode}
        connected={conn.connected}
        avatar={myAvatar}
        myName={myName}
        players={conn.roomPlayers}
        playerId={conn.playerId}
        gameName={selectedGame?.name}
        gameTagline={selectedGame?.tagline}
        contentTier={conn.contentTier}
        showContentTier={TIERED_GAMES.has(conn.selectedGameId)}
        onAvatarChange={changeAvatar}
      />
    );
  } else {
    screen = (
      <GameView
        publicState={conn.publicState}
        privateState={conn.privateState}
        playerId={conn.playerId}
        connected={conn.connected}
        roomCode={conn.roomCode}
        roomPlayers={conn.roomPlayers}
        reactions={conn.reactions}
        send={conn.send}
      />
    );
  }

  return (
    <main className="mobile-layout">
      {screen}
      {conn.error ? <p className="error">{conn.error}</p> : null}
    </main>
  );
}

export default App;
