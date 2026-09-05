import { useEffect, useMemo, useRef, useState } from 'react';
import type { ServerMessage, UnoPublicState } from '@party/shared';
import { getCardArt, getCardBackArt } from './cardArt';
import './App.css';

type PlayerView = { id: string; name: string; connected: boolean; handCount: number };

const serverOrigin = import.meta.env.VITE_SERVER_ORIGIN ?? `${window.location.protocol}//${window.location.hostname}:3001`;
const wsOrigin = serverOrigin.replace('http', 'ws');
const SAFE_QR_PREFIX = 'data:image/png;base64,';

const createMessageId = (): string => {
  const cryptoInstance = globalThis.crypto;
  if (cryptoInstance && typeof cryptoInstance.randomUUID === 'function') {
    return cryptoInstance.randomUUID();
  }
  return `msg-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
};

const makeMessage = <TType extends string, TPayload>(type: TType, payload: TPayload) => ({
  messageId: createMessageId(),
  protocolVersion: 1 as const,
  sentAt: Date.now(),
  type,
  payload,
});

function App() {
  const socketRef = useRef<WebSocket | null>(null);
  const [roomCode, setRoomCode] = useState('');
  const [players, setPlayers] = useState<PlayerView[]>([]);
  const [joinQrDataUrl, setJoinQrDataUrl] = useState<string | undefined>(undefined);
  const [publicState, setPublicState] = useState<UnoPublicState | null>(null);
  const [lastError, setLastError] = useState('');
  const [connected, setConnected] = useState(false);
  const [hasStarted] = useState(false);
  const [revealDrawPile, setRevealDrawPile] = useState(false);
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
      console.info('[host] WebSocket conectado', { url: `${wsOrigin}/ws`, roomCode });
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
    ws.onerror = (event) => {
      console.error('[host] WebSocket error', event);
      setLastError('Falha na conexão WebSocket do host. Verifique o servidor e a origem configurada.');
    };
    ws.onclose = (event) => {
      console.warn('[host] WebSocket fechado', { code: event.code, reason: event.reason, wasClean: event.wasClean });
      setConnected(false);
      if (socketRef.current === ws) {
        socketRef.current = null;
      }
    };
    ws.onmessage = (event) => {
      const message = JSON.parse(event.data as string) as ServerMessage;
      switch (message.type) {
        case 'ROOM_STATE':
          setPlayers(message.payload.players);
          setJoinQrDataUrl(message.payload.joinQrDataUrl);
          break;
        case 'GAME_STATE_PUBLIC':
          setPublicState(message.payload.state);
          break;
        case 'GAME_ENDED':
          setPublicState(null);
          break;
        case 'ERROR':
          setLastError(message.payload.message);
          break;
        default:
          break;
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

  const timerLabel = useMemo(() => {
    if (!publicState?.timer) {
      return '—';
    }
    return `${Math.max(0, Math.ceil(publicState.timer.remainingMs / 1000))}s`;
  }, [publicState]);

  const handleEndGame = () => {
    socketRef.current?.send(JSON.stringify(makeMessage('END_GAME', {})));
  };

  const handleNextRound = () => {
    socketRef.current?.send(JSON.stringify(makeMessage('NEXT_ROUND', {})));
  };

  const handleNewGame = () => {
    socketRef.current?.send(JSON.stringify(makeMessage('START_GAME', {})));
  };

  const scoreboard = useMemo(
    () => [...(publicState?.players ?? [])].sort((a, b) => b.score - a.score),
    [publicState],
  );
  const roundWinnerName = publicState?.players.find((player) => player.id === publicState.winnerPlayerId)?.name ?? '—';
  const gameWinnerName = publicState?.players.find((player) => player.id === publicState.gameWinnerPlayerId)?.name ?? '—';
  const roundOver = publicState?.phase === 'round_finished';
  const gameOver = publicState?.phase === 'game_finished';

  const handleKickPlayer = (playerId: string) => {
    const confirmed = window.confirm('Expulsar este jogador da sala?');
    if (!confirmed) {
      return;
    }
    socketRef.current?.send(JSON.stringify(makeMessage('KICK_PLAYER', { targetPlayerId: playerId })));
  };

  if (!publicState) {
    return (
      <main className="host-layout host-lobby">
        <section className="lobby-stage">
          <div className="lobby-shell">
            <div className="lobby-header">
              <p className="eyebrow">Sala ativa</p>
              <h1>UNO</h1>
              <p className="hero-code">{roomCode || '----'}</p>
              <p className="hero-text">Mostre este código na TV e peça para entrar pelo celular.</p>
            </div>

            <div className="lobby-qr-wrap">
              {safeJoinQrDataUrl ? <img className="qr hero-qr" src={safeJoinQrDataUrl} alt="QR code da sala" /> : null}
            </div>

            <div className="hero-actions">
              <button
                className="start-button"
                disabled={!connected || !canStart}
                onClick={() => socketRef.current?.send(JSON.stringify(makeMessage('START_GAME', {})))}
                type="button"
              >
                Iniciar partida
              </button>
              <span className="status-chip">{connected ? `${players.filter((player) => player.connected).length} online` : 'offline'}</span>
            </div>

            <div className="lobby-footer">
              <section className="players-card compact-card">
                <h2>Jogadores</h2>
                <ul>
                  {players.map((player) => (
                    <li key={player.id}>
                      <span>{player.name}</span>
                      <span>{player.handCount}</span>
                    </li>
                  ))}
                </ul>
              </section>

              <section className="table-card compact-card">
                <h2>Pré-jogo</h2>
                <div className="table-meta">
                  <p>Vez: {currentPlayerName}</p>
                  <p>Pronto: {canStart ? 'sim' : 'aguardando'}</p>
                  <p>Status: {hasStarted ? 'partida iniciada' : 'aguardando início'}</p>
                </div>
              </section>
            </div>

            {lastError ? <p className="error">{lastError}</p> : null}
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="host-layout host-game">
      {(roundOver || gameOver) ? (
        <div className="result-overlay" role="dialog" aria-live="polite">
          <div className="result-card">
            <p className="eyebrow">{gameOver ? 'Fim da partida' : `Rodada ${publicState.round}`}</p>
            <h2>{gameOver ? `🏆 ${gameWinnerName} venceu!` : `${roundWinnerName} zerou a mão`}</h2>
            <ol className="result-scoreboard">
              {scoreboard.map((player, index) => (
                <li key={player.id} className={index === 0 ? 'leader' : ''}>
                  <span>{index + 1}. {player.name}</span>
                  <strong>{player.score}</strong>
                </li>
              ))}
            </ol>
            <p className="result-target">Meta: {publicState.targetScore} pts</p>
            <div className="result-actions">
              {gameOver ? (
                <>
                  <button type="button" className="start-button" onClick={handleNewGame}>Nova partida</button>
                  <button type="button" className="danger-button" onClick={handleEndGame}>Encerrar</button>
                </>
              ) : (
                <button type="button" className="start-button" onClick={handleNextRound}>Próxima rodada</button>
              )}
            </div>
          </div>
        </div>
      ) : null}

      <button
        type="button"
        className="draw-pile-toggle"
        onClick={() => setRevealDrawPile((current) => !current)}
      >
        {revealDrawPile ? 'Censurar monte' : 'Revelar monte'}
      </button>

      <section className="game-board-card">
        <div className="board-header">
          <h1>UNO</h1>
          <span className="room-badge">Sala {roomCode}</span>
        </div>

        <div className="board-table">
          <div className="pile-card draw-pile">
            <span>Monte</span>
            <img
              className="card-art large-card"
              src={revealDrawPile && publicState.topDrawPileCard ? getCardArt(publicState.topDrawPileCard) : getCardBackArt()}
              alt={publicState.topDrawPileCard ? formatCardLabel(publicState.topDrawPileCard) : 'Monte de cartas'}
            />
            <strong>{publicState.drawPileCount}</strong>
          </div>

          <div className={`pile-card discard-pile color-${publicState.currentColor ?? 'neutral'}`}>
            <span>Descarte</span>
            <img
              className="card-art large-card"
              src={publicState.topDiscard ? getCardArt(publicState.topDiscard) : getCardBackArt()}
              alt={publicState.topDiscard ? formatCardLabel(publicState.topDiscard) : 'Sem descarte'}
            />
          </div>
        </div>

      </section>

      <section className="players-card board-players">
        <div className="players-board-header">
          <div className="host-timer-pill">
            <span>Timer</span>
            <strong>{timerLabel}</strong>
          </div>
          <button type="button" className="danger-button" onClick={handleEndGame}>
            Encerrar partida
          </button>
        </div>
        <h2>Jogadores</h2>
        <ul>
          {players.map((player) => (
           <li key={player.id} className={publicState.currentPlayerId === player.id ? 'current-turn' : ''}>
             <div className="player-main">
               <span>{player.name}</span>
               <span>{player.handCount} cartas</span>
               <span>{player.connected ? 'online' : 'offline'}</span>
             </div>
             <div className="player-actions">
               <div className="player-hand-preview" aria-label={`${player.name}: ${player.handCount} cartas`}>
                 {Array.from({ length: Math.min(player.handCount, 3) }, (_, index) => (
                   <img key={`${player.id}-${index}`} className="mini-card" src={getCardBackArt()} alt="Carta virada para baixo" />
                 ))}
               </div>
               <button type="button" className="kick-button" onClick={() => handleKickPlayer(player.id)}>
                 Expulsar
               </button>
             </div>
           </li>
          ))}
        </ul>
      </section>
    </main>
  );
}

export default App;
