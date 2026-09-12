import { useEffect, useMemo, useRef, useState } from 'react';
import type { SabeTudoGameEvent, SabeTudoPublicState } from '@party/shared';
import {
  Avatar,
  Broadcast,
  BrandMark,
  Button,
  ContestantStrip,
  getSounds,
  HostStage,
  Moment,
  Overlay,
  RoundScoreboard,
  roundTaunt,
  Timer,
  useStageDirector,
  VictorySplash,
  type HostScene,
} from '@party/ui';
import type { HostGameViewProps } from '../types';
import { broadcastFor, letterFor } from './describeEvent';
import { soundForEvent } from './sound-map';
import { sabeTudoTheme } from './theme';
import './sabetudo-host.css';

const ACCENT = sabeTudoTheme.accent;
const LETTERS = ['A', 'B', 'C', 'D'];

const SCENE_FOR: Record<string, HostScene> = {
  question: 'thinking',
  reveal: 'reveal',
  gameover: 'victory',
};

export function SabeTudoHostView({ publicState, events, players, connected, reactions, send }: HostGameViewProps) {
  const pub = publicState as SabeTudoPublicState;
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

  const paused = pub.phase === 'paused';
  const over = pub.phase === 'gameover';
  const timerSeconds = pub.timer ? Math.max(0, Math.ceil(pub.timer.remainingMs / 1000)) : null;
  const scene: HostScene = SCENE_FOR[pub.phase] ?? 'thinking';

  const stage = useStageDirector({
    events,
    scene,
    broadcastFor: (e) => broadcastFor(e as SabeTudoGameEvent, nameOf),
    nameFor: nameOf,
    avatarFor: avatarOf,
  });
  const { enqueueMoment } = stage;

  const seenSeq = useRef(0);
  useEffect(() => {
    if (events.length === 0) { seenSeq.current = 0; return; }
    const last = events[events.length - 1].seq;
    if (last <= seenSeq.current) return;
    for (const { seq, event } of events) {
      if (seq <= seenSeq.current) continue;
      const name = soundForEvent(event as SabeTudoGameEvent);
      if (name) sounds.play(name);
    }
    seenSeq.current = last;
  }, [events, sounds]);

  // reveal fires the correct answer, then spotlights a hot streak (3+ in a row)
  useEffect(() => {
    if (pub.phase !== 'reveal' || pub.correctIndex === null) return;
    enqueueMoment({
      id: `r${pub.round}-correct`,
      priority: 10,
      moment: { type: 'reveal', eyebrow: 'A resposta certa era a', title: `${letterFor(pub.correctIndex)} — ${pub.options[pub.correctIndex] ?? ''}`, accent: ACCENT },
    });
    const onFire = pub.standings.find((s) => s.streak >= 3);
    if (onFire) {
      enqueueMoment({
        id: `r${pub.round}-streak`,
        priority: 5,
        moment: {
          type: 'spotlight',
          eyebrow: 'EM CHAMAS',
          title: onFire.name,
          subtitle: `${onFire.streak} certas seguidas`,
          accent: ACCENT,
          avatar: avatarOf(onFire.playerId),
        },
      });
    }
  }, [pub.phase, pub.round, pub.correctIndex, pub.options, pub.standings, enqueueMoment, avatarOf]);

  const standings = pub.standings.length
    ? pub.standings
    : [...pub.players]
        .map((p) => ({ playerId: p.id, name: p.name, score: p.score, roundPoints: 0, streak: 0 }))
        .sort((a, b) => b.score - a.score);

  const resultFor = (index: number) => pub.optionResults?.find((r) => r.index === index) ?? null;
  const intensity = over ? 'climax' : pub.phase === 'reveal' ? 'high' : 'normal';

  return (
    <>
      <div className="sabetudo-reactions" aria-hidden="true">
        {reactions.slice(-6).map((r) => (
          <div key={r.key} className="sabetudo-reaction-bubble">
            <span className="sabetudo-reaction-emoji">{r.reaction}</span>
            <span className="sabetudo-reaction-who">{nameOf(r.playerId)}</span>
          </div>
        ))}
      </div>

      <HostStage
        scene={scene}
        theme={sabeTudoTheme}
        intensity={intensity}
        hud={
          <>
            <div className="sabetudo-brand">
              <BrandMark text="Sabe-Tudo" size="md" />
              <span className="sabetudo-brand-sub">
                Sala {pub.roomCode} · Pergunta {pub.round}/{pub.totalRounds}
                {pub.category ? ` · ${pub.category}` : ''}
              </span>
              {!connected ? <span className="sabetudo-conn-pill">reconectando…</span> : null}
            </div>
            <Timer seconds={timerSeconds} active={pub.phase === 'question'} />
          </>
        }
        strip={
          over || pub.phase === 'reveal' ? undefined : (
            <ContestantStrip
              entries={standings.map((s) => ({
                id: s.playerId,
                name: s.name,
                avatar: avatarOf(s.playerId),
                score: s.score,
                tag: s.streak >= 2 ? `🔥${s.streak}` : undefined,
                highlighted: s.playerId === standings[0]?.playerId,
              }))}
            />
          )
        }
        moment={stage.moment ? <Moment key={stage.momentId} {...stage.moment} /> : null}
        broadcast={stage.broadcast ? <Broadcast key={stage.broadcast.id} item={stage.broadcast} /> : null}
      >
        <section className="sabetudo-stage">
          {pub.question ? <p className="sabetudo-question">{pub.question}</p> : null}

          {pub.phase === 'question' || pub.phase === 'reveal' ? (
            <ol className="sabetudo-options">
              {pub.options.map((opt, i) => {
                const res = resultFor(i);
                const state = pub.phase === 'reveal'
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
                    {pub.phase === 'reveal' ? (
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
          ) : null}

          {pub.phase === 'reveal' ? (
            <RoundScoreboard
              title={`Rodada ${pub.round} de ${pub.totalRounds}`}
              standings={standings}
              taunt={roundTaunt(standings, pub.round)}
              avatarFor={avatarOf}
            />
          ) : null}

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

          {over ? (
            <div className="sabetudo-gameover-scene">
              <VictorySplash
                winner={{ name: pub.winnerId ? nameOf(pub.winnerId) : '—', avatar: pub.winnerId ? avatarOf(pub.winnerId) : undefined }}
                subtitle="sabe tudo mesmo"
                accent={ACCENT}
              />
              <ol className="sabetudo-final-standings">
                {standings.map((s, i) => (
                  <li key={s.playerId}>
                    <span className="sabetudo-rank">{i + 1}º</span>
                    <span className="sabetudo-final-name">{s.name}</span>
                    <span className="sabetudo-final-score">{s.score}</span>
                  </li>
                ))}
              </ol>
            </div>
          ) : null}
        </section>
      </HostStage>

      {paused ? (
        <Overlay label="Partida pausada">
          <p className="eyebrow">Partida pausada</p>
          <h2>⏸ Aguardando o anfitrião</h2>
          <p className="hint">O anfitrião controla pelo celular.</p>
        </Overlay>
      ) : null}

      <div className="sabetudo-op-cluster">
        {over ? (
          <>
            <Button variant="primary" onClick={() => send('START_GAME', {})}>Nova partida</Button>
            <Button variant="danger" onClick={() => send('END_GAME', {})}>Encerrar</Button>
          </>
        ) : null}
        <button type="button" className="sabetudo-sound-toggle" aria-pressed={soundOn} onClick={() => setSoundOn(sounds.toggle())}>
          {soundOn ? '🔊' : '🔇'}
        </button>
      </div>
    </>
  );
}
