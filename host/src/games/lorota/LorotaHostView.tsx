import { useEffect, useMemo, useRef, useState } from 'react';
import type { LorotaGameEvent, LorotaOption, LorotaPublicState } from '@party/shared';
import { Avatar, BrandMark, Button, getSounds, Overlay, roundTaunt, Timer } from '@party/ui';
import type { HostGameViewProps } from '../types';
import { describeEvent } from './describeEvent';
import { soundForEvent } from './sound-map';
import './lorota-host.css';

function OptionRow({ option, revealed }: { option: LorotaOption; revealed: boolean }) {
  const truth = revealed && option.isTruth;
  const fooled = revealed && !option.isTruth && (option.pickedBy?.length ?? 0) > 0;
  return (
    <li className={`lorota-option ${truth ? 'is-truth' : ''} ${fooled ? 'is-fooled' : ''}`}>
      <span className="lorota-option-text">{option.text}</span>
      {revealed ? (
        <span className="lorota-option-meta">
          {option.isTruth ? (
            <span className="lorota-badge truth">✅ VERDADE</span>
          ) : option.authorNames && option.authorNames.length > 0 ? (
            <span className="lorota-badge lie">mentira de {option.authorNames.join(' + ')}</span>
          ) : null}
          {option.pickedBy && option.pickedBy.length > 0 ? (
            <span className="lorota-picked">{option.pickedBy.map((p) => p.name).join(', ')}</span>
          ) : (
            <span className="lorota-picked none">ninguém</span>
          )}
        </span>
      ) : null}
    </li>
  );
}

export function LorotaHostView({ publicState, events, players, connected, reactions, send }: HostGameViewProps) {
  const pub = publicState as LorotaPublicState;
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

  // Who has turned in their lie this round — from the event stream.
  const liedIds = useMemo(() => {
    const set = new Set<string>();
    for (const be of events) {
      const ev = be.event as LorotaGameEvent;
      if (ev.type === 'round_started') set.clear();
      else if (ev.type === 'lie_submitted') set.add(ev.playerId);
    }
    return set;
  }, [events]);

  useEffect(() => {
    if (events.length === 0) {
      seenSeqRef.current = 0;
      setFeed([]);
      return;
    }
    const lastSeq = events[events.length - 1].seq;
    if (lastSeq <= seenSeqRef.current) return;
    const freshRaw = events.filter((e) => e.seq > seenSeqRef.current);
    seenSeqRef.current = lastSeq;
    for (const { event } of freshRaw) {
      const name = soundForEvent(event as LorotaGameEvent);
      if (name) sounds.play(name);
    }
    const lines = freshRaw
      .map((e) => ({ seq: e.seq, text: describeEvent(e.event as LorotaGameEvent, nameOf) }))
      .filter((l): l is { seq: number; text: string } => l.text !== null);
    if (lines.length > 0) setFeed((cur) => [...cur, ...lines].slice(-9));
  }, [events, nameOf, sounds]);

  const paused = pub.phase === 'paused';
  const over = pub.phase === 'gameover';
  const inReveal = pub.phase === 'reveal' || over;
  const timerSeconds = pub.timer ? Math.max(0, Math.ceil(pub.timer.remainingMs / 1000)) : null;
  const isFinal = pub.roundKind === 'final';

  const standings = pub.standings.length
    ? pub.standings
    : [...pub.players]
        .map((p) => ({ playerId: p.id, name: p.name, score: p.score, roundPoints: 0 }))
        .sort((a, b) => b.score - a.score);

  return (
    <main className="host-shell lorota-host">
      <div className="lorota-reactions" aria-hidden="true">
        {reactions.slice(-6).map((r) => (
          <div key={r.key} className="lorota-reaction-bubble">
            <span className="lorota-reaction-emoji">{r.reaction}</span>
            <span className="lorota-reaction-who">{nameOf(r.playerId)}</span>
          </div>
        ))}
      </div>

      {paused ? (
        <Overlay label="Partida pausada">
          <p className="eyebrow">Partida pausada</p>
          <h2>⏸ Aguardando o anfitrião</h2>
          <div className="lorota-result-actions">
            <Button variant="primary" onClick={() => send('RESUME_GAME', {})}>Continuar</Button>
            <Button variant="danger" onClick={() => send('END_GAME', {})}>Encerrar</Button>
          </div>
        </Overlay>
      ) : null}

      {over ? (
        <Overlay label="Fim da partida">
          <p className="eyebrow">Fim da Lorota!</p>
          <h2>🏆 {pub.winnerId ? nameOf(pub.winnerId) : '—'} venceu!</h2>
          <ol className="lorota-final-standings">
            {standings.map((s, i) => (
              <li key={s.playerId}>
                <span className="lorota-rank">{i + 1}º</span>
                <span className="lorota-final-name">{s.name}</span>
                <span className="lorota-final-score">{s.score}</span>
              </li>
            ))}
          </ol>
          <div className="lorota-result-actions">
            <Button variant="primary" onClick={() => send('START_GAME', {})}>Nova partida</Button>
            <Button variant="danger" onClick={() => send('END_GAME', {})}>Encerrar</Button>
          </div>
        </Overlay>
      ) : null}

      <header className="lorota-topbar">
        <div className="lorota-brand">
          <BrandMark text="Lorota!" size="md" />
          <span className="lorota-brand-sub">
            Sala {pub.roomCode} · {isFinal ? 'Lorota Final' : `Rodada ${pub.round}/${pub.totalRounds}`}
          </span>
          {!connected ? <span className="lorota-conn-pill">reconectando…</span> : null}
        </div>
        <Timer seconds={timerSeconds} active={pub.phase === 'guessing' || pub.phase === 'lying'} />
      </header>

      <div className="lorota-body">
        <section className="lorota-stage">
          {pub.prompt ? (
            <p className={`lorota-prompt ${isFinal ? 'is-final' : ''}`}>{pub.prompt}</p>
          ) : null}

          {pub.phase === 'lying' ? (
            <div className="lorota-lying">
              <p className="lorota-eyebrow">{isFinal ? '🔥 Lorota Final — vale o dobro' : 'Inventem no celular'}</p>
              <div className="lorota-progress">
                <div
                  className="lorota-progress-fill"
                  style={{ width: `${pub.liesExpectedCount ? (pub.liesInCount / pub.liesExpectedCount) * 100 : 0}%` }}
                />
              </div>
              <p className="lorota-count">{pub.liesInCount} / {pub.liesExpectedCount} mentiras</p>
              <ul className="lorota-roster">
                {pub.players.map((p) => (
                  <li key={p.id} className={`lorota-roster-chip ${liedIds.has(p.id) ? 'is-done' : ''}`}>
                    {avatarOf(p.id) ? <Avatar spec={avatarOf(p.id)!} size={22} /> : null}
                    <span>{p.name}</span>
                    <span>{liedIds.has(p.id) ? '✅' : '✍️'}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {pub.phase === 'guessing' ? (
            <div className="lorota-guessing">
              <p className="lorota-eyebrow">Achem a verdade · votem no celular</p>
              <ol className="lorota-options">
                {pub.options.map((o) => (
                  <OptionRow key={o.id} option={o} revealed={false} />
                ))}
              </ol>
              <p className="lorota-count">{pub.guessesInCount} / {pub.guessesExpectedCount} palpites</p>
            </div>
          ) : null}

          {inReveal && pub.options.length > 0 ? (
            <div className="lorota-reveal">
              <p className="lorota-eyebrow">A verdade era: <strong>{pub.truthText}</strong></p>
              <ol className="lorota-options">
                {pub.options.map((o) => (
                  <OptionRow key={o.id} option={o} revealed />
                ))}
              </ol>
            </div>
          ) : null}

          {inReveal && !over ? (() => {
            const taunt = roundTaunt(standings, pub.round);
            return taunt ? <p className="round-taunt">{taunt}</p> : null;
          })() : null}
        </section>

        <aside className="lorota-side">
          <div className="lorota-side-head">
            <h2>Placar</h2>
            <span className="status-chip">{connected ? 'ao vivo' : 'offline'}</span>
          </div>
          <ol className="lorota-standings">
            {standings.map((s, i) => (
              <li key={s.playerId}>
                <span className="lorota-rank">{i + 1}º</span>
                {avatarOf(s.playerId) ? <Avatar spec={avatarOf(s.playerId)!} size={22} /> : null}
                <span className="lorota-standings-name">{s.name}</span>
                {s.roundPoints > 0 ? <span className="lorota-standings-delta">+{s.roundPoints}</span> : null}
                <span className="lorota-standings-score">{s.score}</span>
              </li>
            ))}
          </ol>
          {feed.length > 0 ? (
            <ul className="lorota-feed" aria-live="polite">
              {feed.map((line) => (
                <li key={line.seq}>{line.text}</li>
              ))}
            </ul>
          ) : (
            <p className="hint">Aguardando…</p>
          )}
          <div className="lorota-side-actions">
            <Button variant="ghost" onClick={() => send(paused ? 'RESUME_GAME' : 'PAUSE_GAME', {})}>
              {paused ? '▶ Continuar' : '⏸ Pausar'}
            </Button>
            <Button variant="danger" onClick={() => send('END_GAME', {})}>Encerrar</Button>
          </div>
          <button
            type="button"
            className="lorota-sound-toggle"
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
