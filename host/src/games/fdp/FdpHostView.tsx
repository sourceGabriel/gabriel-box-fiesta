import { useEffect, useMemo, useRef, useState } from 'react';
import type { FdpAnswer, FdpGameEvent, FdpPublicState } from '@party/shared';
import { Avatar, BrandMark, Button, getSounds, Overlay, RoundScoreboard, roundTaunt, Timer } from '@party/ui';
import type { HostGameViewProps } from '../types';
import { describeEvent } from './describeEvent';
import { soundForEvent } from './sound-map';
import './fdp-host.css';

function AnswerRow({ answer, revealed }: { answer: FdpAnswer; revealed: boolean }) {
  return (
    <li className={`fdp-answer ${answer.isRoundWinner ? 'is-winner' : ''} ${answer.sweptVotes ? 'is-sweep' : ''}`}>
      <span className="fdp-answer-text">{answer.text}</span>
      {revealed ? (
        <span className="fdp-answer-meta">
          <span className="fdp-answer-author">
            {answer.isRoundWinner ? '👑 ' : ''}
            {answer.authorName ?? '—'}
            {answer.sweptVotes ? ' · FDP!' : ''}
          </span>
          <span className="fdp-answer-votes">
            {answer.votes ?? 0} voto{(answer.votes ?? 0) === 1 ? '' : 's'}
            {answer.voterNames && answer.voterNames.length > 0 ? ` · ${answer.voterNames.join(', ')}` : ''}
          </span>
        </span>
      ) : null}
    </li>
  );
}

export function FdpHostView({ publicState, events, players, connected, reactions, send }: HostGameViewProps) {
  const pub = publicState as FdpPublicState;
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

  // Who has turned in their answer this round — from the event stream.
  const answeredIds = useMemo(() => {
    const set = new Set<string>();
    for (const be of events) {
      const ev = be.event as FdpGameEvent;
      if (ev.type === 'round_started') set.clear();
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
      const name = soundForEvent(event as FdpGameEvent);
      if (name) sounds.play(name);
    }
    const lines = freshRaw
      .map((e) => ({ seq: e.seq, text: describeEvent(e.event as FdpGameEvent, nameOf) }))
      .filter((l): l is { seq: number; text: string } => l.text !== null);
    if (lines.length > 0) setFeed((cur) => [...cur, ...lines].slice(-9));
  }, [events, nameOf, sounds]);

  const paused = pub.phase === 'paused';
  const over = pub.phase === 'gameover';
  const inResults = pub.phase === 'roundResults' || over;
  const timerSeconds = pub.timer ? Math.max(0, Math.ceil(pub.timer.remainingMs / 1000)) : null;
  const isFinal = pub.roundKind === 'final';

  const standings = pub.standings.length
    ? pub.standings
    : [...pub.players]
        .map((p) => ({ playerId: p.id, name: p.name, score: p.score, roundPoints: 0 }))
        .sort((a, b) => b.score - a.score);

  return (
    <main className="host-shell fdp-host">
      <div className="fdp-reactions" aria-hidden="true">
        {reactions.slice(-6).map((r) => (
          <div key={r.key} className="fdp-reaction-bubble">
            <span className="fdp-reaction-emoji">{r.reaction}</span>
            <span className="fdp-reaction-who">{nameOf(r.playerId)}</span>
          </div>
        ))}
      </div>

      {paused ? (
        <Overlay label="Partida pausada">
          <p className="eyebrow">Partida pausada</p>
          <h2>⏸ Aguardando o anfitrião</h2>
          <div className="fdp-result-actions">
            <Button variant="primary" onClick={() => send('RESUME_GAME', {})}>Continuar</Button>
            <Button variant="danger" onClick={() => send('END_GAME', {})}>Encerrar</Button>
          </div>
        </Overlay>
      ) : null}

      {over ? (
        <Overlay label="Fim da partida">
          <p className="eyebrow">Fim do FDP</p>
          <h2>🏆 {pub.winnerId ? nameOf(pub.winnerId) : '—'} venceu!</h2>
          <ol className="fdp-final-standings">
            {standings.map((s, i) => (
              <li key={s.playerId}>
                <span className="fdp-rank">{i + 1}º</span>
                <span className="fdp-final-name">{s.name}</span>
                <span className="fdp-final-score">{s.score}</span>
              </li>
            ))}
          </ol>
          <div className="fdp-result-actions">
            <Button variant="primary" onClick={() => send('START_GAME', {})}>Nova partida</Button>
            <Button variant="danger" onClick={() => send('END_GAME', {})}>Encerrar</Button>
          </div>
        </Overlay>
      ) : null}

      <header className="fdp-topbar">
        <div className="fdp-brand">
          <BrandMark text="FDP" size="md" />
          <span className="fdp-brand-sub">
            Sala {pub.roomCode} · {isFinal ? 'Final FDP' : `Rodada ${pub.round}/${pub.totalRounds}`}
          </span>
          {!connected ? <span className="fdp-conn-pill">reconectando…</span> : null}
        </div>
        <Timer seconds={timerSeconds} active={pub.phase === 'writing' || pub.phase === 'voting'} />
      </header>

      <div className="fdp-body">
        <section className="fdp-stage">
          {pub.prompt ? (
            <p className={`fdp-prompt ${isFinal ? 'is-final' : ''}`}>{pub.prompt}</p>
          ) : null}

          {pub.phase === 'writing' ? (
            <div className="fdp-writing">
              <p className="fdp-eyebrow">{isFinal ? '🔥 Final FDP — vale o dobro' : 'Completem no celular'}</p>
              <div className="fdp-progress">
                <div
                  className="fdp-progress-fill"
                  style={{ width: `${pub.answersExpectedCount ? (pub.answersInCount / pub.answersExpectedCount) * 100 : 0}%` }}
                />
              </div>
              <p className="fdp-count">{pub.answersInCount} / {pub.answersExpectedCount} respostas</p>
              <ul className="fdp-roster">
                {pub.players.map((p) => (
                  <li key={p.id} className={`fdp-roster-chip ${answeredIds.has(p.id) ? 'is-done' : ''}`}>
                    {avatarOf(p.id) ? <Avatar spec={avatarOf(p.id)!} size={22} /> : null}
                    <span>{p.name}</span>
                    <span>{answeredIds.has(p.id) ? '✅' : '✍️'}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {pub.phase === 'voting' ? (
            <div className="fdp-voting">
              <p className="fdp-eyebrow">Votem na melhor · no celular</p>
              <ol className="fdp-answers">
                {pub.answers.map((a) => (
                  <AnswerRow key={a.id} answer={a} revealed={false} />
                ))}
              </ol>
              <p className="fdp-count">{pub.votesInCount} / {pub.votesExpectedCount} votos</p>
            </div>
          ) : null}

          {inResults && pub.answers.length > 0 ? (
            <div className="fdp-results">
              <p className="fdp-eyebrow">
                {pub.roundWinnerId ? `👑 ${nameOf(pub.roundWinnerId)} levou a rodada` : 'Rodada empatada'}
              </p>
              <ol className="fdp-answers">
                {[...pub.answers]
                  .sort((a, b) => (b.votes ?? 0) - (a.votes ?? 0))
                  .map((a) => (
                    <AnswerRow key={a.id} answer={a} revealed />
                  ))}
              </ol>
            </div>
          ) : null}

          {inResults && pub.answers.length === 0 ? (
            <p className="fdp-eyebrow">Ninguém respondeu essa 😬</p>
          ) : null}

          {inResults && !over ? (
            <RoundScoreboard
              title={isFinal ? 'Final FDP' : `Rodada ${pub.round} de ${pub.totalRounds}`}
              standings={standings}
              taunt={roundTaunt(standings, pub.round)}
              avatarFor={avatarOf}
            />
          ) : null}
        </section>

        <aside className="fdp-side">
          <div className="fdp-side-head">
            <h2>Placar</h2>
            <span className="status-chip">{connected ? 'ao vivo' : 'offline'}</span>
          </div>
          <ol className="fdp-standings">
            {standings.map((s, i) => (
              <li key={s.playerId}>
                <span className="fdp-rank">{i + 1}º</span>
                {avatarOf(s.playerId) ? <Avatar spec={avatarOf(s.playerId)!} size={22} /> : null}
                <span className="fdp-standings-name">{s.name}</span>
                {s.roundPoints > 0 ? <span className="fdp-standings-delta">+{s.roundPoints}</span> : null}
                <span className="fdp-standings-score">{s.score}</span>
              </li>
            ))}
          </ol>
          {feed.length > 0 ? (
            <ul className="fdp-feed" aria-live="polite">
              {feed.map((line) => (
                <li key={line.seq}>{line.text}</li>
              ))}
            </ul>
          ) : (
            <p className="hint">Aguardando…</p>
          )}
          <div className="fdp-side-actions">
            <Button variant="ghost" onClick={() => send(paused ? 'RESUME_GAME' : 'PAUSE_GAME', {})}>
              {paused ? '▶ Continuar' : '⏸ Pausar'}
            </Button>
            <Button variant="danger" onClick={() => send('END_GAME', {})}>Encerrar</Button>
          </div>
          <button
            type="button"
            className="fdp-sound-toggle"
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
