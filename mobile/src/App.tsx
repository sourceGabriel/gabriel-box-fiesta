import { useState } from 'react';
import { useRoomConnection } from './shell/useRoomConnection';
import { JoinScreen } from './shell/JoinScreen';
import { WaitingScreen } from './shell/WaitingScreen';
import { CONTROLLER_GAMES } from './games/registry';
import './shell/shell.css';

/**
 * Thin phone-controller shell: owns the room connection + session/reconnect, shows
 * the join and waiting screens, then hands off to the active game's controller view.
 * Nothing here knows about UNO — adding a game is one entry in `CONTROLLER_GAMES`.
 */
function App() {
  const conn = useRoomConnection();
  const [playerName, setPlayerName] = useState('');
  const [avatar, setAvatar] = useState('🙂');

  const myName =
    conn.roomPlayers.find((player) => player.id === conn.playerId)?.name
    ?? `${avatar} ${playerName.trim() || 'Você'}`;
  const gameName = conn.catalog.find((game) => game.id === conn.selectedGameId)?.name;
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
        avatar={avatar}
        myName={myName}
        players={conn.roomPlayers}
        playerId={conn.playerId}
        gameName={gameName}
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
