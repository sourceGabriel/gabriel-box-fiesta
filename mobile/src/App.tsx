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

const activeSessionStorageKey = (roomCode: string): string => `activeSession:${roomCode.toUpperCase()}`;

const readStoredSessionKey = (roomCode: string): string | null => {
  if (!roomCode) {
    return null;
  }
  try {
    return localStorage.getItem(activeSessionStorageKey(roomCode));
  } catch {
    return null;
  }
};

const clearStoredSession = (storageKey: string | null, roomCode: string): void => {
  try {
    if (storageKey) {
      localStorage.removeItem(storageKey);
    }
    if (roomCode) {
      localStorage.removeItem(activeSessionStorageKey(roomCode));
    }
  } catch {
    // ignore storage errors
  }
};

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
  const activeSessionKeyRef = useRef<string | null>(readStoredSessionKey(getRoomCodeFromPath()));
  const roomCodeRef = useRef(roomCode);
  const errorTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    roomCodeRef.current = roomCode;
  }, [roomCode]);

  const showError = (message: string): void => {
    setError(message);
    if (errorTimerRef.current) {
      clearTimeout(errorTimerRef.current);
    }
    errorTimerRef.current = setTimeout(() => setError(''), 5000);
  };

  useEffect(() => {
    let keepAlive = true;
    let ws: WebSocket | null = null;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;
    let attempts = 0;

    const connect = (): void => {
      ws = new WebSocket(`${wsOrigin}/ws`);
      socketRef.current = ws;

      ws.onopen = () => {
        attempts = 0;
        setConnected(true);
        const key = activeSessionKeyRef.current;
        const token = key ? localStorage.getItem(key) : null;
        if (token && roomCodeRef.current) {
          ws?.send(JSON.stringify(makeMessage('RECONNECT_SESSION', {
            roomCode: roomCodeRef.current.toUpperCase(),
            sessionToken: token,
            role: 'player',
          })));
        }
      };
      ws.onerror = () => {
        // A close event always follows; reconnection is handled there.
      };
      ws.onclose = () => {
        setConnected(false);
        if (socketRef.current === ws) {
          socketRef.current = null;
        }
        if (!keepAlive) {
          return;
        }
        const delay = Math.min(1000 * 2 ** attempts, 5000);
        attempts += 1;
        retryTimer = setTimeout(connect, delay);
      };
      ws.onmessage = (event) => {
        const message = JSON.parse(event.data as string) as ServerMessage;
        switch (message.type) {
          case 'ROOM_JOINED':
            if (message.payload.playerId) {
              setPlayerId(message.payload.playerId);
            }
            if (pendingSessionStorageKeyRef.current) {
              activeSessionKeyRef.current = pendingSessionStorageKeyRef.current;
              try {
                localStorage.setItem(activeSessionStorageKey(roomCodeRef.current), pendingSessionStorageKeyRef.current);
              } catch {
                // ignore storage errors
              }
            }
            if (message.payload.sessionToken && pendingSessionStorageKeyRef.current) {
              try {
                localStorage.setItem(pendingSessionStorageKeyRef.current, message.payload.sessionToken);
              } catch {
                // ignore storage errors
              }
              pendingSessionStorageKeyRef.current = null;
            }
            setError('');
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
            if (/INVALID_SESSION|PLAYER_NOT_FOUND/.test(message.payload.message)) {
              clearStoredSession(activeSessionKeyRef.current, roomCodeRef.current);
              activeSessionKeyRef.current = null;
              setPlayerId(null);
              setPrivateState(null);
            } else {
              showError(message.payload.message);
            }
            break;
          default:
            break;
        }
      };
    };

    connect();
    return () => {
      keepAlive = false;
      if (retryTimer) {
        clearTimeout(retryTimer);
      }
      if (errorTimerRef.current) {
        clearTimeout(errorTimerRef.current);
      }
      if (socketRef.current === ws) {
        socketRef.current = null;
      }
      ws?.close();
    };
  }, []);

  const myTurn = publicState?.currentPlayerId === playerId;
  const selectedCard = useMemo(
    () => privateState?.hand.find((card) => card.id === selectedCardId) ?? null,
    [privateState, selectedCardId],
  );
  // The server pushes state ~2x/s and computes remainingMs itself, so we never read the phone clock.
  const timerLabel = publicState?.timer ? `${Math.max(0, Math.ceil(publicState.timer.remainingMs / 1000))}s` : '--';

  const hasJoined = Boolean(playerId);
  const gameStarted = Boolean(privateState);
  const gameOver = publicState?.phase === 'game_finished';
  const roundOver = publicState?.phase === 'round_finished' || gameOver;
  const playing = gameStarted && !roundOver;
  const canSubmitJoin = connected && roomCode.trim().length > 0 && playerName.trim().length > 0;
  const resultWinnerId = gameOver ? publicState?.gameWinnerPlayerId : publicState?.winnerPlayerId;
  const resultWinnerName = publicState?.players.find((player) => player.id === resultWinnerId)?.name ?? '—';
  const scoreboard = useMemo(
    () => [...(publicState?.players ?? [])].sort((a, b) => b.score - a.score),
    [publicState],
  );
  // Live hand counts / turn come from the public state during a game; fall back to the lobby roster.
  const rosterPlayers = publicState?.players ?? roomPlayers;
  const challengeableOpponents = (publicState?.players ?? []).filter(
    (player) => player.unoChallengeable && player.id !== playerId,
  );
  const myHandCount = privateState?.hand.length ?? 0;
  const iAmChallengeable = Boolean(
    publicState?.players.find((player) => player.id === playerId)?.unoChallengeable,
  );

  const joinOrReconnect = (): void => {
    if (!socketRef.current || !roomCode || !playerName.trim()) {
      return;
    }

    const basePlayerName = playerName.trim();
    const serverPlayerName = `${selectedAvatar} ${basePlayerName}`;
    const storageKey = `session:${roomCode.toUpperCase()}:${basePlayerName.toLowerCase()}`;
    activeSessionKeyRef.current = storageKey;
    try {
      localStorage.setItem(activeSessionStorageKey(roomCode), storageKey);
    } catch {
      // ignore storage errors
    }
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

  const challengeUno = (targetPlayerId: string): void => {
    if (!socketRef.current) {
      return;
    }
    socketRef.current.send(JSON.stringify(makeMessage('UNO_CHALLENGE', { targetPlayerId })));
  };

  return (
    <main className="mobile-layout">
      <header className="mobile-header">
        <div className="header-room">
          <span className="eyebrow">Sala</span>
          <strong className="room-code-inline">{roomCode || '—'}</strong>
          {!connected ? <span className="conn-pill">reconectando…</span> : null}
        </div>
        {playing ? (
          <div className={`header-timer ${myTurn ? 'is-turn' : ''}`}>
            <span className="label">{myTurn ? 'Sua vez' : 'Aguarde'}</span>
            <strong>{timerLabel}</strong>
          </div>
        ) : null}
      </header>

      {!hasJoined ? (
        <section className="join-panel">
          <h2>Entrar na sala</h2>
          <input
            value={roomCode}
            onChange={(event) => setRoomCode(event.target.value.toUpperCase())}
            placeholder="Código da sala"
            autoCapitalize="characters"
          />
          <input
            value={playerName}
            onChange={(event) => setPlayerName(event.target.value)}
            placeholder="Seu nome"
            maxLength={20}
          />
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
          <button className="primary-button" disabled={!canSubmitJoin} onClick={joinOrReconnect} type="button">
            Entrar
          </button>
        </section>
      ) : !gameStarted ? (
        <section className="waiting-panel">
          <div className="waiting-badge">{selectedAvatar}</div>
          <h2>Você está na sala</h2>
          <p className="hint">Aguardando o anfitrião iniciar a partida…</p>
        </section>
      ) : null}

      {(hasJoined || rosterPlayers.length > 0) ? (
        <section className="players-panel">
          <h2>Jogadores{rosterPlayers.length ? ` (${rosterPlayers.length})` : ''}</h2>
          <div className="player-list">
            {rosterPlayers.map((player) => (
              <div
                key={player.id}
                className={`player-pill ${player.id === playerId ? 'is-me' : ''} ${player.id === publicState?.currentPlayerId ? 'is-turn' : ''}`}
              >
                <span>{player.name}</span>
                <small>{player.handCount} cartas</small>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {roundOver ? (
        <section className="result-panel">
          <h2>{gameOver ? `🏆 ${resultWinnerName} venceu a partida` : `Rodada encerrada — ${resultWinnerName} zerou a mão`}</h2>
          <ol className="result-scoreboard">
            {scoreboard.map((player, index) => (
              <li key={player.id} className={index === 0 ? 'leader' : ''}>
                <span>{index + 1}. {player.name}</span>
                <strong>{player.score}</strong>
              </li>
            ))}
          </ol>
          <p className="hint">
            {gameOver ? 'Partida encerrada. Aguarde o anfitrião iniciar uma nova.' : 'Aguarde o anfitrião iniciar a próxima rodada.'}
          </p>
        </section>
      ) : null}

      {playing ? (
        <>
          {iAmChallengeable ? (
            <section className="uno-alert self">
              <strong>Você está com 1 carta!</strong>
              <span>Toque em UNO! antes que alguém denuncie.</span>
            </section>
          ) : null}

          {challengeableOpponents.length > 0 ? (
            <section className="uno-alert">
              <strong>Esqueceram o UNO!</strong>
              <div className="challenge-row">
                {challengeableOpponents.map((opponent) => (
                  <button
                    key={opponent.id}
                    type="button"
                    className="challenge-button"
                    onClick={() => challengeUno(opponent.id)}
                  >
                    Denunciar {opponent.name}
                  </button>
                ))}
              </div>
            </section>
          ) : null}

          <section className="hand-panel">
            <div className="hand-head">
              <h2>Suas cartas</h2>
              <span className="hand-status">{myTurn ? 'Sua vez de jogar' : 'Aguardando sua vez'}</span>
            </div>
            <p className="hint">Toque para selecionar. Cartas com borda verde podem ser jogadas agora.</p>
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
              <div className="color-choice" role="group" aria-label="Escolha a cor do coringa">
                {(['red', 'yellow', 'green', 'blue'] as const).map((color) => (
                  <button
                    key={color}
                    type="button"
                    className={`color-swatch swatch-${color} ${chosenColor === color ? 'selected' : ''}`}
                    onClick={() => setChosenColor(color)}
                    aria-label={color}
                    aria-pressed={chosenColor === color}
                  />
                ))}
              </div>
            ) : null}
            <div className="action-row">
              <button className="action-button action-green" disabled={!myTurn || !selectedCard} onClick={playCard} type="button">
                Jogar
              </button>
              <button className="action-button action-blue" disabled={!myTurn} onClick={drawCard} type="button">
                Comprar
              </button>
              <button
                className={`action-button action-red ${myHandCount === 1 && iAmChallengeable ? 'is-live' : ''}`}
                disabled={myHandCount !== 1}
                onClick={callUno}
                type="button"
              >
                UNO!
              </button>
            </div>
          </section>
        </>
      ) : null}

      {error ? <p className="error">{error}</p> : null}
    </main>
  );
}

export default App;
