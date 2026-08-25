import { useEffect, useMemo, useState } from 'react';
import type { ServerMessage, UnoPublicState } from '@party/shared';
import './App.css';

type PlayerView = { id: string; name: string; connected: boolean; handCount: number };

const serverOrigin = import.meta.env.VITE_SERVER_ORIGIN ?? `${window.location.protocol}//${window.location.hostname}:3000`;
const wsOrigin = serverOrigin.replace('http', 'ws');

const makeMessage = <TType extends string, TPayload>(type: TType, payload: TPayload) => ({
  messageId: crypto.randomUUID(),
  protocolVersion: 1 as const,
  sentAt: Date.now(),
  type,
  payload,
});

function App() {
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [roomCode, setRoomCode] = useState('');
  const [ownerPlayerId, setOwnerPlayerId] = useState<string | null>(null);
  const [players, setPlayers] = useState<PlayerView[]>([]);
  const [joinUrl, setJoinUrl] = useState('');
  const [joinQrDataUrl, setJoinQrDataUrl] = useState<string | undefined>(undefined);
  const [publicState, setPublicState] = useState<UnoPublicState | null>(null);
  const [lastError, setLastError] = useState('');

  useEffect(() => {
    let mounted = true;
    fetch(`${serverOrigin}/room`)
      .then((response) => response.json())
      .then((json) => {
        if (mounted) {
          setRoomCode(json.code);
        }
      })
      .catch(() => setLastError('Falha ao obter sala.'));

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!roomCode) {
      return;
    }

    const ws = new WebSocket(`${wsOrigin}/ws`);
    ws.onopen = () => {
      ws.send(
        JSON.stringify(
          makeMessage('JOIN_ROOM', {
            roomCode,
            playerName: 'HOST',
            role: 'host',
          }),
        ),
      );
    };
    ws.onmessage = (event) => {
      const message = JSON.parse(event.data as string) as ServerMessage;
      switch (message.type) {
        case 'ROOM_STATE':
          setOwnerPlayerId(message.payload.ownerPlayerId);
          setPlayers(message.payload.players);
          setJoinUrl(message.payload.joinUrl);
          setJoinQrDataUrl(message.payload.joinQrDataUrl);
          break;
        case 'GAME_STATE_PUBLIC':
          setPublicState(message.payload.state);
          break;
        case 'ERROR':
          setLastError(message.payload.message);
          break;
        default:
          break;
      }
    };
    ws.onclose = () => setSocket(null);
    setSocket(ws);
    return () => ws.close();
  }, [roomCode]);

  const canStart = useMemo(() => players.filter((player) => player.connected).length >= 2, [players]);

  return (
    <main className="host-layout">
      <header className="room-card">
        <h1>UNO</h1>
        <p className="code">{roomCode || '----'}</p>
        <p>Escaneie para entrar</p>
        {joinQrDataUrl ? <img className="qr" src={joinQrDataUrl} alt="QR code da sala" /> : null}
        <p className="url">{joinUrl}</p>
        <button
          disabled={!socket || !canStart}
          onClick={() => socket?.send(JSON.stringify(makeMessage('START_GAME', {})))}
          type="button"
        >
          Iniciar partida
        </button>
        {lastError ? <p className="error">{lastError}</p> : null}
      </header>

      <section className="players-card">
        <h2>Jogadores</h2>
        <ul>
          {players.map((player) => (
            <li key={player.id}>
              <span>{player.name}</span>
              <span>{player.handCount} cartas</span>
              <span>{player.connected ? 'online' : 'offline'}</span>
              {ownerPlayerId === player.id ? <strong>OWNER</strong> : null}
            </li>
          ))}
        </ul>
      </section>

      <section className="table-card">
        <h2>Mesa</h2>
        <div className="table-meta">
          <p>Cor atual: {publicState?.currentColor ?? '-'}</p>
          <p>Descarte: {publicState?.topDiscard ? `${publicState.topDiscard.color} ${publicState.topDiscard.type}` : '-'}</p>
          <p>Vez: {players.find((player) => player.id === publicState?.currentPlayerId)?.name ?? '-'}</p>
          <p>Pilha compra: +{publicState?.pendingDraw ?? 0}</p>
          <p>Fase: {publicState?.phase ?? 'waiting_players'}</p>
        </div>
      </section>
    </main>
  );
}

export default App;
