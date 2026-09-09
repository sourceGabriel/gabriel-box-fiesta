import { useEffect, useMemo, useRef, useState } from 'react';
import type { SabeTudoGameEvent, SabeTudoPublicState } from '@party/shared';
import { Avatar, BrandMark, Button, getSounds, Overlay, roundTaunt, Timer } from '@party/ui';
import type { HostGameViewProps } from '../types';
import { describeEvent } from './describeEvent';
import { soundForEvent } from './sound-map';
import './sabetudo-host.css';

const LETTERS = ['A', 'B', 'C', 'D'];

export function SabeTudoHostView({ publicState, events, players, connected, reactions, send }: HostGameViewProps) {
  const pub = publicState as SabeTudoPublicState;
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

  // Who has answered this question — from the event stream.
  const answeredIds = useMemo(() => {
    const set = new Set<string>();
    for (const be of events) {
      const ev = be.event as SabeTudoGameEvent;
      if (ev.type === 'question_started') set.clear();
      else if (ev.type === 'answer_submitted') set.add(ev.playerId);
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
      const name = soundForEvent(event as SabeTudoGameEvent);
      if (name) sounds.play(name);
    }
    const lines = freshRaw
      .map((e) => ({ seq: e.seq, text: describeEvent(e.event as SabeTudoGameEvent, nameOf) }))
      .filter((l): l is { seq: number; text: string } => l.text !== null);
    if (lines.length > 0) setFeed((cur) => [...cur, ...lines].slice(-9));
  }, [events, nameOf, sounds]);

  const paused = pub.phase === 'paused';
  const over = pub.phase === 'gameover';
  const inReveal = pub.phase === 'reveal' || over;
  const timerSeconds = pub.timer ? Math.max(0, Math.ceil(pub.timer.remainingMs / 1000)) : null;

  const standings = pub.standings.length
    ? pub.standings
    : [...pub.players]
        .map((p) => ({ playerId: p.id, name: p.name, score: p.score, roundPoints: 0, streak: 0 }))
        .sort((a, b) => b.score - a.score);

  const resultFor = (index: number) => pub.optionResults?.find((r) => r.index === index) ?? null;

  return (
    <main className="host-shell sabetudo-host">
      <div className="sabetudo-reactions" aria-hidden="true">
        {reactions.slice(-6).map((r) => (
          <div key={r.key} className="sabetudo-reaction-bubble">
            <span className="sabetudo-reaction-emoji">{r.reaction}</span>
            <span className="sabetudo-reaction-who">{nameOf(r.playerId)}</span>
          </div>
        ))}
      </div>

      {paused ? (
        <Overlay label="Partida pausada">
          <p className="eyebrow">Partida pausada</p>
          <h2>⏸ Aguardando o anfitrião</h2>
          <div className="sabetudo-result-actions">
            <Button variant="primary" onClick={() => send('RESUME_GAME', {})}>Continuar</Button>
            <Button variant="danger" onClick={() => send('END_GAME', {})}>Encerrar</Button>
          </div>
        </Overlay>
      ) : null}

      {over ? (
        <Overlay label="Fim da partida">
          <p className="eyebrow">Fim do Sabe-Tudo</p>
          <h2>🏆 {pub.winnerId ? nameOf(pub.winnerId) : '—'} venceu!</h2>
          <ol className="sabetudo-final-standings">
            {standings.map((s, i) => (
              <li key={s.playerId}>
                <span className="sabetudo-rank">{i + 1}º</span>
                <span className="sabetudo-final-name">{s.name}</span>
                <span className="sabetudo-final-score">{s.score}</span>
              </li>
            ))}
          </ol>
          <div className="sabetudo-result-actions">
            <Button variant="primary" onClick={() => send('START_GAME', {})}>Nova partida</Button>
            <Button variant="danger" onClick={() => send('END_GAME', {})}>Encerrar</Button>
          </div>
        </Overlay>
      ) : null}

      <header className="sabetudo-topbar">
        <div className="sabetudo-brand">
          <BrandMark text="Sabe-Tudo" size="md" />
          <span className="sabetudo-brand-sub">
            Sala {pub.roomCode} · Pergunta {pub.round}/{pub.totalRounds}
            {pub.category ? ` · ${pub.category}` : ''}
          </span>
          {!connected ? <span className="sabetudo-conn-pill">reconectando…</span> : null}
        </div>
        <Timer seconds={timerSeconds} active={pub.phase === 'question'} />
      </header>

      <div className="sabetudo-body">
        <section className="sabetudo-stage">
          {pub.question ? <p className="sabetudo-question">{pub.question}</p> : null}

          <ol className="sabetudo-options">
            {pub.options.map((opt, i) => {
              const res = resultFor(i);
              const state = inReveal
                ? res?.correct
                  ? 'is-correct'
                  : (res?.count ?? 0) > 0
                    ? 'is-wrong-picked'
                    : 'is-dim'
                : '';
              return (
                <li key={i} className={`sabetudo-option ${state}`}>
                  <span className="sabetudo-option-letter">{LETTERS[i]}</span>
                  <span className="sabetudo-option-text">{opt}</span>
                  {inReveal ? (
                    <span className="sabetudo-option-meta">
                      {res?.correct ? <span className="sabetudo-badge correct">✔ certa</span> : null}
                      {res && res.count > 0 ? (
                        <span className="sabetudo-pickers">{res.pickedBy.map((p) => p.name).join(', ')}</span>
                      ) : null}
                    </span>
                  ) : null}
                </li>
              );
            })}
          </ol>

          {inReveal && !over ? (() => {
            const taunt = roundTaunt(standings, pub.round);
            return taunt ? <p className="round-taunt">{taunt}</p> : null;
          })() : null}

          {pub.phase === 'question' ? (
            <div className="sabetudo-answering">
              <div className="sabetudo-progress">
                <div
                  className="sabetudo-progress-fill"
                  style={{
                    width: `${pub.answersExpectedCount ? (pub.answersInCount / pub.answersExpectedCount) * 100 : 0}%`,
                  }}
                />
              </div>
              <p className="sabetudo-count">{pub.answersInCount} / {pub.answersExpectedCount} responderam</p>
              <ul className="sabetudo-roster">
                {pub.players.map((p) => (
                  <li key={p.id} className={`sabetudo-roster-chip ${answeredIds.has(p.id) ? 'is-done' : ''}`}>
                    {avatarOf(p.id) ? <Avatar spec={avatarOf(p.id)!} size={22} /> : null}
                    <span>{p.name}</span>
                    <span>{answeredIds.has(p.id) ? '✅' : '⏳'}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </section>

        <aside className="sabetudo-side">
          <div className="sabetudo-side-head">
            <h2>Placar</h2>
            <span className="status-chip">{connected ? 'ao vivo' : 'offline'}</span>
          </div>
          <ol className="sabetudo-standings">
            {standings.map((s, i) => (
              <li key={s.playerId}>
                <span className="sabetudo-rank">{i + 1}º</span>
                {avatarOf(s.playerId) ? <Avatar spec={avatarOf(s.playerId)!} size={22} /> : null}
                <span className="sabetudo-standings-name">{s.name}</span>
                {s.streak >= 2 ? <span className="sabetudo-streak">🔥{s.streak}</span> : null}
                {s.roundPoints > 0 ? <span className="sabetudo-standings-delta">+{s.roundPoints}</span> : null}
                <span className="sabetudo-standings-score">{s.score}</span>
              </li>
            ))}
          </ol>
          {feed.length > 0 ? (
            <ul className="sabetudo-feed" aria-live="polite">
              {feed.map((line) => (
                <li key={line.seq}>{line.text}</li>
              ))}
            </ul>
          ) : (
            <p className="hint">Aguardando…</p>
          )}
          <div className="sabetudo-side-actions">
            <Button variant="ghost" onClick={() => send(paused ? 'RESUME_GAME' : 'PAUSE_GAME', {})}>
              {paused ? '▶ Continuar' : '⏸ Pausar'}
            </Button>
            <Button variant="danger" onClick={() => send('END_GAME', {})}>Encerrar</Button>
          </div>
          <button
            type="button"
            className="sabetudo-sound-toggle"
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
