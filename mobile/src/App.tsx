import { useEffect, useMemo, useRef, useState } from 'react';
import type { ServerMessage, UnoCard, UnoPrivatePlayerState, UnoPublicState } from '@party/shared';
import { getCardArt } from './cardArt';
import './App.css';

const serverOrigin = import.meta.env.VITE_SERVER_ORIGIN ?? `${window.location.protocol}//${window.location.hostname}:3001`;
const wsOrigin = serverOrigin.replace('http', 'ws');

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

const getRoomCodeFromPath = (): string => {
  const segments = window.location.pathname.split('/').filter(Boolean);
  if (segments[0] === 'join' && segments[1]) {
    return segments[1].toUpperCase();
  }
  return '';
};

const avatarOptions = ['🙂', '😎', '🎉', '🔥', '🕺', '🤠', '😺', '🐼'];

function App() {
  const [roomCode, setRoomCode] = useState(getRoomCodeFromPath());
  const [playerName, setPlayerName] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState('🙂');
  const socketRef = useRef<WebSocket | null>(null);
  const pendingSessionStorageKeyRef = useRef<string | null>(null);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [publicState, setPublicState] = useState<UnoPublicState | null>(null);
  const [privateState, setPrivateState] = useState<UnoPrivatePlayerState | null>(null);
  const [roomPlayers, setRoomPlayers] = useState<Array<{ id: string; name: string; connected: boolean; handCount: number }>>([]);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [chosenColor, setChosenColor] = useState<'red' | 'yellow' | 'green' | 'blue'>('red');
  const [error, setError] = useState('');
  const [connected, setConnected] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const ws = new WebSocket(`${wsOrigin}/ws`);
    ws.onopen = () => {
      setConnected(true);
      console.info('[mobile] WebSocket conectado', { url: `${wsOrigin}/ws`, roomCode });
    };
    ws.onerror = (event) => {
      console.error('[mobile] WebSocket error', event);
      setError('Falha de rede no WebSocket do celular. Verifique o IP do servidor e o código da sala.');
    };
    ws.onclose = (event) => {
      console.warn('[mobile] WebSocket fechado', { code: event.code, reason: event.reason, wasClean: event.wasClean });
      setConnected(false);
      if (socketRef.current === ws) {
        socketRef.current = null;
      }
    };
    ws.onmessage = (event) => {
      const message = JSON.parse(event.data as string) as ServerMessage;
      console.info('[mobile] Mensagem recebida', message);
      switch (message.type) {
        case 'ROOM_JOINED':
          if (message.payload.playerId) {
            setPlayerId(message.payload.playerId);
          }
          if (message.payload.sessionToken && pendingSessionStorageKeyRef.current) {
            localStorage.setItem(pendingSessionStorageKeyRef.current, message.payload.sessionToken);
            pendingSessionStorageKeyRef.current = null;
          }
          break;
        case 'ROOM_STATE':
          setRoomPlayers(message.payload.players);
          break;
        case 'GAME_STATE_PUBLIC':
          setPublicState(message.payload.state);
          break;
        case 'PLAYER_STATE_PRIVATE':
          setPrivateState(message.payload.state);
          break;
        case 'ERROR':
          setError(message.payload.message);
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
  }, []);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const myTurn = publicState?.currentPlayerId === playerId;
  const selectedCard = useMemo(
    () => privateState?.hand.find((card) => card.id === selectedCardId) ?? null,
    [privateState, selectedCardId],
  );
  const timerLabel = useMemo(() => {
    if (!publicState?.timer) {
      return '--';
    }
    return `${Math.max(0, Math.ceil((publicState.timer.expiresAt - now) / 1000))}s`;
  }, [now, publicState]);

  const hasJoined = Boolean(playerId && privateState);

  const joinOrReconnect = (): void => {
    if (!socketRef.current || !roomCode || !playerName.trim()) {
      return;
    }

    const basePlayerName = playerName.trim();
    const serverPlayerName = `${selectedAvatar} ${basePlayerName}`;
    const storageKey = `session:${roomCode.toUpperCase()}:${basePlayerName.toLowerCase()}`;
    const sessionToken = localStorage.getItem(storageKey);
    if (sessionToken) {
      socketRef.current.send(
        JSON.stringify(
          makeMessage('RECONNECT_SESSION', {
            roomCode: roomCode.toUpperCase(),
            sessionToken,
            role: 'player',
          }),
        ),
      );
      return;
    }

    pendingSessionStorageKeyRef.current = storageKey;
    socketRef.current.send(
      JSON.stringify(
        makeMessage('JOIN_ROOM', {
          roomCode: roomCode.toUpperCase(),
          playerName: serverPlayerName,
          role: 'player',
        }),
      ),
    );
  };

  const playCard = (): void => {
    if (!socketRef.current || !selectedCard) {
      return;
    }
    socketRef.current.send(
      JSON.stringify(
        makeMessage('PLAY_CARD', {
          cardId: selectedCard.id,
          chosenColor: selectedCard.type === 'wild' || selectedCard.type === 'wild_draw_four' ? chosenColor : undefined,
        }),
      ),
    );
    setSelectedCardId(null);
  };

  const drawCard = (): void => {
    if (!socketRef.current) {
      return;
    }
    socketRef.current.send(JSON.stringify(makeMessage('DRAW_CARD', {})));
  };

  const callUno = (): void => {
    if (!socketRef.current) {
      return;
    }
    socketRef.current.send(JSON.stringify(makeMessage('UNO_CALL', {})));
  };

  return (
    <main className="mobile-layout">
      <header className="mobile-header">
        <div className="header-room">
          <span className="eyebrow">Sala</span>
          <strong className="room-code-inline">{roomCode || 'Código da sala'}</strong>
        </div>

        <section className="status-panel">
          <div className="status-row timer-row">
            <span className="label">Timer</span>
            <strong className="timer-top-right">{timerLabel}</strong>
          </div>
        </section>
      </header>

      {!hasJoined ? (
        <section className="join-panel">
          <input value={roomCode} onChange={(event) => setRoomCode(event.target.value.toUpperCase())} placeholder="Código da sala" />
          <input value={playerName} onChange={(event) => setPlayerName(event.target.value)} placeholder="Seu nome" />
          <div className="avatar-picker" aria-label="Escolha um avatar">
            {avatarOptions.map((avatar) => (
              <button
                key={avatar}
                type="button"
                className={`avatar-option ${selectedAvatar === avatar ? 'selected' : ''}`}
                onClick={() => setSelectedAvatar(avatar)}
              >
                {avatar}
              </button>
            ))}
          </div>
          <button disabled={!connected} onClick={joinOrReconnect} type="button">
            {playerId ? 'Entrar novamente' : 'Entrar'}
          </button>
        </section>
      ) : null}

      <section className="players-panel">
        <h2>Jogadores</h2>
        <div className="player-list">

          {(roomPlayers.length ? roomPlayers : [{ id: playerId ?? 'local', name: `${selectedAvatar} ${playerName || 'Você'}`, connected: true, handCount: privateState?.hand.length ?? 0 }]).map((player) => (
            <div key={player.id} className="player-pill">
              <span>{player.name}</span>
              <small>{player.handCount} cartas</small>
            </div>
          ))}
        </div>
      </section>

      <section className="hand-panel">
        <h2>Suas cartas</h2>
        <p className="hint">
          Toque em uma carta para selecionar. Cartas destacadas em verde podem ser jogadas agora.
        </p>
        <div className="cards">
          {(privateState?.hand ?? []).map((card: UnoCard) => {
            const selected = selectedCardId === card.id;
            const playable = !!privateState?.selectableCardIds.includes(card.id);
            return (
              <button
                key={card.id}
                className={`card ${selected ? 'selected' : ''} ${playable ? 'playable' : ''}`}
                disabled={!myTurn || !playable}
                onClick={() => setSelectedCardId(selected ? null : card.id)}
                type="button"
                aria-label={card.type === 'number' ? `${card.color} ${card.value}` : `${card.color} ${card.type}`}
              >
                <img className="uno-card-image" src={getCardArt(card)} alt={card.type === 'number' ? `${card.color} ${card.value}` : `${card.color} ${card.type}`} />
              </button>
            );
          })}
        </div>
      </section>

      <section className="actions-panel">
        {(selectedCard?.type === 'wild' || selectedCard?.type === 'wild_draw_four') ? (
          <select value={chosenColor} onChange={(event) => setChosenColor(event.target.value as 'red' | 'yellow' | 'green' | 'blue')}>
            <option value="red">Vermelho</option>
            <option value="yellow">Amarelo</option>
            <option value="green">Verde</option>
            <option value="blue">Azul</option>
          </select>
        ) : null}
        <div className="action-row">
          <button className="action-button action-green" disabled={!myTurn || !selectedCard} onClick={playCard} type="button">
            Jogar carta
          </button>
          <button className="action-button action-red" disabled={(privateState?.hand.length ?? 0) !== 1} onClick={callUno} type="button">
            UNO!
          </button>
          <button className="action-button action-blue" disabled={!myTurn} onClick={drawCard} type="button">
            Comprar carta
          </button>
        </div>
      </section>

      {error ? <p className="error">{error}</p> : null}
    </main>
  );
}

export default App;
