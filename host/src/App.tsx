import { useRoomConnection } from './shell/useRoomConnection';
import { LobbyScreen } from './shell/LobbyScreen';
import { HOST_GAMES } from './games/registry';
import './shell/shell.css';

/**
 * Thin host shell: owns the room connection, shows the lobby until a game is
 * running, then hands off to that game's registered view. Nothing here knows
 * about UNO — adding a game is one entry in `HOST_GAMES`.
 */
function App() {
  const conn = useRoomConnection();

  if (!conn.activeGameId || !conn.publicState) {
    return (
      <LobbyScreen
        roomCode={conn.roomCode}
        players={conn.players}
        joinUrl={conn.joinUrl}
        joinQrDataUrl={conn.joinQrDataUrl}
        connected={conn.connected}
        lastError={conn.lastError}
        catalog={conn.catalog}
        selectedGameId={conn.selectedGameId}
        onSelectGame={(gameId) => conn.send('SELECT_GAME', { gameId })}
        onStart={() => conn.send('START_GAME', {})}
      />
    );
  }

  const GameView = HOST_GAMES[conn.activeGameId];
  if (!GameView) {
    return (
      <main className="host-shell host-lobby">
        <div className="lobby-card">
          <p className="error">Jogo desconhecido: {conn.activeGameId}</p>
        </div>
      </main>
    );
  }

  return (
    <GameView
      publicState={conn.publicState}
      events={conn.events}
      players={conn.players}
      connected={conn.connected}
      send={conn.send}
    />
  );
}

export default App;
