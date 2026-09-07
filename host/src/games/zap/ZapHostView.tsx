import { useEffect, useMemo, useRef, useState } from 'react';
import type { ZapDuel, ZapGameEvent, ZapPublicState } from '@party/shared';
import { Avatar, BrandMark, Button, getSounds, Overlay, Timer } from '@party/ui';
import type { HostGameViewProps } from '../types';
import { describeEvent } from './describeEvent';
import { soundForEvent } from './sound-map';
import './zap-host.css';

const SLOT_TONE = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'] as const;

function AnswerCard({
  text,
  tone,
  authorName,
  votes,
  isWinner,
  isBlank,
  revealed,
}: {
  text: string;
  tone: string;
  authorName: string | null;
  votes: number | null;
  isWinner: boolean;
  isBlank: boolean;
  revealed: boolean;
}) {
  return (
    <div className={`zap-answer tone-${tone} ${isWinner ? 'is-winner' : ''} ${isBlank ? 'is-blank' : ''}`}>
      <p className="zap-answer-text">{text}</p>
      {revealed ? (
        <div className="zap-answer-foot">
          <span className="zap-answer-author">{authorName ?? '—'}</span>
          {votes !== null ? <span className="zap-answer-votes">{votes} voto{votes === 1 ? '' : 's'}</span> : null}
        </div>
      ) : null}
    </div>
  );
}

function DuelBoard({ duel, revealed }: { duel: ZapDuel; revealed: boolean }) {
  const result = duel.result;
  return (
    <div className={`zap-duel n-${duel.answers.length}`}>
      <p className="zap-duel-prompt">{duel.prompt}</p>
      <div className="zap-duel-answers">
        {duel.answers.map((a) => (
          <AnswerCard
            key={a.slot}
            text={a.text}
            tone={SLOT_TONE[a.slot % SLOT_TONE.length]}
            authorName={a.authorName}
            votes={result ? (result.votes[a.slot] ?? 0) : null}
            isWinner={!!result && result.winnerSlot === a.slot}
            isBlank={a.isBlank}
            revealed={revealed}
          />
        ))}
      </div>
      {result?.zap ? <div className="zap-burst">⚡ ZAP! ⚡</div> : null}
      {result && result.winnerSlot === null ? <div className="zap-tie">🤝 Empate</div> : null}
    </div>
  );
}

export function ZapHostView({ publicState, events, players, connected, reactions, send }: HostGameViewProps) {
  const pub = publicState as ZapPublicState;
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

  // Who has turned in every answer this round — derived from the event stream.
  const answeredIds = useMemo(() => {
    const need = pub.roundKind === 'final' ? 1 : 2;
    const counts = new Map<string, number>();
    for (const be of events) {
      const ev = be.event as ZapGameEvent;
      if (ev.type === 'round_started') counts.clear();
      else if (ev.type === 'answer_submitted') counts.set(ev.playerId, (counts.get(ev.playerId) ?? 0) + 1);
    }
    return new Set([...counts].filter(([, n]) => n >= need).map(([id]) => id));
  }, [events, pub.roundKind]);

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

    // Sound follows the raw events (and ignores reduced-motion).
    for (const { event } of freshRaw) {
      const name = soundForEvent(event as ZapGameEvent);
      if (name) sounds.play(name);
    }

    const lines = freshRaw
      .map((e) => ({ seq: e.seq, text: describeEvent(e.event as ZapGameEvent, nameOf) }))
      .filter((l): l is { seq: number; text: string } => l.text !== null);
    if (lines.length > 0) setFeed((cur) => [...cur, ...lines].slice(-9));
  }, [events, nameOf, sounds]);

  const paused = pub.phase === 'paused';
  const over = pub.phase === 'gameover';
  const timerSeconds = pub.timer ? Math.max(0, Math.ceil(pub.timer.remainingMs / 1000)) : null;
  const isFinal = pub.roundKind === 'final';
  const currentDuel = pub.duels.find((d) => d.index === pub.currentDuelIndex) ?? pub.duels[pub.duels.length - 1];

  const standings = pub.standings.length
    ? pub.standings
    : [...pub.players].map((p) => ({ playerId: p.id, name: p.name, score: p.score, roundPoints: 0 })).sort((a, b) => b.score - a.score);

  return (
    <main className="host-shell zap-host">
      <div className="zap-reactions" aria-hidden="true">
        {reactions.slice(-6).map((r) => (
          <div key={r.key} className="zap-reaction-bubble">
            <span className="zap-reaction-emoji">{r.reaction}</span>
            <span className="zap-reaction-who">{nameOf(r.playerId)}</span>
          </div>
        ))}
      </div>

      {paused ? (
        <Overlay label="Partida pausada">
          <p className="eyebrow">Partida pausada</p>
          <h2>⏸ Aguardando o anfitrião</h2>
          <div className="zap-result-actions">
            <Button variant="primary" onClick={() => send('RESUME_GAME', {})}>Continuar</Button>
            <Button variant="danger" onClick={() => send('END_GAME', {})}>Encerrar</Button>
          </div>
        </Overlay>
      ) : null}

      {over ? (
        <Overlay label="Fim da partida">
          <p className="eyebrow">Fim do Zap!</p>
          <h2>🏆 {pub.winnerId ? nameOf(pub.winnerId) : '—'} venceu!</h2>
          <ol className="zap-final-standings">
            {standings.map((s, i) => (
              <li key={s.playerId}>
                <span className="zap-rank">{i + 1}º</span>
                <span className="zap-final-name">{s.name}</span>
                <span className="zap-final-score">{s.score}</span>
              </li>
            ))}
          </ol>
          <div className="zap-result-actions">
            <Button variant="primary" onClick={() => send('START_GAME', {})}>Nova partida</Button>
            <Button variant="danger" onClick={() => send('END_GAME', {})}>Encerrar</Button>
          </div>
        </Overlay>
      ) : null}

      <header className="zap-topbar">
        <div className="zap-brand">
          <BrandMark text="Zap!" size="md" />
          <span className="zap-brand-sub">
            Sala {pub.roomCode} · {isFinal ? 'Última Chance' : `Rodada ${pub.round}/${pub.totalRounds}`}
          </span>
          {!connected ? <span className="zap-conn-pill">reconectando…</span> : null}
        </div>
        <Timer seconds={timerSeconds} active={pub.phase === 'voting'} />
      </header>

      <div className="zap-body">
        <section className="zap-stage">
          {pub.phase === 'answering' ? (
            <div className="zap-answering">
              <p className="zap-eyebrow">{isFinal ? '🔥 Última Chance — vale o triplo' : 'Escrevam no celular'}</p>
              {isFinal && pub.activePrompt ? (
                <p className="zap-prompt is-big">{pub.activePrompt}</p>
              ) : (
                <p className="zap-prompt">Cada jogador respondeu {isFinal ? '1 frase' : '2 frases'}…</p>
              )}
              <div className="zap-progress">
                <div
                  className="zap-progress-fill"
                  style={{
                    width: `${pub.answersExpectedCount ? (pub.answersInCount / pub.answersExpectedCount) * 100 : 0}%`,
                  }}
                />
              </div>
              <p className="zap-count">{pub.answersInCount} / {pub.answersExpectedCount} respostas</p>
              <ul className="zap-roster">
                {pub.players.map((p) => (
                  <li key={p.id} className={`zap-roster-chip ${answeredIds.has(p.id) ? 'is-done' : ''}`}>
                    {avatarOf(p.id) ? <Avatar spec={avatarOf(p.id)!} size={22} /> : null}
                    <span>{p.name}</span>
                    <span className="zap-roster-mark">{answeredIds.has(p.id) ? '✅' : '✍️'}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {pub.phase === 'voting' && currentDuel ? (
            <div className="zap-voting">
              <p className="zap-eyebrow">
                {isFinal ? 'Votem na melhor' : `Duelo ${pub.currentDuelIndex + 1} de ${pub.round === pub.totalRounds ? 1 : pub.players.length}`}
                {' '}· votem no celular
              </p>
              <DuelBoard duel={currentDuel} revealed={false} />
              <p className="zap-count">{pub.votesInCount} / {pub.votesExpectedCount} votos</p>
            </div>
          ) : null}

          {(pub.phase === 'roundResults' || over) && pub.duels.length > 0 ? (
            <div className="zap-results">
              <p className="zap-eyebrow">{isFinal ? 'Resultado da Última Chance' : `Resultado da rodada ${pub.round}`}</p>
              <div className="zap-results-grid">
                {pub.duels.map((d) => (
                  <DuelBoard key={d.index} duel={d} revealed />
                ))}
              </div>
            </div>
          ) : null}

          {pub.phase === 'roundResults' && pub.duels.length === 0 ? (
            <p className="zap-prompt">Ninguém respondeu… próxima rodada!</p>
          ) : null}
        </section>

        <aside className="zap-side">
          <div className="zap-side-head">
            <h2>Placar</h2>
            <span className="status-chip">{connected ? 'ao vivo' : 'offline'}</span>
          </div>
          <ol className="zap-standings">
            {standings.map((s, i) => (
              <li key={s.playerId}>
                <span className="zap-rank">{i + 1}º</span>
                {avatarOf(s.playerId) ? <Avatar spec={avatarOf(s.playerId)!} size={22} /> : null}
                <span className="zap-standings-name">{s.name}</span>
                {s.roundPoints > 0 ? <span className="zap-standings-delta">+{s.roundPoints}</span> : null}
                <span className="zap-standings-score">{s.score}</span>
              </li>
            ))}
          </ol>
          {feed.length > 0 ? (
            <ul className="zap-feed" aria-live="polite">
              {feed.map((line) => (
                <li key={line.seq}>{line.text}</li>
              ))}
            </ul>
          ) : (
            <p className="hint">Aguardando…</p>
          )}
          <div className="zap-side-actions">
            <Button variant="ghost" onClick={() => send(paused ? 'RESUME_GAME' : 'PAUSE_GAME', {})}>
              {paused ? '▶ Continuar' : '⏸ Pausar'}
            </Button>
            <Button variant="danger" onClick={() => send('END_GAME', {})}>Encerrar</Button>
          </div>
          <button
            type="button"
            className="zap-sound-toggle"
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
