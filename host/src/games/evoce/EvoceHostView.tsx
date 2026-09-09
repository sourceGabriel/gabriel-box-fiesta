import { useEffect, useMemo, useRef, useState } from 'react';
import type { EvoceGameEvent, EvocePublicState, EvoceSubmission } from '@party/shared';
import { Avatar, BrandMark, Button, DrawingView, getSounds, Overlay, RoundScoreboard, roundTaunt, Timer } from '@party/ui';
import type { HostGameViewProps } from '../types';
import { describeEvent } from './describeEvent';
import { soundForEvent } from './sound-map';
import './evoce-host.css';

const KIND_LABEL: Record<string, string> = {
  enquete: 'Enquete',
  legenda: 'Legenda',
  rabisco: 'Rabisco',
  final: 'A Obra-Prima',
};

export function EvoceHostView({ publicState, events, players, connected, reactions, send }: HostGameViewProps) {
  const pub = publicState as EvocePublicState;
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

  const answeredIds = useMemo(() => {
    const set = new Set<string>();
    for (const be of events) {
      const ev = be.event as EvoceGameEvent;
      if (ev.type === 'round_started') set.clear();
      else if (ev.type === 'player_answered') set.add(ev.playerId);
    }
    return set;
  }, [events]);
  const jokerIds = useMemo(() => {
    const set = new Set<string>();
    for (const be of events) {
      const ev = be.event as EvoceGameEvent;
      if (ev.type === 'round_started') set.clear();
      else if (ev.type === 'joker_played') set.add(ev.playerId);
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
    const fresh = events.filter((e) => e.seq > seenSeqRef.current);
    seenSeqRef.current = lastSeq;
    for (const { event } of fresh) {
      const name = soundForEvent(event as EvoceGameEvent);
      if (name) sounds.play(name);
    }
    const lines = fresh
      .map((e) => ({ seq: e.seq, text: describeEvent(e.event as EvoceGameEvent, nameOf) }))
      .filter((l): l is { seq: number; text: string } => l.text !== null);
    if (lines.length > 0) setFeed((cur) => [...cur, ...lines].slice(-9));
  }, [events, nameOf, sounds]);

  const paused = pub.phase === 'paused';
  const over = pub.phase === 'gameover';
  const inResults = pub.phase === 'roundResults' || over;
  const timerSeconds = pub.timer ? Math.max(0, Math.ceil(pub.timer.remainingMs / 1000)) : null;
  const isFinal = pub.roundKind === 'final';
  const isEnquete = pub.roundKind === 'enquete';

  const standings = pub.standings.length
    ? pub.standings
    : [...pub.players].map((p) => ({ playerId: p.id, name: p.name, score: p.score, roundPoints: 0 })).sort((a, b) => b.score - a.score);

  const roster = pub.players.filter((p) => !(pub.roundKind === 'rabisco' && p.id === pub.targetId));

  const SubmissionCard = ({ s, n }: { s: EvoceSubmission; n: number }) => (
    <li className={`evoce-sub ${s.isRoundWinner ? 'is-winner' : ''}`}>
      <span className="evoce-sub-n">{n}</span>
      {s.kind === 'drawing' ? (
        <div className="evoce-sub-draw"><DrawingView drawing={s.drawing} /></div>
      ) : (
        <span className="evoce-sub-text">{s.text}</span>
      )}
      {inResults ? (
        <span className="evoce-sub-meta">
          <span className="evoce-sub-author">{s.isRoundWinner ? '👑 ' : ''}{s.authorName ?? '—'}</span>
          <span className="evoce-sub-votes">
            {s.votes ?? 0} voto{(s.votes ?? 0) === 1 ? '' : 's'}
            {s.voterNames && s.voterNames.length > 0 ? ` · ${s.voterNames.join(', ')}` : ''}
          </span>
        </span>
      ) : null}
    </li>
  );

  return (
    <main className="host-shell evoce-host">
      <div className="evoce-reactions" aria-hidden="true">
        {reactions.slice(-6).map((r) => (
          <div key={r.key} className="evoce-reaction-bubble">
            <span className="evoce-reaction-emoji">{r.reaction}</span>
            <span className="evoce-reaction-who">{nameOf(r.playerId)}</span>
          </div>
        ))}
      </div>

      {paused ? (
        <Overlay label="Partida pausada">
          <p className="eyebrow">Partida pausada</p>
          <h2>⏸ Aguardando o anfitrião</h2>
          <div className="evoce-result-actions">
            <Button variant="primary" onClick={() => send('RESUME_GAME', {})}>Continuar</Button>
            <Button variant="danger" onClick={() => send('END_GAME', {})}>Encerrar</Button>
          </div>
        </Overlay>
      ) : null}

      {over ? (
        <Overlay label="Fim da partida">
          <p className="eyebrow">Fim do É Você!</p>
          <h2>🏆 {pub.winnerId ? nameOf(pub.winnerId) : '—'} venceu!</h2>
          <ol className="evoce-final-standings">
            {standings.map((s, i) => (
              <li key={s.playerId}>
                <span className="evoce-rank">{i + 1}º</span>
                <span className="evoce-final-name">{s.name}</span>
                <span className="evoce-final-score">{s.score}</span>
              </li>
            ))}
          </ol>
          <div className="evoce-result-actions">
            <Button variant="primary" onClick={() => send('START_GAME', {})}>Nova partida</Button>
            <Button variant="danger" onClick={() => send('END_GAME', {})}>Encerrar</Button>
          </div>
        </Overlay>
      ) : null}

      <header className="evoce-topbar">
        <div className="evoce-brand">
          <BrandMark text="É Você!" size="md" />
          <span className="evoce-brand-sub">
            Sala {pub.roomCode} · Rodada {pub.round}/{pub.totalRounds} · {KIND_LABEL[pub.roundKind] ?? pub.roundKind}
          </span>
          {!connected ? <span className="evoce-conn-pill">reconectando…</span> : null}
        </div>
        <Timer seconds={timerSeconds} active={pub.phase === 'answering' || pub.phase === 'voting'} />
      </header>

      <div className="evoce-body">
        <section className="evoce-stage">
          {pub.targetId && (pub.roundKind === 'legenda' || pub.roundKind === 'rabisco') ? (
            <div className="evoce-target">
              {avatarOf(pub.targetId) ? <Avatar spec={avatarOf(pub.targetId)!} size={pub.roundKind === 'rabisco' ? 96 : 40} /> : null}
              <span>{pub.targetName}</span>
            </div>
          ) : null}

          {pub.prompt ? <p className={`evoce-prompt ${isFinal ? 'is-final' : ''}`}>{pub.prompt}</p> : null}

          {/* answering */}
          {pub.phase === 'answering' ? (
            <div className="evoce-answering">
              <p className="evoce-eyebrow">
                {isEnquete ? 'Votem no celular' : pub.roundKind === 'legenda' ? 'Completem no celular' : '🎨 Desenhem no celular'}
                {isFinal ? ' — vale o dobro' : ''}
              </p>
              <div className="evoce-progress">
                <div className="evoce-progress-fill" style={{ width: `${pub.answersExpectedCount ? (pub.answersInCount / pub.answersExpectedCount) * 100 : 0}%` }} />
              </div>
              <p className="evoce-count">{pub.answersInCount} / {pub.answersExpectedCount}</p>
              <ul className="evoce-roster">
                {roster.map((p) => (
                  <li key={p.id} className={`evoce-roster-chip ${answeredIds.has(p.id) ? 'is-done' : ''}`}>
                    {avatarOf(p.id) ? <Avatar spec={avatarOf(p.id)!} size={22} /> : null}
                    <span>{p.name}</span>
                    {jokerIds.has(p.id) ? <span title="jogou Curinga">🃏</span> : null}
                    <span>{answeredIds.has(p.id) ? '✅' : isEnquete ? '🗳️' : '✍️'}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {/* voting (legenda/rabisco/final) */}
          {pub.phase === 'voting' ? (
            <div className="evoce-voting">
              <p className="evoce-eyebrow">Votem na melhor · no celular</p>
              <ol className={`evoce-subs ${pub.submissions[0]?.kind === 'drawing' ? 'is-grid' : ''}`}>
                {pub.submissions.map((s, i) => <SubmissionCard key={s.id} s={s} n={i + 1} />)}
              </ol>
              <p className="evoce-count">{pub.votesInCount} / {pub.votesExpectedCount} votos</p>
            </div>
          ) : null}

          {/* results — enquete */}
          {inResults && isEnquete && pub.pollBars ? (
            <div className="evoce-poll">
              <p className="evoce-eyebrow">
                {pub.pollWinnerId ? `👉 A galera aponta pra ${nameOf(pub.pollWinnerId)}` : 'Deu empate!'}
              </p>
              <ul className="evoce-poll-bars">
                {pub.pollBars.map((b) => {
                  const max = Math.max(1, ...pub.pollBars!.map((x) => x.count));
                  return (
                    <li key={b.playerId} className={b.playerId === pub.pollWinnerId ? 'is-top' : ''}>
                      {avatarOf(b.playerId) ? <Avatar spec={avatarOf(b.playerId)!} size={26} /> : null}
                      <span className="evoce-poll-name">{b.name}</span>
                      <span className="evoce-poll-track"><span style={{ width: `${(b.count / max) * 100}%` }} /></span>
                      <span className="evoce-poll-count">{b.count}</span>
                    </li>
                  );
                })}
              </ul>
            </div>
          ) : null}

          {/* results — legenda/rabisco/final */}
          {inResults && !isEnquete && pub.submissions.length > 0 ? (
            <div className="evoce-voting">
              <p className="evoce-eyebrow">
                {pub.roundWinnerId ? `👑 ${nameOf(pub.roundWinnerId)} levou a rodada` : 'Rodada empatada'}
              </p>
              <ol className={`evoce-subs ${pub.submissions[0]?.kind === 'drawing' ? 'is-grid' : ''}`}>
                {[...pub.submissions].sort((a, b) => (b.votes ?? 0) - (a.votes ?? 0)).map((s, i) => (
                  <SubmissionCard key={s.id} s={s} n={i + 1} />
                ))}
              </ol>
            </div>
          ) : null}

          {inResults && !over ? (
            <RoundScoreboard
              title={`Rodada ${pub.round} de ${pub.totalRounds}`}
              standings={standings}
              taunt={roundTaunt(standings, pub.round)}
              avatarFor={avatarOf}
            />
          ) : null}
        </section>

        <aside className="evoce-side">
          <div className="evoce-side-head">
            <h2>Placar</h2>
            <span className="status-chip">{connected ? 'ao vivo' : 'offline'}</span>
          </div>
          <ol className="evoce-standings">
            {standings.map((s, i) => {
              const jk = pub.players.find((p) => p.id === s.playerId)?.jokersLeft ?? 0;
              return (
                <li key={s.playerId}>
                  <span className="evoce-rank">{i + 1}º</span>
                  {avatarOf(s.playerId) ? <Avatar spec={avatarOf(s.playerId)!} size={22} /> : null}
                  <span className="evoce-standings-name">{s.name}</span>
                  <span className="evoce-jk">{'🃏'.repeat(jk)}</span>
                  {s.roundPoints > 0 ? <span className="evoce-standings-delta">+{s.roundPoints}</span> : null}
                  <span className="evoce-standings-score">{s.score}</span>
                </li>
              );
            })}
          </ol>
          {feed.length > 0 ? (
            <ul className="evoce-feed" aria-live="polite">{feed.map((l) => <li key={l.seq}>{l.text}</li>)}</ul>
          ) : (
            <p className="hint">Aguardando…</p>
          )}
          <div className="evoce-side-actions">
            <Button variant="ghost" onClick={() => send(paused ? 'RESUME_GAME' : 'PAUSE_GAME', {})}>
              {paused ? '▶ Continuar' : '⏸ Pausar'}
            </Button>
            <Button variant="danger" onClick={() => send('END_GAME', {})}>Encerrar</Button>
          </div>
          <button type="button" className="evoce-sound-toggle" aria-pressed={soundOn} onClick={() => setSoundOn(sounds.toggle())}>
            {soundOn ? '🔊 Som ligado' : '🔇 Som desligado'}
          </button>
        </aside>
      </div>
    </main>
  );
}
