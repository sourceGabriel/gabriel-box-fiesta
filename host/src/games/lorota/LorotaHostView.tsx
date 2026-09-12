import { useEffect, useMemo, useRef, useState } from 'react';
import type { LorotaGameEvent, LorotaOption, LorotaPublicState } from '@party/shared';
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
import { lorotaTheme } from './theme';
import './lorota-host.css';

const ACCENT = lorotaTheme.accent;

const SCENE_FOR: Record<string, HostScene> = {
  lying: 'thinking',
  guessing: 'collecting',
  reveal: 'reveal',
  gameover: 'victory',
};

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

  const paused = pub.phase === 'paused';
  const over = pub.phase === 'gameover';
  const timerSeconds = pub.timer ? Math.max(0, Math.ceil(pub.timer.remainingMs / 1000)) : null;
  const isFinal = pub.roundKind === 'final';
  const scene: HostScene = SCENE_FOR[pub.phase] ?? 'thinking';

  // ── stage director: moments (from public state) + broadcast lower-thirds (from events) ──
  const stage = useStageDirector({
    events,
    scene,
    broadcastFor: (e) => broadcastFor(e as LorotaGameEvent, nameOf),
    nameFor: nameOf,
    avatarFor: avatarOf,
  });
  const { enqueueMoment } = stage;

  // sound follows the raw event stream
  const seenSeq = useRef(0);
  useEffect(() => {
    if (events.length === 0) { seenSeq.current = 0; return; }
    const last = events[events.length - 1].seq;
    if (last <= seenSeq.current) return;
    for (const { seq, event } of events) {
      if (seq <= seenSeq.current) continue;
      const name = soundForEvent(event as LorotaGameEvent);
      if (name) sounds.play(name);
    }
    seenSeq.current = last;
  }, [events, sounds]);

  // reveal fires the truth, then spotlights whoever's lie fooled the most people
  useEffect(() => {
    if (pub.phase !== 'reveal' || pub.options.length === 0) return;
    enqueueMoment({
      id: `r${pub.round}-truth`,
      priority: 10,
      moment: { type: 'reveal', eyebrow: 'A verdade era', title: pub.truthText ?? '—', accent: ACCENT },
    });
    const topLie = [...pub.options]
      .filter((o) => o.isTruth === false && (o.pickedBy?.length ?? 0) > 0)
      .sort((a, b) => (b.pickedBy?.length ?? 0) - (a.pickedBy?.length ?? 0))[0];
    if (topLie?.authorIds && topLie.authorIds.length > 0) {
      const fooledCount = topLie.pickedBy?.length ?? 0;
      enqueueMoment({
        id: `r${pub.round}-mentiroso`,
        priority: 5,
        moment: {
          type: 'spotlight',
          eyebrow: 'O MENTIROSO',
          title: topLie.authorNames?.join(' + ') ?? '—',
          subtitle: `enganou ${fooledCount} ${fooledCount === 1 ? 'pessoa' : 'pessoas'}`,
          accent: ACCENT,
          avatar: avatarOf(topLie.authorIds[0]),
        },
      });
    }
  }, [pub.phase, pub.round, pub.options, pub.truthText, enqueueMoment, avatarOf]);

  const standings = pub.standings.length
    ? pub.standings
    : [...pub.players]
        .map((p) => ({ playerId: p.id, name: p.name, score: p.score, roundPoints: 0 }))
        .sort((a, b) => b.score - a.score);

  const intensity = over ? 'climax' : pub.phase === 'reveal' ? 'high' : 'normal';

  return (
    <>
      <div className="lorota-reactions" aria-hidden="true">
        {reactions.slice(-6).map((r) => (
          <div key={r.key} className="lorota-reaction-bubble">
            <span className="lorota-reaction-emoji">{r.reaction}</span>
            <span className="lorota-reaction-who">{nameOf(r.playerId)}</span>
          </div>
        ))}
      </div>

      <HostStage
        scene={scene}
        theme={lorotaTheme}
        intensity={intensity}
        hud={
          <>
            <div className="lorota-brand">
              <BrandMark text="Lorota!" size="md" />
              <span className="lorota-brand-sub">
                Sala {pub.roomCode} · {isFinal ? 'Lorota Final' : `Rodada ${pub.round}/${pub.totalRounds}`}
              </span>
              {!connected ? <span className="lorota-conn-pill">reconectando…</span> : null}
            </div>
            <Timer seconds={timerSeconds} active={pub.phase === 'guessing' || pub.phase === 'lying'} />
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
                highlighted: s.playerId === standings[0]?.playerId,
              }))}
            />
          )
        }
        moment={stage.moment ? <Moment key={stage.momentId} {...stage.moment} /> : null}
        broadcast={stage.broadcast ? <Broadcast key={stage.broadcast.id} item={stage.broadcast} /> : null}
      >
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

          {pub.phase === 'reveal' && pub.options.length > 0 ? (
            <div className="lorota-reveal">
              <ol className="lorota-options">
                {pub.options.map((o) => (
                  <OptionRow key={o.id} option={o} revealed />
                ))}
              </ol>
              <RoundScoreboard
                title={isFinal ? 'Lorota Final' : `Rodada ${pub.round} de ${pub.totalRounds}`}
                standings={standings}
                taunt={roundTaunt(standings, pub.round)}
                avatarFor={avatarOf}
              />
            </div>
          ) : null}

          {over ? (
            <div className="lorota-gameover-scene">
              <VictorySplash
                winner={{ name: pub.winnerId ? nameOf(pub.winnerId) : '—', avatar: pub.winnerId ? avatarOf(pub.winnerId) : undefined }}
                subtitle="mentiu melhor que todo mundo"
                accent={ACCENT}
              />
              <ol className="lorota-final-standings">
                {standings.map((s, i) => (
                  <li key={s.playerId}>
                    <span className="lorota-rank">{i + 1}º</span>
                    <span className="lorota-final-name">{s.name}</span>
                    <span className="lorota-final-score">{s.score}</span>
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

      {/* the TV keeps only end-of-game controls + the sound toggle; pause / end
          during play live on the owner's phone (HostControlsBar). */}
      <div className="lorota-op-cluster">
        {over ? (
          <>
            <Button variant="primary" onClick={() => send('START_GAME', {})}>Nova partida</Button>
            <Button variant="danger" onClick={() => send('END_GAME', {})}>Encerrar</Button>
          </>
        ) : null}
        <button type="button" className="lorota-sound-toggle" aria-pressed={soundOn} onClick={() => setSoundOn(sounds.toggle())}>
          {soundOn ? '🔊' : '🔇'}
        </button>
      </div>
    </>
  );
}
