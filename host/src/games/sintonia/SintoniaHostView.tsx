import { useEffect, useMemo, useRef, useState } from 'react';
import type { SintoniaGameEvent, SintoniaPublicState } from '@party/shared';
import { Avatar, BrandMark, Button, getSounds, Overlay, RoundScoreboard, roundTaunt, Timer, VictorySplash } from '@party/ui';
import type { HostGameViewProps } from '../types';
import { describeEvent } from './describeEvent';
import { soundForEvent } from './sound-map';
import { SintoniaDial } from './SintoniaDial';
import './sintonia-host.css';

export function SintoniaHostView({ publicState, events, players, connected, reactions, send }: HostGameViewProps) {
  const pub = publicState as SintoniaPublicState;
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
      const spec = soundForEvent(event as SintoniaGameEvent);
      if (spec) sounds.play(spec);
    }
    const lines = fresh
      .map((e) => ({ seq: e.seq, text: describeEvent(e.event as SintoniaGameEvent, nameOf) }))
      .filter((l): l is { seq: number; text: string } => l.text !== null);
    if (lines.length > 0) setFeed((cur) => [...cur, ...lines].slice(-9));
  }, [events, nameOf, sounds]);

  const paused = pub.phase === 'paused';
  const over = pub.phase === 'gameover';
  const inReveal = pub.phase === 'reveal' || over;
  const timerSeconds = pub.timer ? Math.max(0, Math.ceil(pub.timer.remainingMs / 1000)) : null;

  const scoreRows = useMemo(
    () =>
      pub.standings.map((s) => ({
        playerId: s.playerId,
        name: s.name,
        score: s.score,
        roundPoints: s.roundDelta,
      })),
    [pub.standings],
  );

  const bestResult = pub.results[0] ?? null;

  return (
    <main className="host-shell sintonia-host">
      <div className="sint-reactions" aria-hidden="true">
        {reactions.slice(-6).map((r) => (
          <div key={r.key} className="sint-reaction-bubble">
            <span className="sint-reaction-emoji">{r.reaction}</span>
            <span className="sint-reaction-who">{nameOf(r.playerId)}</span>
          </div>
        ))}
      </div>

      {paused ? (
        <Overlay label="Partida pausada">
          <p className="eyebrow">Partida pausada</p>
          <h2>⏸ Aguardando o anfitrião</h2>
          <div className="sint-result-actions">
            <Button variant="primary" onClick={() => send('RESUME_GAME', {})}>Continuar</Button>
            <Button variant="danger" onClick={() => send('END_GAME', {})}>Encerrar</Button>
          </div>
        </Overlay>
      ) : null}

      {over ? (
        <Overlay label="Fim da partida">
          <p className="eyebrow">Fim de Sintonia</p>
          {pub.winnerId === null ? (
            <h2>🤝 Empate!</h2>
          ) : (
            <VictorySplash
              winner={{ name: pub.winnerName ?? nameOf(pub.winnerId), avatar: avatarOf(pub.winnerId) }}
              subtitle="mais em sintonia"
              accent="#2dd4bf"
            />
          )}
          <ol className="sint-final-standings">
            {scoreRows.map((s, i) => (
              <li key={s.playerId}>
                <span className="sint-final-name">{i + 1}º {s.name}</span>
                <span className="sint-final-score">{s.score} pts</span>
              </li>
            ))}
          </ol>
          <div className="sint-result-actions">
            <Button variant="primary" onClick={() => send('START_GAME', {})}>Nova partida</Button>
            <Button variant="danger" onClick={() => send('END_GAME', {})}>Encerrar</Button>
          </div>
        </Overlay>
      ) : null}

      <header className="sint-topbar">
        <div className="sint-brand">
          <BrandMark text="Sintonia" size="md" />
          <span className="sint-brand-sub">
            Sala {pub.roomCode} · Rodada {pub.round}/{pub.totalRounds}
          </span>
          {!connected ? <span className="sint-conn-pill">reconectando…</span> : null}
        </div>
        <div className="sint-medium">
          🔮 Médium: <strong>{pub.mediumName ?? '—'}</strong>
        </div>
        <Timer seconds={timerSeconds} active={pub.phase === 'cluing' || pub.phase === 'guessing'} />
      </header>

      <div className="sint-body">
        <section className="sint-stage">
          {pub.phase === 'cluing' ? (
            <p className="sint-eyebrow sint-cluing">
              🔮 <strong>{pub.mediumName}</strong> está escolhendo a dica no celular…
            </p>
          ) : null}

          {pub.phase === 'guessing' && pub.clue ? <p className="sint-clue">“{pub.clue}”</p> : null}

          {inReveal ? (
            <p className="sint-eyebrow sint-result-line">
              {pub.roundSkipped
                ? '⌛ Sem dica nesta rodada'
                : bestResult && bestResult.points > 0
                  ? `🎯 ${bestResult.name} chegou mais perto — +${bestResult.points} · médium +${pub.mediumPoints ?? 0}`
                  : '🎯 Ninguém chegou perto'}
            </p>
          ) : null}

          <div className="sint-dial-wrap">
            <SintoniaDial results={pub.results} target={pub.target} revealed={inReveal} />
            <div className="sint-poles">
              <span>◀ {pub.spectrum[0]}</span>
              <span>{pub.spectrum[1]} ▶</span>
            </div>
          </div>

          {pub.phase === 'guessing' ? (
            <>
              <p className="sint-eyebrow">
                Cada um puxa o próprio ponteiro — {pub.guessersLockedCount}/{pub.guessersTotalCount} travaram
              </p>
              <ul className="sint-lock-chips" aria-label="Quem travou">
                {pub.guesses.map((g) => (
                  <li key={g.playerId} className={g.locked ? 'is-locked' : ''}>
                    {g.locked ? '🔒' : '⋯'} {g.name}
                  </li>
                ))}
              </ul>
            </>
          ) : null}

          {inReveal && !over ? (
            <RoundScoreboard
              title={`Rodada ${pub.round} de ${pub.totalRounds}`}
              standings={scoreRows}
              taunt={roundTaunt(scoreRows.map((s) => ({ name: s.name, score: s.score })), pub.round)}
              avatarFor={avatarOf}
            />
          ) : null}
        </section>

        <aside className="sint-side">
          <div className="sint-side-head">
            <h2>Placar</h2>
            <span className="status-chip">{connected ? 'ao vivo' : 'offline'}</span>
          </div>
          <ol className="sint-roster">
            {pub.standings.map((s, i) => (
              <li key={s.playerId} className={s.playerId === pub.mediumId ? 'is-medium' : ''}>
                <span className="sint-rank">{i + 1}º</span>
                {avatarOf(s.playerId) ? <Avatar spec={avatarOf(s.playerId)!} size={22} /> : null}
                <span className="sint-roster-name">
                  {s.name}
                  {s.playerId === pub.mediumId ? ' 🔮' : ''}
                </span>
                {inReveal && s.roundDelta > 0 ? <span className="sint-roster-delta">+{s.roundDelta}</span> : null}
                <span className="sint-roster-score">{s.score}</span>
              </li>
            ))}
          </ol>
          {feed.length > 0 ? (
            <ul className="sint-feed" aria-live="polite">
              {feed.map((line) => (
                <li key={line.seq}>{line.text}</li>
              ))}
            </ul>
          ) : (
            <p className="hint">Aguardando…</p>
          )}
          <div className="sint-side-actions">
            <Button variant="ghost" onClick={() => send(paused ? 'RESUME_GAME' : 'PAUSE_GAME', {})}>
              {paused ? '▶ Continuar' : '⏸ Pausar'}
            </Button>
            <Button variant="danger" onClick={() => send('END_GAME', {})}>Encerrar</Button>
          </div>
          <button
            type="button"
            className="sint-sound-toggle"
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
