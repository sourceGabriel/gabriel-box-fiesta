import { useEffect, useMemo, useRef, useState, type FC } from 'react';
import { PerformanceModeProvider } from '@party/ui';
import { useRoomConnection } from './shell/useRoomConnection';
import { AttractScreen } from './shell/AttractScreen';
import { CatalogScreen } from './shell/CatalogScreen';
import { LobbyScreen } from './shell/LobbyScreen';
import { HOST_GAMES } from './games/registry';
import type { GamePersonality } from './games/types';
import './shell/shell.css';

type Flow = 'attract' | 'catalog' | 'lobby';

/**
 * Thin host shell. Pre-match it walks a 3-screen flow (attract → catalog →
 * lobby); once a game is running it hands off to that game's registered view.
 * Nothing here knows about UNO — adding a game is one entry in `HOST_GAMES`.
 */
function App() {
  const conn = useRoomConnection();
  const [flow, setFlow] = useState<Flow>('attract');
  const prevActiveRef = useRef<string | null>(null);

  const covers = useMemo<Record<string, FC>>(
    () => Object.fromEntries(Object.entries(HOST_GAMES).map(([id, entry]) => [id, entry.Cover])),
    [],
  );
  const personalities = useMemo<Record<string, GamePersonality>>(
    () => Object.fromEntries(Object.entries(HOST_GAMES).map(([id, entry]) => [id, entry.personality])),
    [],
  );
  const lobbyBgs = useMemo<Record<string, string>>(
    () =>
      Object.fromEntries(
        Object.entries(HOST_GAMES)
          .filter(([, entry]) => entry.lobbyBg)
          .map(([id, entry]) => [id, entry.lobbyBg as string]),
      ),
    [],
  );

  // When a game ends, drop back to that game's lobby (not the attract screen).
  useEffect(() => {
    if (prevActiveRef.current && !conn.activeGameId) {
      setFlow('lobby');
    }
    prevActiveRef.current = conn.activeGameId;
  }, [conn.activeGameId]);

  // A game in progress (incl. a mid-game host reload) always wins over the flow machine.
  let content;
  if (conn.activeGameId && conn.publicState) {
    const entry = HOST_GAMES[conn.activeGameId];
    if (!entry) {
      content = (
        <main className="host-shell host-lobby">
          <div className="lobby-card"><p className="error">Jogo desconhecido: {conn.activeGameId}</p></div>
        </main>
      );
    } else {
      const GameView = entry.View;
      content = (
        <GameView
          publicState={conn.publicState}
          events={conn.events}
          players={conn.players}
          connected={conn.connected}
          reactions={conn.reactions}
          send={conn.send}
        />
      );
    }
  } else if (flow === 'attract') {
    content = <AttractScreen onStart={() => setFlow('catalog')} />;
  } else if (flow === 'catalog') {
    content = (
      <CatalogScreen
        catalog={conn.catalog}
        selectedGameId={conn.selectedGameId}
        covers={covers}
        personalities={personalities}
        onPick={(gameId) => {
          conn.send('SELECT_GAME', { gameId });
          setFlow('lobby');
        }}
        onBack={() => setFlow('attract')}
        lastError={conn.lastError}
      />
    );
  } else {
    content = (
      <LobbyScreen
        roomCode={conn.roomCode}
        players={conn.players}
        joinUrl={conn.joinUrl}
        joinQrDataUrl={conn.joinQrDataUrl}
        connected={conn.connected}
        lastError={conn.lastError}
        catalog={conn.catalog}
        selectedGameId={conn.selectedGameId}
        contentTier={conn.contentTier}
        matchLengths={conn.matchLengths}
        covers={covers}
        personalities={personalities}
        lobbyBgs={lobbyBgs}
        onStart={() => conn.send('START_GAME', {})}
        onChangeGame={() => setFlow('catalog')}
        onSetContentTier={(tier) => conn.send('SET_CONTENT_TIER', { tier })}
        onSetMatchLength={(gameId, length) => conn.send('SET_MATCH_LENGTH', { gameId, length })}
      />
    );
  }

  // Performance tier for the host "show" layer — owner-controlled live from
  // their phone (`<HostControlsBar>` → SET_PERFORMANCE_MODE → ROOM_STATE).
  return <PerformanceModeProvider mode={conn.performanceMode}>{content}</PerformanceModeProvider>;
}

export default App;
