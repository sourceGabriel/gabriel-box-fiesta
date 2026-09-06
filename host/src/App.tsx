import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import type { GameEvent, ServerMessage, UnoCard, UnoPublicState } from '@party/shared';

type Point = { x: number; y: number };
type ActiveAnim = { seq: number; event: GameEvent; from?: Point; to?: Point };
import { getCardArt, getCardBackArt } from './cardArt';
import './App.css';

type PlayerView = { id: string; name: string; connected: boolean; handCount: number };

const COLOR_LABEL: Record<string, string> = { red: 'vermelho', yellow: 'amarelo', green: 'verde', blue: 'azul', wild: 'coringa' };

const cardText = (card: UnoCard): string => {
  const color = COLOR_LABEL[card.color] ?? card.color;
  if (card.type === 'number') return `${color} ${card.value}`;
  if (card.type === 'draw_two') return `${color} +2`;
  if (card.type === 'skip') return `${color} bloqueio`;
  if (card.type === 'reverse') return `${color} inverte`;
  if (card.type === 'wild_draw_four') return 'coringa +4';
  return 'coringa';
};

// Which events get a queued board animation, and how long it holds the queue (ms).
const ANIMATION_MS: Partial<Record<GameEvent['type'], number>> = {
  card_played: 620,
  card_drawn: 620,
  color_changed: 820,
  direction_changed: 700,
  player_skipped: 720,
  uno_called: 1100,
  uno_penalty_applied: 950,
};
const REDUCED_MOTION =
  typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
    : false;

const describeEvent = (event: GameEvent, nameOf: (id: string) => string): string | null => {
  switch (event.type) {
    case 'round_started': return `Rodada ${event.round} começou`;
    case 'card_played': return `${nameOf(event.playerId)} jogou ${cardText(event.card)}`;
    case 'card_drawn': return `${nameOf(event.playerId)} comprou ${event.count} carta${event.count === 1 ? '' : 's'}`;
    case 'color_changed': return `Cor mudou para ${COLOR_LABEL[event.color] ?? event.color}`;
    case 'direction_changed': return `Sentido invertido`;
    case 'player_skipped': return `${nameOf(event.playerId)} perdeu a vez`;
    case 'uno_called': return `🔥 ${nameOf(event.playerId)} gritou UNO!`;
    case 'uno_penalty_applied': return `${nameOf(event.playerId)} pagou +${event.count} por não dizer UNO`;
    case 'round_finished': return `🏁 ${nameOf(event.winnerPlayerId)} venceu a rodada (+${event.roundScore})`;
    case 'game_finished': return `🏆 ${nameOf(event.gameWinnerPlayerId)} venceu a partida!`;
    case 'game_paused': return `⏸ Partida pausada`;
    case 'game_resumed': return `▶ Partida retomada`;
    default: return null;
  }
};

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
  const [joinUrl, setJoinUrl] = useState('');
  const [publicState, setPublicState] = useState<UnoPublicState | null>(null);
  const [lastError, setLastError] = useState('');
  const [connected, setConnected] = useState(false);
  const [revealDrawPile, setRevealDrawPile] = useState(false);
  const [feedEvents, setFeedEvents] = useState<{ seq: number; event: GameEvent }[]>([]);
  const feedSeq = useRef(0);
  const [animQueue, setAnimQueue] = useState<{ seq: number; event: GameEvent }[]>([]);
  const [anim, setAnim] = useState<ActiveAnim | null>(null);
  const [showResult, setShowResult] = useState(false);
  const discardRef = useRef<HTMLDivElement | null>(null);
  const monteRef = useRef<HTMLDivElement | null>(null);
  const rowRefs = useRef(new Map<string, HTMLLIElement>());

  useEffect(() => {
    let mounted = true;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;

    const loadRoom = (): void => {
      fetch(`${serverOrigin}/room`)
        .then((response) => response.json())
        .then((json) => {
          if (mounted) {
            setRoomCode(json.code);
            setLastError('');
          }
        })
        .catch(() => {
          if (mounted) {
            retryTimer = setTimeout(loadRoom, 2000);
          }
        });
    };

    loadRoom();
    return () => {
      mounted = false;
      if (retryTimer) {
        clearTimeout(retryTimer);
      }
    };
  }, []);

  useEffect(() => {
    if (!roomCode) {
      return;
    }

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
        setLastError('');
        ws?.send(JSON.stringify(makeMessage('JOIN_ROOM', { roomCode, playerName: 'HOST', role: 'host' })));
      };
      ws.onerror = () => {
        // A close event follows; reconnection is handled there.
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
          case 'ROOM_STATE':
            setPlayers(message.payload.players);
            setJoinQrDataUrl(message.payload.joinQrDataUrl);
            setJoinUrl(message.payload.joinUrl);
            break;
          case 'GAME_STATE_PUBLIC':
            setPublicState(message.payload.state);
            break;
          case 'GAME_EVENT': {
            const gameEvent = message.payload.event;
            const seq = (feedSeq.current += 1);
            if (describeEvent(gameEvent, () => '') !== null) {
              setFeedEvents((current) => [...current, { seq, event: gameEvent }].slice(-8));
            }
            if (!REDUCED_MOTION && ANIMATION_MS[gameEvent.type] !== undefined) {
              setAnimQueue((current) => [...current, { seq, event: gameEvent }].slice(-5));
            }
            break;
          }
          case 'GAME_STARTED':
            setFeedEvents([]);
            setAnimQueue([]);
            setAnim(null);
            break;
          case 'GAME_ENDED':
            setPublicState(null);
            setFeedEvents([]);
            setAnimQueue([]);
            setAnim(null);
            break;
          case 'ERROR':
            setLastError(message.payload.message);
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
      if (socketRef.current === ws) {
        socketRef.current = null;
      }
      ws?.close();
    };
  }, [roomCode]);

  // Drain the animation queue one event at a time so animations never overlap or race the board.
  useEffect(() => {
    if (anim || animQueue.length === 0) {
      return;
    }
    const [next, ...rest] = animQueue;
    const centre = (el: Element | null | undefined): Point | undefined => {
      const rect = el?.getBoundingClientRect();
      return rect ? { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 } : undefined;
    };
    const ev = next.event;
    let from: Point | undefined;
    let to: Point | undefined;
    if (ev.type === 'card_played') {
      from = centre(rowRefs.current.get(ev.playerId));
      to = centre(discardRef.current);
    } else if (ev.type === 'card_drawn') {
      from = centre(monteRef.current);
      to = centre(rowRefs.current.get(ev.playerId));
    } else if (ev.type === 'uno_penalty_applied') {
      to = centre(rowRefs.current.get(ev.playerId));
    }
    setAnimQueue(rest);
    setAnim({ ...next, from, to });
  }, [anim, animQueue]);

  // Each active animation clears itself after its hold time.
  useEffect(() => {
    if (!anim) {
      return;
    }
    const timer = setTimeout(() => setAnim(null), ANIMATION_MS[anim.event.type] ?? 500);
    return () => clearTimeout(timer);
  }, [anim]);

  const roundOverPhase = publicState?.phase === 'round_finished' || publicState?.phase === 'game_finished';
  // Hold the result overlay back briefly so the winning card's animation lands first (spec §36).
  useEffect(() => {
    if (!roundOverPhase) {
      setShowResult(false);
      return;
    }
    const timer = setTimeout(() => setShowResult(true), REDUCED_MOTION ? 0 : 900);
    return () => clearTimeout(timer);
  }, [roundOverPhase]);

  const canStart = useMemo(() => players.filter((player) => player.connected).length >= 2, [players]);
  const safeJoinQrDataUrl = useMemo(() => {
    if (!joinQrDataUrl?.startsWith(SAFE_QR_PREFIX)) {
      return undefined;
    }
    return joinQrDataUrl;
  }, [joinQrDataUrl]);

  const currentPlayerName = useMemo(
    () => players.find((player) => player.id === publicState?.currentPlayerId)?.name ?? '—',
    [players, publicState],
  );

  const formatCardLabel = (card: NonNullable<UnoPublicState['topDiscard']>) => {
    const colorLabel = card.color === 'wild' ? 'coringa' : card.color;
    const valueLabel = card.type === 'number' && card.value !== null ? card.value : card.type;
    return `${colorLabel} ${valueLabel}`;
  };

  const timerSeconds = publicState?.timer ? Math.max(0, Math.ceil(publicState.timer.remainingMs / 1000)) : null;
  const timerLabel = timerSeconds === null ? '—' : `${timerSeconds}s`;
  const directionLabel = publicState?.direction === -1 ? '↺ anti-horário' : '↻ horário';
  // During a game the authoritative per-player data (hand counts, scores, connection) comes from the public state.
  const boardPlayers = publicState?.players
    ?? players.map((player) => ({ ...player, score: 0, calledUno: false, unoChallengeable: false }));
  const onlineCount = boardPlayers.filter((player) => player.connected).length;
  const unoCaller = boardPlayers.find((player) => player.calledUno && player.handCount === 1);
  const unoForgot = boardPlayers.find((player) => player.unoChallengeable);
  const feedLines = useMemo(() => {
    const nameOf = (id: string) => boardPlayers.find((player) => player.id === id)?.name ?? '—';
    return feedEvents
      .map(({ seq, event }) => ({ seq, text: describeEvent(event, nameOf) }))
      .filter((line): line is { seq: number; text: string } => line.text !== null);
  }, [feedEvents, boardPlayers]);

  const handleEndGame = () => {
    socketRef.current?.send(JSON.stringify(makeMessage('END_GAME', {})));
  };

  const handleNextRound = () => {
    socketRef.current?.send(JSON.stringify(makeMessage('NEXT_ROUND', {})));
  };

  const handlePauseToggle = (resume: boolean) => {
    socketRef.current?.send(JSON.stringify(makeMessage(resume ? 'RESUME_GAME' : 'PAUSE_GAME', {})));
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
  const paused = publicState?.phase === 'paused';

  const handleKickPlayer = (playerId: string) => {
    const confirmed = window.confirm('Expulsar este jogador da sala?');
    if (!confirmed) {
      return;
    }
    socketRef.current?.send(JSON.stringify(makeMessage('KICK_PLAYER', { targetPlayerId: playerId })));
  };

  const flyStyle = (from: Point, to: Point, extra?: CSSProperties): CSSProperties => ({
    ['--x0' as string]: `${from.x}px`,
    ['--y0' as string]: `${from.y}px`,
    ['--x1' as string]: `${to.x}px`,
    ['--y1' as string]: `${to.y}px`,
    ...extra,
  });

  const renderAnim = () => {
    if (!anim) {
      return null;
    }
    const { seq, event, from, to } = anim;
    if (event.type === 'card_played' && from && to) {
      return <img key={seq} className="fly-card" src={getCardArt(event.card)} alt="" style={flyStyle(from, to)} />;
    }
    if (event.type === 'card_drawn' && from && to) {
      return Array.from({ length: Math.min(event.count, 3) }, (_, i) => (
        <img
          key={`${seq}-${i}`}
          className="fly-card is-back"
          src={getCardBackArt()}
          alt=""
          style={flyStyle(from, to, { animationDelay: `${i * 80}ms` })}
        />
      ));
    }
    if (event.type === 'color_changed') {
      return <div key={seq} className={`fx-color dot-${event.color}`} />;
    }
    if (event.type === 'direction_changed') {
      return <div key={seq} className="fx-direction">{event.direction === -1 ? '↺' : '↻'}</div>;
    }
    if (event.type === 'uno_called') {
      return <div key={seq} className="fx-uno">UNO!</div>;
    }
    if (event.type === 'uno_penalty_applied' && to) {
      return <div key={seq} className="fx-penalty" style={{ left: `${to.x}px`, top: `${to.y}px` }}>+{event.count}</div>;
    }
    return null;
  };

  const skippedPlayerId = anim?.event.type === 'player_skipped' ? anim.event.playerId : null;

  if (!publicState) {
    return (
      <main className="host-shell host-lobby">
        <div className="lobby-card">
          <div className="lobby-title">
            <span className="brand-mark xl">UNO</span>
            <p>Escaneie o QR code ou digite o código no celular para entrar.</p>
          </div>

          <div className="lobby-grid">
            <div className="lobby-qr">
              {safeJoinQrDataUrl
                ? <img src={safeJoinQrDataUrl} alt="QR code da sala" />
                : <div className="qr-skeleton" aria-hidden="true" />}
              <p className="lobby-code">{roomCode || '----'}</p>
              {joinUrl ? <p className="lobby-url">{joinUrl}</p> : null}
            </div>

            <div className="lobby-players">
              <h2>Jogadores ({players.length})</h2>
              {players.length === 0
                ? <p className="hint">Ninguém entrou ainda.</p>
                : (
                  <ul>
                    {players.map((player) => (
                      <li key={player.id}>
                        <span>{player.name}</span>
                        <span className={`conn-dot ${player.connected ? 'on' : 'off'}`} aria-hidden="true" />
                      </li>
                    ))}
                  </ul>
                )}
            </div>
          </div>

          <div className="lobby-cta">
            <button
              className="start-button"
              disabled={!connected || !canStart}
              onClick={() => socketRef.current?.send(JSON.stringify(makeMessage('START_GAME', {})))}
              type="button"
            >
              {canStart ? 'Iniciar partida' : 'Aguardando 2+ jogadores'}
            </button>
            <span className="status-chip">{connected ? `${onlineCount} online` : 'offline'}</span>
          </div>

          {lastError ? <p className="error">{lastError}</p> : null}
        </div>
      </main>
    );
  }

  return (
    <main className="host-shell host-game">
      <div className="anim-layer" aria-hidden="true">{renderAnim()}</div>
      {roundOverPhase && !showResult ? <div className="anim-layer confetti" aria-hidden="true" /> : null}

      {paused ? (
        <div className="result-overlay" role="dialog" aria-live="polite">
          <div className="result-card">
            <p className="eyebrow">Partida pausada</p>
            <h2>⏸ Aguardando o anfitrião</h2>
            <div className="result-actions">
              <button type="button" className="start-button" onClick={() => handlePauseToggle(true)}>Continuar</button>
              <button type="button" className="danger-button" onClick={handleEndGame}>Encerrar</button>
            </div>
          </div>
        </div>
      ) : null}

      {showResult && (roundOver || gameOver) ? (
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

      <header className="host-topbar">
        <div className="brand">
          <span className="brand-mark">UNO</span>
          <span className="brand-sub">Sala {roomCode} · Rodada {publicState.round}</span>
          {!connected ? <span className="conn-pill">reconectando…</span> : null}
        </div>
        <div className={`turn-timer ${timerSeconds !== null && timerSeconds <= 8 ? 'is-low' : ''}`}>
          <span>Tempo</span>
          <strong>{timerLabel}</strong>
        </div>
      </header>

      <div className="host-body">
        <section className="table-zone">
          <div className="table-meta-row">
            <span className={`color-dot dot-${publicState.currentColor ?? 'neutral'}`}>{publicState.currentColor ?? '—'}</span>
            <span className={`meta-chip ${anim?.event.type === 'direction_changed' ? 'spin' : ''}`}>{directionLabel}</span>
            {publicState.pendingDraw > 0 ? <span className="meta-chip is-danger">Comprar +{publicState.pendingDraw}</span> : null}
          </div>

          <div className="piles">
            <div className="pile" ref={monteRef}>
              <span className="pile-label">Monte</span>
              <img
                className="pile-art"
                src={revealDrawPile && publicState.topDrawPileCard ? getCardArt(publicState.topDrawPileCard) : getCardBackArt()}
                alt={revealDrawPile && publicState.topDrawPileCard ? formatCardLabel(publicState.topDrawPileCard) : 'Monte de cartas'}
              />
              <span className="pile-count">{publicState.drawPileCount} cartas</span>
            </div>
            <div className={`pile is-discard color-${publicState.currentColor ?? 'neutral'}`} ref={discardRef}>
              <span className="pile-label">Descarte</span>
              <img
                key={publicState.topDiscard?.id ?? 'none'}
                className="pile-art discard-pop"
                src={publicState.topDiscard ? getCardArt(publicState.topDiscard) : getCardBackArt()}
                alt={publicState.topDiscard ? formatCardLabel(publicState.topDiscard) : 'Sem descarte'}
              />
              <span className="pile-count">{publicState.topDiscard ? formatCardLabel(publicState.topDiscard) : '—'}</span>
            </div>
          </div>

          <p className="turn-banner">
            {publicState.phase === 'awaiting_color_choice'
              ? <><strong>{currentPlayerName}</strong> está escolhendo a cor…</>
              : <>Vez de <strong>{currentPlayerName}</strong></>}
          </p>

          {unoForgot ? (
            <p className="uno-shout forgot">⚠️ {unoForgot.name} esqueceu de dizer UNO!</p>
          ) : unoCaller ? (
            <p className="uno-shout">🔥 {unoCaller.name} está em UNO!</p>
          ) : null}
        </section>

        <aside className="side-zone">
          <div className="side-head">
            <h2>Jogadores</h2>
            <span className="status-chip">{connected ? `${onlineCount} online` : 'offline'}</span>
          </div>
          <ul className="player-rows">
            {boardPlayers.map((player) => (
              <li
                key={player.id}
                ref={(el) => {
                  if (el) rowRefs.current.set(player.id, el);
                  else rowRefs.current.delete(player.id);
                }}
                className={`${publicState.currentPlayerId === player.id ? 'is-turn' : ''} ${skippedPlayerId === player.id ? 'just-skipped' : ''}`}
              >
                <span className={`conn-dot ${player.connected ? 'on' : 'off'}`} aria-hidden="true" />
                <span className="p-name">{player.name}</span>
                {publicState.currentPlayerId === player.id && publicState.pendingDraw > 0
                  ? <span className="p-tag">+{publicState.pendingDraw}</span>
                  : null}
                {player.unoChallengeable
                  ? <span className="p-tag danger">SEM UNO</span>
                  : player.calledUno && player.handCount === 1
                    ? <span className="p-tag uno">UNO!</span>
                    : null}
                <span className="p-score">{player.score} pts</span>
                <span className="p-hand">{player.handCount}</span>
                <button
                  type="button"
                  className="kick-button"
                  aria-label={`Expulsar ${player.name}`}
                  onClick={() => handleKickPlayer(player.id)}
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
          {feedLines.length > 0 ? (
            <ul className="event-feed" aria-live="polite">
              {feedLines.map((line) => (
                <li key={line.seq}>{line.text}</li>
              ))}
            </ul>
          ) : null}

          <div className="side-actions">
            <button type="button" className="ghost-button" onClick={() => handlePauseToggle(paused)}>
              {paused ? '▶ Continuar' : '⏸ Pausar'}
            </button>
            <button type="button" className="ghost-button" onClick={() => setRevealDrawPile((current) => !current)}>
              {revealDrawPile ? 'Ocultar monte' : 'Revelar monte'}
            </button>
            <button type="button" className="danger-button" onClick={handleEndGame}>Encerrar partida</button>
          </div>
        </aside>
      </div>
    </main>
  );
}

export default App;
