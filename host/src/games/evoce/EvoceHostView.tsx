import { useEffect, useMemo, useRef, useState } from 'react';
import type { EvoceGameEvent, EvocePublicState, EvoceSubmission } from '@party/shared';
import {
  Avatar,
  Broadcast,
  BrandMark,
  Button,
  ContestantStrip,
  DrawingView,
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
import { evoceTheme } from './theme';
import './evoce-host.css';

const ACCENT = evoceTheme.accent;

const KIND_LABEL: Record<string, string> = {
  enquete: 'Enquete',
  legenda: 'Legenda',
  rabisco: 'Rabisco',
  final: 'A Obra-Prima',
};

const SCENE_FOR: Record<string, HostScene> = {
  answering: 'thinking',
  voting: 'collecting',
  roundResults: 'reveal',
  gameover: 'victory',
};

export function EvoceHostView({ publicState, events, players, connected, reactions, send }: HostGameViewProps) {
  const pub = publicState as EvocePublicState;
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

  const paused = pub.phase === 'paused';
  const over = pub.phase === 'gameover';
  const inResults = pub.phase === 'roundResults' || over;
  const timerSeconds = pub.timer ? Math.max(0, Math.ceil(pub.timer.remainingMs / 1000)) : null;
  const isFinal = pub.roundKind === 'final';
  const isEnquete = pub.roundKind === 'enquete';
  const scene: HostScene = SCENE_FOR[pub.phase] ?? 'thinking';

  const stage = useStageDirector({
    events,
    scene,
    broadcastFor: (e) => broadcastFor(e as EvoceGameEvent, nameOf),
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
      const name = soundForEvent(event as EvoceGameEvent);
      if (name) sounds.play(name);
    }
    seenSeq.current = last;
  }, [events, sounds]);

  // results: enquete spotlights the poll winner; the others reveal a caption or
  // spotlight the artist (a drawing can't be a Moment's text title).
  useEffect(() => {
    if (pub.phase !== 'roundResults') return;
    if (isEnquete) {
      if (!pub.pollWinnerId) return;
      enqueueMoment({
        id: `r${pub.round}-poll`,
        priority: 10,
        moment: {
          type: 'spotlight',
          eyebrow: 'A galera aponta pra',
          title: nameOf(pub.pollWinnerId),
          accent: ACCENT,
          avatar: avatarOf(pub.pollWinnerId),
        },
      });
      return;
    }
    const winner = pub.submissions.find((s) => s.isRoundWinner);
    if (!winner) return;
    if (winner.kind === 'caption' && winner.text) {
      enqueueMoment({
        id: `r${pub.round}-caption`,
        priority: 10,
        moment: { type: 'reveal', eyebrow: 'Vencedora da rodada', title: winner.text, subtitle: winner.authorName ?? undefined, accent: ACCENT },
      });
    } else if (winner.kind === 'drawing' && winner.authorId) {
      enqueueMoment({
        id: `r${pub.round}-artist`,
        priority: 10,
        moment: {
          type: 'spotlight',
          eyebrow: 'MELHOR ARTISTA',
          title: winner.authorName ?? '—',
          accent: ACCENT,
          avatar: avatarOf(winner.authorId),
        },
      });
    }
  }, [pub.phase, pub.round, isEnquete, pub.pollWinnerId, pub.submissions, enqueueMoment, avatarOf, nameOf]);

  const standings = pub.standings.length
    ? pub.standings
    : [...pub.players].map((p) => ({ playerId: p.id, name: p.name, score: p.score, roundPoints: 0 })).sort((a, b) => b.score - a.score);

  const roster = pub.players.filter((p) => !(pub.roundKind === 'rabisco' && p.id === pub.targetId));
  const intensity = over ? 'climax' : pub.phase === 'roundResults' ? 'high' : 'normal';

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
    <>
      <div className="evoce-reactions" aria-hidden="true">
        {reactions.slice(-6).map((r) => (
          <div key={r.key} className="evoce-reaction-bubble">
            <span className="evoce-reaction-emoji">{r.reaction}</span>
            <span className="evoce-reaction-who">{nameOf(r.playerId)}</span>
          </div>
        ))}
      </div>

      <HostStage
        scene={scene}
        theme={evoceTheme}
        intensity={intensity}
        hud={
          <>
            <div className="evoce-brand">
              <BrandMark text="É Você!" size="md" />
              <span className="evoce-brand-sub">
                Sala {pub.roomCode} · Rodada {pub.round}/{pub.totalRounds} · {KIND_LABEL[pub.roundKind] ?? pub.roundKind}
              </span>
              {!connected ? <span className="evoce-conn-pill">reconectando…</span> : null}
            </div>
            <Timer seconds={timerSeconds} active={pub.phase === 'answering' || pub.phase === 'voting'} />
          </>
        }
        strip={
          over || pub.phase === 'roundResults' ? undefined : (
            <ContestantStrip
              entries={standings.map((s) => {
                const jk = pub.players.find((p) => p.id === s.playerId)?.jokersLeft ?? 0;
                return {
                  id: s.playerId,
                  name: s.name,
                  avatar: avatarOf(s.playerId),
                  score: s.score,
                  tag: jk > 0 ? '🃏'.repeat(jk) : undefined,
                  highlighted: s.playerId === standings[0]?.playerId,
                };
              })}
            />
          )
        }
        moment={stage.moment ? <Moment key={stage.momentId} {...stage.moment} /> : null}
        broadcast={stage.broadcast ? <Broadcast key={stage.broadcast.id} item={stage.broadcast} /> : null}
      >
        <section className="evoce-stage">
          {pub.targetId && (pub.roundKind === 'legenda' || pub.roundKind === 'rabisco') ? (
            <div className="evoce-target">
              {avatarOf(pub.targetId) ? <Avatar spec={avatarOf(pub.targetId)!} size={pub.roundKind === 'rabisco' ? 96 : 40} /> : null}
              <span>{pub.targetName}</span>
            </div>
          ) : null}

          {pub.prompt ? <p className={`evoce-prompt ${isFinal ? 'is-final' : ''}`}>{pub.prompt}</p> : null}

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

          {pub.phase === 'voting' ? (
            <div className="evoce-voting">
              <p className="evoce-eyebrow">Votem na melhor · no celular</p>
              <ol className={`evoce-subs ${pub.submissions[0]?.kind === 'drawing' ? 'is-grid' : ''}`}>
                {pub.submissions.map((s, i) => <SubmissionCard key={s.id} s={s} n={i + 1} />)}
              </ol>
              <p className="evoce-count">{pub.votesInCount} / {pub.votesExpectedCount} votos</p>
            </div>
          ) : null}

          {pub.phase === 'roundResults' && isEnquete && pub.pollBars ? (
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

          {pub.phase === 'roundResults' && !isEnquete && pub.submissions.length > 0 ? (
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

          {over ? (
            <div className="evoce-gameover-scene">
              <VictorySplash
                winner={{ name: pub.winnerId ? nameOf(pub.winnerId) : '—', avatar: pub.winnerId ? avatarOf(pub.winnerId) : undefined }}
                subtitle="a galera te conhece"
                accent={ACCENT}
              />
              <ol className="evoce-final-standings">
                {standings.map((s, i) => (
                  <li key={s.playerId}>
                    <span className="evoce-rank">{i + 1}º</span>
                    <span className="evoce-final-name">{s.name}</span>
                    <span className="evoce-final-score">{s.score}</span>
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

      <div className="evoce-op-cluster">
        {over ? (
          <>
            <Button variant="primary" onClick={() => send('START_GAME', {})}>Nova partida</Button>
            <Button variant="danger" onClick={() => send('END_GAME', {})}>Encerrar</Button>
          </>
        ) : null}
        <button type="button" className="evoce-sound-toggle" aria-pressed={soundOn} onClick={() => setSoundOn(sounds.toggle())}>
          {soundOn ? '🔊' : '🔇'}
        </button>
      </div>
    </>
  );
}
