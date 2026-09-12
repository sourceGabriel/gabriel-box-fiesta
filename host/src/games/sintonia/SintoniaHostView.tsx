import { useEffect, useMemo, useRef, useState } from 'react';
import type { SintoniaGameEvent, SintoniaPublicState } from '@party/shared';
import {
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
import { SintoniaDial } from './SintoniaDial';
import { sintoniaTheme } from './theme';
import './sintonia-host.css';

const ACCENT = sintoniaTheme.accent;

export function SintoniaHostView({ publicState, events, players, connected, reactions, send }: HostGameViewProps) {
  const pub = publicState as SintoniaPublicState;
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

  const paused = pub.phase === 'paused';
  const over = pub.phase === 'gameover';
  const inReveal = pub.phase === 'reveal' || over;
  const timerSeconds = pub.timer ? Math.max(0, Math.ceil(pub.timer.remainingMs / 1000)) : null;

  // The dial is continuously on screen across cluing/guessing/reveal — one
  // custom scene for all of it (the same pattern as Coup's 'table'), not the
  // usual thinking/collecting/reveal set.
  const scene: HostScene = over ? 'victory' : 'dial';

  const stage = useStageDirector({
    events,
    scene,
    broadcastFor: (e) => broadcastFor(e as SintoniaGameEvent, nameOf),
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
      const spec = soundForEvent(event as SintoniaGameEvent);
      if (spec) sounds.play(spec);
    }
    seenSeq.current = last;
  }, [events, sounds]);

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

  // reveal spotlights whoever landed closest to the target
  useEffect(() => {
    if (pub.phase !== 'reveal' || !bestResult || bestResult.points <= 0) return;
    enqueueMoment({
      id: `r${pub.round}-closest`,
      priority: 10,
      moment: {
        type: 'spotlight',
        eyebrow: 'CHEGOU MAIS PERTO',
        title: bestResult.name,
        subtitle: `+${bestResult.points} pontos`,
        accent: ACCENT,
        avatar: avatarOf(bestResult.playerId),
      },
    });
  }, [pub.phase, pub.round, bestResult, enqueueMoment, avatarOf]);

  const intensity = over ? 'climax' : pub.phase === 'reveal' ? 'high' : 'normal';

  return (
    <>
      <div className="sint-reactions" aria-hidden="true">
        {reactions.slice(-6).map((r) => (
          <div key={r.key} className="sint-reaction-bubble">
            <span className="sint-reaction-emoji">{r.reaction}</span>
            <span className="sint-reaction-who">{nameOf(r.playerId)}</span>
          </div>
        ))}
      </div>

      <HostStage
        scene={scene}
        theme={sintoniaTheme}
        intensity={intensity}
        hud={
          <>
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
          </>
        }
        strip={
          over || pub.phase === 'reveal' ? undefined : (
            <ContestantStrip
              entries={pub.standings.map((s) => ({
                id: s.playerId,
                name: s.name,
                avatar: avatarOf(s.playerId),
                score: s.score,
                tag: s.playerId === pub.mediumId ? '🔮' : undefined,
                highlighted: s.playerId === pub.mediumId,
              }))}
            />
          )
        }
        moment={stage.moment ? <Moment key={stage.momentId} {...stage.moment} /> : null}
        broadcast={stage.broadcast ? <Broadcast key={stage.broadcast.id} item={stage.broadcast} /> : null}
      >
        {over ? (
          <div className="sint-gameover-scene">
            {pub.winnerId === null ? (
              <h2>🤝 Empate!</h2>
            ) : (
              <VictorySplash
                winner={{ name: pub.winnerName ?? nameOf(pub.winnerId), avatar: avatarOf(pub.winnerId) }}
                subtitle="mais em sintonia"
                accent={ACCENT}
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
          </div>
        ) : (
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

            {pub.phase === 'reveal' ? (
              <RoundScoreboard
                title={`Rodada ${pub.round} de ${pub.totalRounds}`}
                standings={scoreRows}
                taunt={roundTaunt(scoreRows.map((s) => ({ name: s.name, score: s.score })), pub.round)}
                avatarFor={avatarOf}
              />
            ) : null}
          </section>
        )}
      </HostStage>

      {paused ? (
        <Overlay label="Partida pausada">
          <p className="eyebrow">Partida pausada</p>
          <h2>⏸ Aguardando o anfitrião</h2>
          <p className="hint">O anfitrião controla pelo celular.</p>
        </Overlay>
      ) : null}

      <div className="sint-op-cluster">
        {over ? (
          <>
            <Button variant="primary" onClick={() => send('START_GAME', {})}>Nova partida</Button>
            <Button variant="danger" onClick={() => send('END_GAME', {})}>Encerrar</Button>
          </>
        ) : null}
        <button
          type="button"
          className="sint-sound-toggle"
          aria-pressed={soundOn}
          onClick={() => setSoundOn(sounds.toggle())}
        >
          {soundOn ? '🔊' : '🔇'}
        </button>
      </div>
    </>
  );
}
