import { useEffect, useMemo, useRef, useState } from 'react';
import type { GameEvent, UnoPublicState } from '@party/shared';
import type { HostGameViewProps } from '../types';
import { getCardArt, getCardBackArt } from './cardArt';
import { describeEvent } from './describeEvent';
import { ANIMATION_MS, centre, flyStyle, isAnimated, REDUCED_MOTION, type ActiveAnim } from './animations';
import './uno-host.css';

const formatCardLabel = (card: NonNullable<UnoPublicState['topDiscard']>): string => {
  const colorLabel = card.color === 'wild' ? 'coringa' : card.color;
  const valueLabel = card.type === 'number' && card.value !== null ? card.value : card.type;
  return `${colorLabel} ${valueLabel}`;
};

export function UnoHostView({ publicState, events, players, connected, send }: HostGameViewProps) {
  const state = publicState as UnoPublicState;

  const [revealDrawPile, setRevealDrawPile] = useState(false);
  const [animQueue, setAnimQueue] = useState<{ seq: number; event: GameEvent }[]>([]);
  const [anim, setAnim] = useState<ActiveAnim | null>(null);
  const [showResult, setShowResult] = useState(false);
  const seenSeqRef = useRef(0);
  const discardRef = useRef<HTMLDivElement | null>(null);
  const monteRef = useRef<HTMLDivElement | null>(null);
  const rowRefs = useRef(new Map<string, HTMLLIElement>());

  // Enqueue newly-arrived animated events; reset when a fresh game clears the stream.
  useEffect(() => {
    if (events.length === 0) {
      setAnimQueue([]);
      setAnim(null);
      return;
    }
    const fresh = events.filter((e) => e.seq > seenSeqRef.current);
    if (fresh.length === 0) {
      return;
    }
    seenSeqRef.current = events[events.length - 1].seq;
    if (REDUCED_MOTION) {
      return;
    }
    const animated = fresh
      .map((e) => ({ seq: e.seq, event: e.event as GameEvent }))
      .filter((e) => isAnimated(e.event));
    if (animated.length > 0) {
      setAnimQueue((current) => [...current, ...animated].slice(-5));
    }
  }, [events]);

  // Drain the queue one event at a time so animations never overlap or race the board.
  useEffect(() => {
    if (anim || animQueue.length === 0) {
      return;
    }
    const [next, ...rest] = animQueue;
    const ev = next.event;
    let from;
    let to;
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

  useEffect(() => {
    if (!anim) {
      return;
    }
    const timer = setTimeout(() => setAnim(null), ANIMATION_MS[anim.event.type] ?? 500);
    return () => clearTimeout(timer);
  }, [anim]);

  const roundOverPhase = state.phase === 'round_finished' || state.phase === 'game_finished';
  // Hold the result overlay back briefly so the winning card's animation lands first (spec §36).
  useEffect(() => {
    if (!roundOverPhase) {
      setShowResult(false);
      return;
    }
    const timer = setTimeout(() => setShowResult(true), REDUCED_MOTION ? 0 : 900);
    return () => clearTimeout(timer);
  }, [roundOverPhase]);

  const boardPlayers = state.players;
  const nameOf = (id: string) => boardPlayers.find((p) => p.id === id)?.name ?? players.find((p) => p.id === id)?.name ?? '—';
  const onlineCount = boardPlayers.filter((p) => p.connected).length;
  const currentPlayerName = nameOf(state.currentPlayerId ?? '');
  const unoCaller = boardPlayers.find((p) => p.calledUno && p.handCount === 1);
  const unoForgot = boardPlayers.find((p) => p.unoChallengeable);

  const feedLines = useMemo(
    () =>
      events
        .map(({ seq, event }) => ({ seq, text: describeEvent(event as GameEvent, nameOf) }))
        .filter((line): line is { seq: number; text: string } => line.text !== null)
        .slice(-8),
    [events, boardPlayers],
  );

  const timerSeconds = state.timer ? Math.max(0, Math.ceil(state.timer.remainingMs / 1000)) : null;
  const timerLabel = timerSeconds === null ? '—' : `${timerSeconds}s`;
  const directionLabel = state.direction === -1 ? '↺ anti-horário' : '↻ horário';

  const scoreboard = useMemo(() => [...state.players].sort((a, b) => b.score - a.score), [state.players]);
  const roundWinnerName = nameOf(state.winnerPlayerId ?? '');
  const gameWinnerName = nameOf(state.gameWinnerPlayerId ?? '');
  const roundOver = state.phase === 'round_finished';
  const gameOver = state.phase === 'game_finished';
  const paused = state.phase === 'paused';

  const kickPlayer = (playerId: string) => {
    if (window.confirm('Expulsar este jogador da sala?')) {
      send('KICK_PLAYER', { targetPlayerId: playerId });
    }
  };

  const skippedPlayerId = anim?.event.type === 'player_skipped' ? anim.event.playerId : null;

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
              <button type="button" className="start-button" onClick={() => send('RESUME_GAME', {})}>Continuar</button>
              <button type="button" className="danger-button" onClick={() => send('END_GAME', {})}>Encerrar</button>
            </div>
          </div>
        </div>
      ) : null}

      {showResult && (roundOver || gameOver) ? (
        <div className="result-overlay" role="dialog" aria-live="polite">
          <div className="result-card">
            <p className="eyebrow">{gameOver ? 'Fim da partida' : `Rodada ${state.round}`}</p>
            <h2>{gameOver ? `🏆 ${gameWinnerName} venceu!` : `${roundWinnerName} zerou a mão`}</h2>
            <ol className="result-scoreboard">
              {scoreboard.map((player, index) => (
                <li key={player.id} className={index === 0 ? 'leader' : ''}>
                  <span>{index + 1}. {player.name}</span>
                  <strong>{player.score}</strong>
                </li>
              ))}
            </ol>
            <p className="result-target">Meta: {state.targetScore} pts</p>
            <div className="result-actions">
              {gameOver ? (
                <>
                  <button type="button" className="start-button" onClick={() => send('START_GAME', {})}>Nova partida</button>
                  <button type="button" className="danger-button" onClick={() => send('END_GAME', {})}>Encerrar</button>
                </>
              ) : (
                <button type="button" className="start-button" onClick={() => send('NEXT_ROUND', {})}>Próxima rodada</button>
              )}
            </div>
          </div>
        </div>
      ) : null}

      <header className="host-topbar">
        <div className="brand">
          <span className="brand-mark">UNO</span>
          <span className="brand-sub">Sala {state.roomCode} · Rodada {state.round}</span>
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
            <span className={`color-dot dot-${state.currentColor ?? 'neutral'}`}>{state.currentColor ?? '—'}</span>
            <span className={`meta-chip ${anim?.event.type === 'direction_changed' ? 'spin' : ''}`}>{directionLabel}</span>
            {state.pendingDraw > 0 ? <span className="meta-chip is-danger">Comprar +{state.pendingDraw}</span> : null}
          </div>

          <div className="piles">
            <div className="pile" ref={monteRef}>
              <span className="pile-label">Monte</span>
              <img
                className="pile-art"
                src={revealDrawPile && state.topDrawPileCard ? getCardArt(state.topDrawPileCard) : getCardBackArt()}
                alt={revealDrawPile && state.topDrawPileCard ? formatCardLabel(state.topDrawPileCard) : 'Monte de cartas'}
              />
              <span className="pile-count">{state.drawPileCount} cartas</span>
            </div>
            <div className={`pile is-discard color-${state.currentColor ?? 'neutral'}`} ref={discardRef}>
              <span className="pile-label">Descarte</span>
              <img
                key={state.topDiscard?.id ?? 'none'}
                className="pile-art discard-pop"
                src={state.topDiscard ? getCardArt(state.topDiscard) : getCardBackArt()}
                alt={state.topDiscard ? formatCardLabel(state.topDiscard) : 'Sem descarte'}
              />
              <span className="pile-count">{state.topDiscard ? formatCardLabel(state.topDiscard) : '—'}</span>
            </div>
          </div>

          <p className="turn-banner">
            {state.phase === 'awaiting_color_choice'
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
                className={`${state.currentPlayerId === player.id ? 'is-turn' : ''} ${skippedPlayerId === player.id ? 'just-skipped' : ''}`}
              >
                <span className={`conn-dot ${player.connected ? 'on' : 'off'}`} aria-hidden="true" />
                <span className="p-name">{player.name}</span>
                {state.currentPlayerId === player.id && state.pendingDraw > 0
                  ? <span className="p-tag">+{state.pendingDraw}</span>
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
                  onClick={() => kickPlayer(player.id)}
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
            <button type="button" className="ghost-button" onClick={() => send(paused ? 'RESUME_GAME' : 'PAUSE_GAME', {})}>
              {paused ? '▶ Continuar' : '⏸ Pausar'}
            </button>
            <button type="button" className="ghost-button" onClick={() => setRevealDrawPile((current) => !current)}>
              {revealDrawPile ? 'Ocultar monte' : 'Revelar monte'}
            </button>
            <button type="button" className="danger-button" onClick={() => send('END_GAME', {})}>Encerrar partida</button>
          </div>
        </aside>
      </div>
    </main>
  );
}
