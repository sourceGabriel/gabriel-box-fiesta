import { useEffect, useMemo, useRef, useState } from 'react';
import type { ServerMessage, UnoPublicState } from '@party/shared';
import './App.css';

type PlayerView = { id: string; name: string; connected: boolean; handCount: number };

const serverOrigin = import.meta.env.VITE_SERVER_ORIGIN ?? `${window.location.protocol}//${window.location.hostname}:3001`;
const wsOrigin = serverOrigin.replace('http', 'ws');
const SAFE_QR_PREFIX = 'data:image/png;base64,';

const makeMessage = <TType extends string, TPayload>(type: TType, payload: TPayload) => ({
  messageId: crypto.randomUUID(),
  protocolVersion: 1 as const,
  sentAt: Date.now(),
  type,
  payload,
});

function App() {
  const socketRef = useRef<WebSocket | null>(null);
  const [roomCode, setRoomCode] = useState('');
  const [ownerPlayerId, setOwnerPlayerId] = useState<string | null>(null);
  const [players, setPlayers] = useState<PlayerView[]>([]);
  const [joinUrl, setJoinUrl] = useState('');
  const [joinQrDataUrl, setJoinQrDataUrl] = useState<string | undefined>(undefined);
  const [publicState, setPublicState] = useState<UnoPublicState | null>(null);
  const [lastError, setLastError] = useState('');
  const [connected, setConnected] = useState(false);
  const [lastEvent, setLastEvent] = useState('Sala pronta');
  const playersRef = useRef<PlayerView[]>([]);

  useEffect(() => {
    playersRef.current = players;
  }, [players]);

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
      setConnected(true);
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
        case 'GAME_EVENT': {
          const event = message.payload.event;
          const actorName = 'playerId' in event && event.playerId
            ? playersRef.current.find((player) => player.id === event.playerId)?.name ?? 'Jogador'
            : 'Sistema';
          switch (event.type) {
            case 'game_started':
              setLastEvent('Partida iniciada');
              break;
            case 'turn_started':
              setLastEvent(`Vez de ${actorName}`);
              break;
            case 'card_played':
              setLastEvent(`${actorName} jogou ${event.card.color} ${event.card.type}`);
              break;
            case 'card_drawn':
              setLastEvent(`${actorName} comprou ${event.count} carta(s)`);
              break;
            case 'color_changed':
              setLastEvent(`Cor alterada para ${event.color}`);
              break;
            case 'direction_changed':
              setLastEvent(`Direção ${event.direction === 1 ? 'horária' : 'anti-horária'}`);
              break;
            case 'uno_called':
              setLastEvent(`${actorName} declarou UNO!`);
              break;
            case 'uno_penalty_applied':
              setLastEvent(`${actorName} recebeu penalidade de ${event.count}`);
              break;
            case 'round_finished':
              setLastEvent(
                `Rodada encerrada: vencedor ${playersRef.current.find((player) => player.id === event.winnerPlayerId)?.name ?? 'desconhecido'}`,
              );
              break;
            default:
              setLastEvent(event.type);
              break;
          }
          break;
        }
        case 'ERROR':
          setLastError(message.payload.message);
          break;
        default:
          break;
      }
    };
    ws.onclose = () => {
      setConnected(false);
      if (socketRef.current === ws) {
        socketRef.current = null;
      }
    };
    socketRef.current = ws;
    return () => {
      if (socketRef.current === ws) {
        socketRef.current = null;
      }
      ws.close();
    };
  }, [roomCode]);

  const canStart = useMemo(() => players.filter((player) => player.connected).length >= 2, [players]);
  const safeJoinQrDataUrl = useMemo(() => {
    if (!joinQrDataUrl?.startsWith(SAFE_QR_PREFIX)) {
      return undefined;
    }
    return joinQrDataUrl;
  }, [joinQrDataUrl]);

  const currentPlayerName = useMemo(
    () => players.find((player) => player.id === publicState?.currentPlayerId)?.name ?? '-',
    [players, publicState],
  );

  const formatCardLabel = (card: NonNullable<UnoPublicState['topDiscard']>) => {
    const colorLabel = card.color === 'wild' ? 'wild' : card.color;
    const valueLabel = card.type === 'number' && card.value !== null ? card.value : card.type;
    return `${colorLabel} ${valueLabel}`;
  };

  if (!publicState) {
    return (
      <main className="host-layout">
        <header className="room-card">
          <h1>UNO</h1>
          <p className="code">{roomCode || '----'}</p>
          <p>Escaneie para entrar</p>
          {safeJoinQrDataUrl ? <img className="qr" src={safeJoinQrDataUrl} alt="QR code da sala" /> : null}
          <p className="url">{joinUrl}</p>
          <button
            disabled={!connected || !canStart}
            onClick={() => socketRef.current?.send(JSON.stringify(makeMessage('START_GAME', {})))}
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
            <p>Cor atual: -</p>
            <p>Descarte: -</p>
            <p>Vez: {currentPlayerName}</p>
            <p>Pilha compra: +0</p>
            <p>Fase: waiting_players</p>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="host-layout">
      <section className="game-board-card">
        <div className="board-header">
          <h1>UNO</h1>
          <span className="room-badge">Sala {roomCode}</span>
        </div>

        <div className="board-table">
          <div className="pile-card draw-pile">
            <span>Monte</span>
            <strong>{publicState.drawPileCount}</strong>
          </div>

          <div className={`pile-card discard-pile color-${publicState.currentColor ?? 'neutral'}`}>
            <span>Descarte</span>
            {publicState.topDiscard ? (
              <strong>{formatCardLabel(publicState.topDiscard)}</strong>
            ) : (
              <strong>-</strong>
            )}
          </div>
        </div>

        <div className="board-status">
          <div>
            <span>Vez</span>
            <strong>{currentPlayerName}</strong>
          </div>
          <div>
            <span>Cor atual</span>
            <strong>{publicState.currentColor ?? '-'}</strong>
          </div>
          <div>
            <span>Rodada</span>
            <strong>{publicState.round}</strong>
          </div>
          <div>
            <span>Turno</span>
            <strong>{publicState.turn}</strong>
          </div>
          <div>
            <span>Pilha compra</span>
            <strong>+{publicState.pendingDraw}</strong>
          </div>
          <div>
            <span>Fase</span>
            <strong>{publicState.phase}</strong>
          </div>
        </div>

        <div className="event-feed">
          <span>Evento</span>
          <strong>{lastEvent}</strong>
        </div>
      </section>

      <section className="players-card board-players">
        <h2>Jogadores</h2>
        <ul>
          {players.map((player) => (
            <li key={player.id} className={publicState.currentPlayerId === player.id ? 'current-turn' : ''}>
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
          <p>Cor atual: {publicState.currentColor ?? '-'}</p>
          <p>Descarte: {publicState.topDiscard ? formatCardLabel(publicState.topDiscard) : '-'}</p>
          <p>Vez: {currentPlayerName}</p>
          <p>Pilha compra: +{publicState.pendingDraw}</p>
          <p>Fase: {publicState.phase}</p>
        </div>
      </section>
    </main>
  );
}

export default App;
