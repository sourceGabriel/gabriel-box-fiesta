import { useEffect, useMemo, useRef, useState } from 'react';
import type { Fase10Card, Fase10GameEvent, Fase10LaidGroup, Fase10PublicState } from '@party/shared';
import { Avatar, BrandMark, Button, getSounds, Overlay, Timer, VictorySplash } from '@party/ui';
import type { HostGameViewProps } from '../types';
import { describeEvent } from './describeEvent';
import { soundForEvent } from './sound-map';
import './fase10-host.css';

const REDUCED_MOTION =
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

const UI_SCALES = [1, 1.15, 1.3, 1.5];
const SCALE_KEY = 'party:fase10:hostscale';
const readScale = (): number => {
  try {
    const v = Number(localStorage.getItem(SCALE_KEY));
    return UI_SCALES.includes(v) ? v : 1;
  } catch {
    return 1;
  }
};

type Point = { x: number; y: number };
type FlyAnim = { seq: number; kind: 'draw' | 'discard'; card: Fase10Card | null; from: Point; to: Point };
const centre = (el: Element | null | undefined): Point | null => {
  const r = el?.getBoundingClientRect();
  return r ? { x: r.left + r.width / 2, y: r.top + r.height / 2 } : null;
};

function CardFace({ card, size = 'md' }: { card: Fase10Card; size?: 'sm' | 'md' | 'lg' }) {
  const cls = `f10-card f10-card-${size}`;
  if (card.kind === 'wild') return <span className={`${cls} is-wild`} aria-label="Curinga">★</span>;
  if (card.kind === 'skip') return <span className={`${cls} is-skip`} aria-label="Pula">⊘</span>;
  return (
    <span className={`${cls} c-${card.color}`} aria-label={`${card.value}`}>
      {card.value}
    </span>
  );
}

function CardBack({ size = 'lg', style }: { size?: 'sm' | 'md' | 'lg'; style?: React.CSSProperties }) {
  return (
    <span className={`f10-card f10-card-${size} is-back`} style={style} aria-hidden="true">
      <span className="f10-back-emblem">10</span>
    </span>
  );
}

function LaidGroupView({ group }: { group: Fase10LaidGroup }) {
  const kind = group.req.type === 'run' ? 'sequência' : group.req.type === 'color' ? 'cor' : 'grupo';
  return (
    <div className={`f10-group is-${group.req.type}`}>
      <span className="f10-group-tag">
        {kind} {group.req.size}
      </span>
      <div className="f10-group-cards">
        {group.cards.map((c, i) => (
          <CardFace key={c.id + i} card={c} size="sm" />
        ))}
      </div>
    </div>
  );
}

export function Fase10HostView({ publicState, events, players, connected, reactions, send }: HostGameViewProps) {
  const pub = publicState as Fase10PublicState;
  const seenSeqRef = useRef(0);
  const [feed, setFeed] = useState<{ seq: number; text: string }[]>([]);
  const sounds = useMemo(() => getSounds(), []);
  const [soundOn, setSoundOn] = useState(() => sounds.isEnabled());
  const [uiScale, setUiScale] = useState(readScale);
  const [showPhases, setShowPhases] = useState(false);

  const deckRef = useRef<HTMLDivElement | null>(null);
  const discardRef = useRef<HTMLDivElement | null>(null);
  const rowRefs = useRef(new Map<string, HTMLLIElement>());
  const [fly, setFly] = useState<FlyAnim | null>(null);
  const [flyQueue, setFlyQueue] = useState<FlyAnim[]>([]);
  const [glowRow, setGlowRow] = useState<string | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem(SCALE_KEY, String(uiScale));
    } catch {
      /* ignore */
    }
  }, [uiScale]);

  const nameOf = useMemo(() => {
    const map = new Map<string, string>();
    for (const p of pub.players) map.set(p.id, p.name);
    for (const p of players) if (!map.has(p.id)) map.set(p.id, p.name);
    return (id: string) => map.get(id) ?? '—';
  }, [pub.players, players]);

  const avatarOf = useMemo(() => {
    const map = new Map(players.map((p) => [p.id, p.avatar] as const));
    return (id: string) => map.get(id);
  }, [players]);

  useEffect(() => {
    if (events.length === 0) {
      seenSeqRef.current = 0;
      setFeed([]);
      return;
    }
    const lastSeq = events[events.length - 1].seq;
    if (lastSeq <= seenSeqRef.current) return;
    const fresh = events.filter((e) => e.seq > seenSeqRef.current);
    seenSeqRef.current = lastSeq;

    for (const { event } of fresh) {
      const spec = soundForEvent(event as Fase10GameEvent);
      if (spec) sounds.play(spec);
    }

    const lines = fresh
      .map((e) => ({ seq: e.seq, text: describeEvent(e.event as Fase10GameEvent, nameOf) }))
      .filter((l): l is { seq: number; text: string } => l.text !== null);
    if (lines.length > 0) setFeed((cur) => [...cur, ...lines].slice(-9));

    if (REDUCED_MOTION) return;
    const newFlies: FlyAnim[] = [];
    for (const { seq, event } of fresh) {
      const ev = event as Fase10GameEvent;
      if (ev.type === 'card_drawn') {
        const from = centre(deckRef.current);
        const to = centre(rowRefs.current.get(ev.playerId));
        if (from && to) newFlies.push({ seq, kind: 'draw', card: null, from, to });
      } else if (ev.type === 'card_discarded') {
        const from = centre(rowRefs.current.get(ev.playerId));
        const to = centre(discardRef.current);
        if (from && to) newFlies.push({ seq, kind: 'discard', card: ev.card, from, to });
      } else if (ev.type === 'phase_laid') {
        setGlowRow(ev.playerId);
        setTimeout(() => setGlowRow((c) => (c === ev.playerId ? null : c)), 1400);
      }
    }
    if (newFlies.length > 0) setFlyQueue((q) => [...q, ...newFlies].slice(-4));
  }, [events, nameOf, sounds]);

  // Pull the next queued fly-card once nothing is in flight.
  useEffect(() => {
    if (fly || flyQueue.length === 0) return;
    setFly(flyQueue[0]);
    setFlyQueue((q) => q.slice(1));
  }, [fly, flyQueue]);

  // Each fly-card clears itself after the animation.
  useEffect(() => {
    if (!fly) return;
    const t = setTimeout(() => setFly(null), 560);
    return () => clearTimeout(t);
  }, [fly]);

  const paused = pub.phase === 'paused';
  const handOver = pub.phase === 'handOver';
  const gameOver = pub.phase === 'gameOver';
  const timerSeconds = pub.timer ? Math.max(0, Math.ceil(pub.timer.remainingMs / 1000)) : null;

  const specLabel = (phaseIndex: number) => pub.phaseSpecs[Math.min(phaseIndex, 10) - 1]?.label ?? '—';
  const currentName = nameOf(pub.currentPlayerId ?? '');
  const currentPlayer = pub.players.find((p) => p.id === pub.currentPlayerId) ?? null;
  const groupsByOwner = useMemo(() => {
    const map = new Map<string, Fase10LaidGroup[]>();
    for (const g of pub.table) {
      const list = map.get(g.ownerId) ?? [];
      list.push(g);
      map.set(g.ownerId, list);
    }
    return map;
  }, [pub.table]);
  const tableOwners = pub.players.filter((p) => (groupsByOwner.get(p.id) ?? []).length > 0);

  const finalRank = useMemo(
    () =>
      [...pub.players].sort(
        (a, b) => Number(b.phaseIndex > pub.targetPhase) - Number(a.phaseIndex > pub.targetPhase) || a.score - b.score,
      ),
    [pub.players, pub.targetPhase],
  );

  const flyStyle: React.CSSProperties | undefined = fly
    ? ({
        ['--x0' as string]: `${fly.from.x}px`,
        ['--y0' as string]: `${fly.from.y}px`,
        ['--x1' as string]: `${fly.to.x}px`,
        ['--y1' as string]: `${fly.to.y}px`,
      } as React.CSSProperties)
    : undefined;

  return (
    <main
      className={`host-shell fase10-host ${uiScale >= 1.3 ? 'is-zoomed' : ''}`}
      style={{ ['--f10-ui-scale' as string]: String(uiScale) } as React.CSSProperties}
    >
      {fly ? (
        <div className="f10-fly-layer" aria-hidden="true">
          <div className="f10-fly" style={flyStyle}>
            {fly.kind === 'discard' && fly.card ? <CardFace card={fly.card} size="lg" /> : <CardBack />}
          </div>
        </div>
      ) : null}

      <div className="f10-reactions" aria-hidden="true">
        {reactions.slice(-6).map((r) => (
          <div key={r.key} className="f10-reaction-bubble">
            <span className="f10-reaction-emoji">{r.reaction}</span>
            <span className="f10-reaction-who">{nameOf(r.playerId)}</span>
          </div>
        ))}
      </div>

      {paused ? (
        <Overlay label="Partida pausada">
          <p className="eyebrow">Partida pausada</p>
          <h2>⏸ Aguardando o anfitrião</h2>
          <div className="f10-result-actions">
            <Button variant="primary" onClick={() => send('RESUME_GAME', {})}>Continuar</Button>
            <Button variant="danger" onClick={() => send('END_GAME', {})}>Encerrar</Button>
          </div>
        </Overlay>
      ) : null}

      {showPhases && !gameOver ? (
        <Overlay label="As 10 fases">
          <p className="eyebrow">Objetivo</p>
          <h2>As 10 fases</h2>
          <ol className="f10-phaselist">
            {pub.phaseSpecs.map((spec) => {
              const here = pub.players.filter((p) => Math.min(p.phaseIndex, 10) === spec.index);
              return (
                <li key={spec.index} className={here.length > 0 ? 'has-player' : ''}>
                  <span className="f10-phasenum">{spec.index}</span>
                  <span className="f10-phaselabel">{spec.label}</span>
                  <span className="f10-phasewho">{here.map((p) => p.name).join(', ')}</span>
                </li>
              );
            })}
          </ol>
          <div className="f10-result-actions">
            <Button variant="primary" onClick={() => setShowPhases(false)}>Voltar ao jogo</Button>
          </div>
        </Overlay>
      ) : null}

      {handOver && pub.handResult ? (
        <Overlay label="Fim da mão">
          <p className="eyebrow">Mão {pub.hand}</p>
          <h2>{pub.handWinnerId ? `${nameOf(pub.handWinnerId)} zerou a mão` : 'Mão encerrada'}</h2>
          <ol className="f10-hand-result">
            {pub.handResult.map((r) => (
              <li key={r.playerId} className={r.advanced ? 'advanced' : ''}>
                <span className="f10-hr-name">
                  {r.name}{' '}
                  {r.advanced ? (
                    <span className="f10-hr-up">▲ fase {r.phaseIndex}</span>
                  ) : (
                    <span className="f10-hr-stay">fase {r.phaseIndex}</span>
                  )}
                </span>
                <span className="f10-hr-pts">+{r.gained} pts</span>
              </li>
            ))}
          </ol>
          <div className="f10-result-actions">
            <Button variant="primary" onClick={() => send('NEXT_ROUND', {})}>Próxima mão</Button>
            <Button variant="danger" onClick={() => send('END_GAME', {})}>Encerrar</Button>
          </div>
        </Overlay>
      ) : null}

      {gameOver ? (
        <Overlay label="Fim da partida">
          <p className="eyebrow">Fim de Fase 10</p>
          {pub.gameWinnerId === null ? (
            <h2>🤝 Empate!</h2>
          ) : (
            <VictorySplash
              winner={{ name: nameOf(pub.gameWinnerId), avatar: avatarOf(pub.gameWinnerId) }}
              subtitle={`completou a fase ${pub.targetPhase}`}
              accent="#a855f7"
            />
          )}
          <ol className="f10-final-standings">
            {finalRank.map((p, i) => (
              <li key={p.id}>
                <span className="f10-final-name">
                  {i + 1}º {p.name} · fase {Math.min(p.phaseIndex, pub.targetPhase)}
                </span>
                <span className="f10-final-score">{p.score} pts</span>
              </li>
            ))}
          </ol>
          <div className="f10-result-actions">
            <Button variant="primary" onClick={() => send('START_GAME', {})}>Nova partida</Button>
            <Button variant="danger" onClick={() => send('END_GAME', {})}>Encerrar</Button>
          </div>
        </Overlay>
      ) : null}

      <header className="f10-topbar">
        <div className="f10-brand">
          <BrandMark text="Fase 10" size="md" />
          <span className="f10-brand-sub">
            Sala {pub.roomCode} · Mão {pub.hand} · vence na fase {pub.targetPhase}
          </span>
          {!connected ? <span className="f10-conn-pill">reconectando…</span> : null}
        </div>
        <Timer seconds={timerSeconds} active={pub.phase === 'turn'} />
      </header>

      <div className="f10-body">
        <section className="f10-stage">
          <div className="f10-board">
            <div className="f10-deck" ref={deckRef}>
              <span className="f10-deck-label">Monte</span>
              <div className="f10-deck-stack">
                <CardBack style={{ ['--i' as string]: 0 } as React.CSSProperties} />
                <CardBack style={{ ['--i' as string]: 1 } as React.CSSProperties} />
                <CardBack style={{ ['--i' as string]: 2 } as React.CSSProperties} />
              </div>
              <span className="f10-deck-count">{pub.drawPileCount}</span>
            </div>

            <div className="f10-throw">
              <p className="f10-turn-banner">
                {pub.phase === 'turn' ? (
                  <>
                    Vez de <strong>{currentName}</strong>
                    <span className="f10-turn-sub">
                      {pub.hasDrawn ? 'montando / descartando…' : 'comprando…'}
                    </span>
                  </>
                ) : (
                  'Distribuindo cartas…'
                )}
              </p>
              {currentPlayer ? (
                <p className="f10-turn-phase">
                  fase {currentPlayer.phaseIndex}: {specLabel(currentPlayer.phaseIndex)}
                </p>
              ) : null}
            </div>

            <div className="f10-discard" ref={discardRef}>
              <span className="f10-deck-label">Descarte</span>
              {pub.topDiscard ? (
                <span key={pub.topDiscard.id} className={REDUCED_MOTION ? '' : 'f10-discard-pop'}>
                  <CardFace card={pub.topDiscard} size="lg" />
                </span>
              ) : (
                <span className="f10-card f10-card-lg is-empty">—</span>
              )}
            </div>
          </div>

          <div className="f10-table" aria-label="Fases baixadas">
            {tableOwners.length === 0 ? (
              <p className="hint">Ninguém baixou a fase ainda.</p>
            ) : (
              tableOwners.map((p) => (
                <div key={p.id} className="f10-table-row">
                  <span className="f10-table-owner">{p.name}</span>
                  <div className="f10-table-groups">
                    {(groupsByOwner.get(p.id) ?? []).map((g) => (
                      <LaidGroupView key={g.id} group={g} />
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        <aside className="f10-side">
          <div className="f10-side-head">
            <h2>Jogadores</h2>
            <span className="status-chip">{connected ? 'ao vivo' : 'offline'}</span>
          </div>
          <ol className="f10-roster">
            {pub.players.map((p) => (
              <li
                key={p.id}
                ref={(el) => {
                  if (el) rowRefs.current.set(p.id, el);
                  else rowRefs.current.delete(p.id);
                }}
                className={`${p.id === pub.currentPlayerId ? 'is-turn' : ''} ${p.skipped ? 'is-skipped' : ''} ${glowRow === p.id ? 'just-laid' : ''}`}
              >
                <span className={`f10-conn-dot ${p.connected ? 'on' : 'off'}`} aria-hidden="true" />
                {avatarOf(p.id) ? <Avatar spec={avatarOf(p.id)!} size={30} /> : null}
                <span className="f10-roster-main">
                  <span className="f10-roster-name">{p.name}</span>
                  <span className="f10-roster-phase">
                    Fase {p.phaseIndex} · {specLabel(p.phaseIndex)}
                  </span>
                </span>
                {p.laid ? <span className="f10-tag laid">montou</span> : null}
                {p.skipped ? <span className="f10-tag skip">pulado</span> : null}
                <span className="f10-roster-hand" title="cartas na mão">{p.handCount}</span>
                <span className="f10-roster-score">{p.score}</span>
              </li>
            ))}
          </ol>
          {feed.length > 0 ? (
            <ul className="f10-feed" aria-live="polite">
              {feed.map((line) => (
                <li key={line.seq}>{line.text}</li>
              ))}
            </ul>
          ) : (
            <p className="hint">Aguardando…</p>
          )}
          <div className="f10-side-actions">
            <Button variant="ghost" onClick={() => setShowPhases(true)}>📋 Fases</Button>
            <Button variant="ghost" onClick={() => send(paused ? 'RESUME_GAME' : 'PAUSE_GAME', {})}>
              {paused ? '▶ Continuar' : '⏸ Pausar'}
            </Button>
            <Button variant="danger" onClick={() => send('END_GAME', {})}>Encerrar</Button>
          </div>
          <button
            type="button"
            className="f10-sound-toggle"
            aria-pressed={soundOn}
            onClick={() => setSoundOn(sounds.toggle())}
          >
            {soundOn ? '🔊 Som ligado' : '🔇 Som desligado'}
          </button>
        </aside>
      </div>

      <button
        type="button"
        className="f10-uiscale-btn"
        onClick={() => setUiScale(UI_SCALES[(UI_SCALES.indexOf(uiScale) + 1) % UI_SCALES.length])}
        aria-label={`Tamanho da tela: ${Math.round(uiScale * 100)}%. Clique para aumentar.`}
        title="Aumentar a tela"
      >
        <span aria-hidden="true">⤢</span>
        <span className="f10-uiscale-pct">{Math.round(uiScale * 100)}%</span>
      </button>
    </main>
  );
}
