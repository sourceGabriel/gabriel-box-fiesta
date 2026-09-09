import { useEffect, useMemo, useRef, useState } from 'react';
import type { AvatarSpec, DilemaGameEvent, DilemaPublicState, DilemaTrack, DilemaTrackView } from '@party/shared';
import { Avatar, BrandMark, Button, getSounds, Overlay, RoundScoreboard, roundTaunt, Timer } from '@party/ui';
import type { HostGameViewProps } from '../types';
import { describeEvent } from './describeEvent';
import { soundForEvent } from './sound-map';
import './dilema-host.css';

const CARD_ICON: Record<string, string> = { innocent: '😇', guilty: '😈', modifier: '✨' };

function TrackColumn({
  track,
  avatarOf,
  state,
}: {
  track: DilemaTrackView;
  avatarOf: (id: string) => AvatarSpec | undefined;
  state: 'live' | 'killed' | 'spared' | 'idle';
}) {
  return (
    <section className={`dil-track is-${track.side} is-${state}`}>
      <header className="dil-track-head">
        <h3>{track.label}</h3>
        <ul className="dil-track-team">
          {track.memberIds.map((id, i) => (
            <li key={id}>
              {avatarOf(id) ? <Avatar spec={avatarOf(id)!} size={22} /> : null}
              <span>{track.memberNames[i]}</span>
            </li>
          ))}
          {track.memberIds.length === 0 ? <li className="dil-empty">—</li> : null}
        </ul>
      </header>
      <ol className="dil-track-cards">
        {track.cards.map((c) => (
          <li key={c.id} className={`dil-card is-${c.type}`}>
            <span className="dil-card-icon" aria-hidden="true">{CARD_ICON[c.type] ?? '•'}</span>
            <span className="dil-card-body">
              <span className="dil-card-text">{c.text}</span>
              {c.authorName ? <span className="dil-card-author">— {c.authorName}</span> : <span className="dil-card-author">semente</span>}
              {c.modifiers.length > 0 ? (
                <span className="dil-card-mods">
                  {c.modifiers.map((m) => (
                    <span key={m.id} className="dil-mod-chip">＋ {m.text}</span>
                  ))}
                </span>
              ) : null}
            </span>
          </li>
        ))}
      </ol>
      {state === 'killed' ? <div className="dil-track-stamp">💥 ATROPELADO</div> : null}
      {state === 'spared' ? <div className="dil-track-stamp is-good">🚋 POUPADO</div> : null}
    </section>
  );
}

export function DilemaHostView({ publicState, events, players, connected, reactions, send }: HostGameViewProps) {
  const pub = publicState as DilemaPublicState;
  const seenSeqRef = useRef(0);
  const [feed, setFeed] = useState<{ seq: number; text: string }[]>([]);
  const sounds = useMemo(() => getSounds(), []);
  const [soundOn, setSoundOn] = useState(() => sounds.isEnabled());

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
      const spec = soundForEvent(event as DilemaGameEvent);
      if (spec) sounds.play(spec);
    }
    const lines = fresh
      .map((e) => ({ seq: e.seq, text: describeEvent(e.event as DilemaGameEvent, nameOf) }))
      .filter((l): l is { seq: number; text: string } => l.text !== null);
    if (lines.length > 0) setFeed((cur) => [...cur, ...lines].slice(-9));
  }, [events, nameOf, sounds]);

  const paused = pub.phase === 'paused';
  const over = pub.phase === 'gameover';
  const inResults = pub.phase === 'roundResults' || over;
  const timerSeconds = pub.timer ? Math.max(0, Math.ceil(pub.timer.remainingMs / 1000)) : null;

  const scoreRows = useMemo(() => {
    const base = pub.standings.length
      ? pub.standings.map((s) => ({ playerId: s.playerId, name: s.name, score: s.spared, roundPoints: s.roundDelta }))
      : [...pub.players]
          .map((p) => ({ playerId: p.id, name: p.name, score: p.spared, roundPoints: 0 }))
          .sort((a, b) => b.score - a.score);
    return base;
  }, [pub.standings, pub.players]);

  const trackState = (side: DilemaTrack): 'live' | 'killed' | 'spared' | 'idle' => {
    if (inResults && pub.killedTrack) return side === pub.killedTrack ? 'killed' : 'spared';
    if (pub.phase === 'playing' || pub.phase === 'verdict') return 'live';
    return 'idle';
  };

  return (
    <main className="host-shell dilema-host">
      <div className="dil-reactions" aria-hidden="true">
        {reactions.slice(-6).map((r) => (
          <div key={r.key} className="dil-reaction-bubble">
            <span className="dil-reaction-emoji">{r.reaction}</span>
            <span className="dil-reaction-who">{nameOf(r.playerId)}</span>
          </div>
        ))}
      </div>

      {paused ? (
        <Overlay label="Partida pausada">
          <p className="eyebrow">Partida pausada</p>
          <h2>⏸ Aguardando o anfitrião</h2>
          <div className="dil-result-actions">
            <Button variant="primary" onClick={() => send('RESUME_GAME', {})}>Continuar</Button>
            <Button variant="danger" onClick={() => send('END_GAME', {})}>Encerrar</Button>
          </div>
        </Overlay>
      ) : null}

      {over ? (
        <Overlay label="Fim da partida">
          <p className="eyebrow">Fim de Dilema nos Trilhos</p>
          <h2>🏆 {pub.winnerId ? nameOf(pub.winnerId) : '—'} — o mais poupado</h2>
          <ol className="dil-final-standings">
            {scoreRows.map((s, i) => (
              <li key={s.playerId}>
                <span className="dil-rank">{i + 1}º</span>
                <span className="dil-final-name">{s.name}</span>
                <span className="dil-final-score">poupado {s.score}×</span>
              </li>
            ))}
          </ol>
          <div className="dil-result-actions">
            <Button variant="primary" onClick={() => send('START_GAME', {})}>Nova partida</Button>
            <Button variant="danger" onClick={() => send('END_GAME', {})}>Encerrar</Button>
          </div>
        </Overlay>
      ) : null}

      <header className="dil-topbar">
        <div className="dil-brand">
          <BrandMark text="Dilema" size="md" />
          <span className="dil-brand-sub">
            Sala {pub.roomCode} · Rodada {pub.round}/{pub.totalRounds}
          </span>
          {!connected ? <span className="dil-conn-pill">reconectando…</span> : null}
        </div>
        <div className="dil-conductor">
          🎩 Maquinista: <strong>{pub.conductorName ?? '—'}</strong>
        </div>
        <Timer seconds={timerSeconds} active={pub.phase === 'playing' || pub.phase === 'verdict'} />
      </header>

      <div className="dil-body">
        <section className="dil-stage">
          {pub.phase === 'assigning' ? (
            <p className="dil-eyebrow dil-assign">
              🎩 <strong>{pub.conductorName}</strong> puxa a alavanca nesta rodada. Escolham os lados no celular…
            </p>
          ) : null}

          {pub.phase === 'playing' ? (
            <p className="dil-eyebrow">
              Inocente no seu trilho · culpado no inimigo · modificador em cima de uma carta —{' '}
              {pub.playersReadyCount}/{pub.playersExpectedCount} prontos
            </p>
          ) : null}

          {pub.phase === 'verdict' ? (
            <p className="dil-eyebrow dil-verdict">
              ⚖️ <strong>{pub.conductorName}</strong> decide qual trilho o trólebus atropela…
            </p>
          ) : null}

          {inResults ? (
            <p className="dil-eyebrow dil-result-line">
              {pub.verdictWasAuto ? '🪙 Tempo esgotado — ' : `🔧 ${pub.conductorName} escolheu — `}
              {pub.sparedTrack
                ? `${pub.sparedTrack === 'left' ? pub.tracks.left.label : pub.tracks.right.label} sobreviveu`
                : ''}
            </p>
          ) : null}

          <div className="dil-tracks">
            <TrackColumn track={pub.tracks.left} avatarOf={avatarOf} state={trackState('left')} />
            <div
              className={`dil-fork ${inResults && pub.killedTrack ? `is-crash-${pub.killedTrack}` : ''}`}
              aria-hidden="true"
            >
              <span className="dil-trolley">🚋</span>
            </div>
            <TrackColumn track={pub.tracks.right} avatarOf={avatarOf} state={trackState('right')} />
          </div>

          {inResults && !over ? (
            <RoundScoreboard
              title={`Rodada ${pub.round} de ${pub.totalRounds} · poupados`}
              standings={scoreRows}
              taunt={roundTaunt(scoreRows.map((s) => ({ name: s.name, score: s.score })), pub.round)}
              avatarFor={avatarOf}
            />
          ) : null}
        </section>

        <aside className="dil-side">
          <div className="dil-side-head">
            <h2>Poupados</h2>
            <span className="status-chip">{connected ? 'ao vivo' : 'offline'}</span>
          </div>
          <ol className="dil-standings">
            {scoreRows.map((s, i) => (
              <li key={s.playerId} className={s.playerId === pub.conductorId ? 'is-conductor' : ''}>
                <span className="dil-rank">{i + 1}º</span>
                {avatarOf(s.playerId) ? <Avatar spec={avatarOf(s.playerId)!} size={22} /> : null}
                <span className="dil-standings-name">
                  {s.name}
                  {s.playerId === pub.conductorId ? ' 🎩' : ''}
                </span>
                {s.roundPoints > 0 ? <span className="dil-standings-delta">+1</span> : null}
                <span className="dil-standings-score">{s.score}</span>
              </li>
            ))}
          </ol>
          {feed.length > 0 ? (
            <ul className="dil-feed" aria-live="polite">
              {feed.map((line) => (
                <li key={line.seq}>{line.text}</li>
              ))}
            </ul>
          ) : (
            <p className="hint">Aguardando…</p>
          )}
          <div className="dil-side-actions">
            <Button variant="ghost" onClick={() => send(paused ? 'RESUME_GAME' : 'PAUSE_GAME', {})}>
              {paused ? '▶ Continuar' : '⏸ Pausar'}
            </Button>
            <Button variant="danger" onClick={() => send('END_GAME', {})}>Encerrar</Button>
          </div>
          <button
            type="button"
            className="dil-sound-toggle"
            aria-pressed={soundOn}
            onClick={() => setSoundOn(sounds.toggle())}
          >
            {soundOn ? '🔊 Som ligado' : '🔇 Som desligado'}
          </button>
        </aside>
      </div>
    </main>
  );
}
