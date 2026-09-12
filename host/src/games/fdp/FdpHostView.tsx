import { useEffect, useMemo, useRef, useState } from 'react';
import type { FdpAnswer, FdpGameEvent, FdpPublicState } from '@party/shared';
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
import { broadcastFor } from './describeEvent';
import { soundForEvent } from './sound-map';
import { fdpTheme } from './theme';
import './fdp-host.css';

const ACCENT = fdpTheme.accent;

const SCENE_FOR: Record<string, HostScene> = {
  writing: 'thinking',
  voting: 'collecting',
  roundResults: 'reveal',
  gameover: 'victory',
};

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
      const ev = be.event as FdpGameEvent;
      if (ev.type === 'round_started') set.clear();
      else if (ev.type === 'answer_submitted') set.add(ev.playerId);
    }
    return set;
  }, [events]);

  const paused = pub.phase === 'paused';
  const over = pub.phase === 'gameover';
  const inResults = pub.phase === 'roundResults' || over;
  const timerSeconds = pub.timer ? Math.max(0, Math.ceil(pub.timer.remainingMs / 1000)) : null;
  const isFinal = pub.roundKind === 'final';
  const scene: HostScene = SCENE_FOR[pub.phase] ?? 'thinking';

  const stage = useStageDirector({
    events,
    scene,
    broadcastFor: (e) => broadcastFor(e as FdpGameEvent, nameOf),
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
      const name = soundForEvent(event as FdpGameEvent);
      if (name) sounds.play(name);
    }
    seenSeq.current = last;
  }, [events, sounds]);

  // results fires a sweep callout (if any) then a reveal of the winning answer
  useEffect(() => {
    if (pub.phase !== 'roundResults') return;
    const swept = pub.answers.find((a) => a.sweptVotes);
    if (swept) {
      enqueueMoment({
        id: `r${pub.round}-fdp`,
        priority: 10,
        moment: { type: 'callout', title: 'FDP!', subtitle: 'levou todos os votos', variant: 'success', accent: ACCENT },
      });
    }
    const winner = pub.answers.find((a) => a.isRoundWinner);
    if (winner) {
      enqueueMoment({
        id: `r${pub.round}-winner`,
        priority: 5,
        moment: { type: 'reveal', eyebrow: 'A mais podre', title: winner.text, subtitle: winner.authorName ?? undefined, accent: ACCENT },
      });
    }
  }, [pub.phase, pub.round, pub.answers, enqueueMoment]);

  const standings = pub.standings.length
    ? pub.standings
    : [...pub.players]
        .map((p) => ({ playerId: p.id, name: p.name, score: p.score, roundPoints: 0 }))
        .sort((a, b) => b.score - a.score);

  const intensity = over ? 'climax' : pub.phase === 'roundResults' ? 'high' : 'normal';

  return (
    <>
      <div className="fdp-reactions" aria-hidden="true">
        {reactions.slice(-6).map((r) => (
          <div key={r.key} className="fdp-reaction-bubble">
            <span className="fdp-reaction-emoji">{r.reaction}</span>
            <span className="fdp-reaction-who">{nameOf(r.playerId)}</span>
          </div>
        ))}
      </div>

      <HostStage
        scene={scene}
        theme={fdpTheme}
        intensity={intensity}
        hud={
          <>
            <div className="fdp-brand">
              <BrandMark text="FDP" size="md" />
              <span className="fdp-brand-sub">
                Sala {pub.roomCode} · {isFinal ? 'Final FDP' : `Rodada ${pub.round}/${pub.totalRounds}`}
              </span>
              {!connected ? <span className="fdp-conn-pill">reconectando…</span> : null}
            </div>
            <Timer seconds={timerSeconds} active={pub.phase === 'writing' || pub.phase === 'voting'} />
          </>
        }
        strip={
          over || pub.phase === 'roundResults' ? undefined : (
            <ContestantStrip
              entries={standings.map((s) => ({
                id: s.playerId,
                name: s.name,
                avatar: avatarOf(s.playerId),
                score: s.score,
                highlighted: s.playerId === standings[0]?.playerId,
              }))}
            />
          )
        }
        moment={stage.moment ? <Moment key={stage.momentId} {...stage.moment} /> : null}
        broadcast={stage.broadcast ? <Broadcast key={stage.broadcast.id} item={stage.broadcast} /> : null}
      >
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
              {!over ? (
                <RoundScoreboard
                  title={isFinal ? 'Final FDP' : `Rodada ${pub.round} de ${pub.totalRounds}`}
                  standings={standings}
                  taunt={roundTaunt(standings, pub.round)}
                  avatarFor={avatarOf}
                />
              ) : null}
            </div>
          ) : null}

          {inResults && pub.answers.length === 0 ? (
            <p className="fdp-eyebrow">Ninguém respondeu essa 😬</p>
          ) : null}

          {over ? (
            <div className="fdp-gameover-scene">
              <VictorySplash
                winner={{ name: pub.winnerId ? nameOf(pub.winnerId) : '—', avatar: pub.winnerId ? avatarOf(pub.winnerId) : undefined }}
                subtitle="a mente mais podre da sala"
                accent={ACCENT}
              />
              <ol className="fdp-final-standings">
                {standings.map((s, i) => (
                  <li key={s.playerId}>
                    <span className="fdp-rank">{i + 1}º</span>
                    <span className="fdp-final-name">{s.name}</span>
                    <span className="fdp-final-score">{s.score}</span>
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

      <div className="fdp-op-cluster">
        {over ? (
          <>
            <Button variant="primary" onClick={() => send('START_GAME', {})}>Nova partida</Button>
            <Button variant="danger" onClick={() => send('END_GAME', {})}>Encerrar</Button>
          </>
        ) : null}
        <button type="button" className="fdp-sound-toggle" aria-pressed={soundOn} onClick={() => setSoundOn(sounds.toggle())}>
          {soundOn ? '🔊' : '🔇'}
        </button>
      </div>
    </>
  );
}
