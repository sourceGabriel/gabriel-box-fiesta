import { useEffect, useMemo, useRef, useState } from 'react';
import type { AvatarSpec, DilemaGameEvent, DilemaPublicState, DilemaStep, DilemaTrack, DilemaTrackView } from '@party/shared';
import {
  Avatar,
  Broadcast,
  BrandMark,
  Button,
  getSounds,
  HostStage,
  Moment,
  Overlay,
  RoundScoreboard,
  roundTaunt,
  useStageDirector,
  VictorySplash,
  type HostScene,
} from '@party/ui';
import type { HostGameViewProps } from '../types';
import { broadcastFor } from './describeEvent';
import { soundForEvent } from './sound-map';
import { dilemaTheme } from './theme';
import './dilema-host.css';

const ACCENT = dilemaTheme.accent;

const CARD_ICON: Record<string, string> = { innocent: '😇', guilty: '😈', modifier: '✨' };
const STEP_LABEL: Record<DilemaStep, string> = { innocent: 'Inocentes', guilty: 'Culpados', modifier: 'Modificadores' };
const STEP_HINT: Record<DilemaStep, string> = {
  innocent: 'Cada time escolhe um inocente pro próprio trilho — em consenso.',
  guilty: 'Cada time escolhe um culpado pro trilho inimigo — em consenso.',
  modifier: 'Cada time escolhe um modificador e a carta em que ele gruda.',
};
const STEP_NUM: Record<DilemaStep, number> = { innocent: 1, guilty: 2, modifier: 3 };

function TrackColumn({
  track,
  avatarOf,
  state,
}: {
  track: DilemaTrackView;
  avatarOf: (id: string) => AvatarSpec | undefined;
  state: 'live' | 'killed' | 'spared' | 'idle';
}) {
  const pick = track.pick;
  return (
    <section className={`dil-track is-${track.side} is-${state}`}>
      <header className="dil-track-head">
        <h3>{track.label}</h3>
        <ul className="dil-track-team">
          {track.memberIds.map((id, i) => (
            <li key={id}>
              {avatarOf(id) ? <Avatar spec={avatarOf(id)!} size={22} /> : null}
              <span>{track.memberNames[i]}</span>
            </li>
          ))}
          {track.memberIds.length === 0 ? <li className="dil-empty">—</li> : null}
        </ul>
      </header>

      {pick ? (
        <div className={`dil-pick-status ${pick.locked ? 'is-locked' : ''}`}>
          {pick.locked ? (
            <span>✅ escolha travada</span>
          ) : pick.proposalCardId ? (
            <>
              <span className="dil-pick-proposal">“{pick.proposalText}”</span>
              <span className="dil-pick-count">
                {pick.confirmedCount}/{pick.memberCount} concordam
              </span>
            </>
          ) : (
            <span className="dil-pick-count">discutindo no celular…</span>
          )}
        </div>
      ) : null}

      <ol className="dil-track-cards">
        {track.cards.map((c) => (
          <li key={c.id} className={`dil-card is-${c.type}`}>
            <span className="dil-card-icon" aria-hidden="true">{CARD_ICON[c.type] ?? '•'}</span>
            <span className="dil-card-body">
              <span className="dil-card-text">{c.text}</span>
              {c.authorTrack ? (
                <span className="dil-card-author">— {c.authorTrack === track.side ? 'este time' : 'time inimigo'}</span>
              ) : (
                <span className="dil-card-author">semente</span>
              )}
              {c.modifiers.length > 0 ? (
                <span className="dil-card-mods">
                  {c.modifiers.map((m) => (
                    <span key={m.id} className="dil-mod-chip">＋ {m.text}</span>
                  ))}
                </span>
              ) : null}
            </span>
          </li>
        ))}
      </ol>
      {state === 'killed' ? <div className="dil-track-stamp">💥 ATROPELADO</div> : null}
      {state === 'spared' ? <div className="dil-track-stamp is-good">🚋 POUPADO</div> : null}
    </section>
  );
}

export function DilemaHostView({ publicState, events, players, connected, reactions, send }: HostGameViewProps) {
  const pub = publicState as DilemaPublicState;
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
  const inResults = pub.phase === 'roundResults' || over;
  const inPicks = pub.phase === 'pickInnocent' || pub.phase === 'pickGuilty' || pub.phase === 'pickModifier';

  // The board (the two tracks) is the whole game, continuously on screen — one
  // custom scene for everything up to gameover, not the usual thinking/collecting/reveal set.
  const scene: HostScene = over ? 'victory' : 'trilhos';

  const stage = useStageDirector({
    events,
    scene,
    broadcastFor: (e) => broadcastFor(e as DilemaGameEvent, nameOf),
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
      const spec = soundForEvent(event as DilemaGameEvent);
      if (spec) sounds.play(spec);
    }
    seenSeq.current = last;
  }, [events, sounds]);

  // a new Maquinista gets a spotlight when the round assigns tracks
  useEffect(() => {
    if (pub.phase !== 'assigning' || !pub.conductorId) return;
    enqueueMoment({
      id: `r${pub.round}-conductor`,
      priority: 10,
      moment: {
        type: 'spotlight',
        eyebrow: '🎩 O MAQUINISTA',
        title: pub.conductorName ?? nameOf(pub.conductorId),
        subtitle: 'puxa a alavanca nesta rodada',
        accent: ACCENT,
        avatar: avatarOf(pub.conductorId),
      },
    });
  }, [pub.phase, pub.round, pub.conductorId, pub.conductorName, enqueueMoment, avatarOf, nameOf]);

  const scoreRows = useMemo(() => {
    return pub.standings.length
      ? pub.standings.map((s) => ({ playerId: s.playerId, name: s.name, score: s.spared, roundPoints: s.roundDelta }))
      : [...pub.players]
          .map((p) => ({ playerId: p.id, name: p.name, score: p.spared, roundPoints: 0 }))
          .sort((a, b) => b.score - a.score);
  }, [pub.standings, pub.players]);

  const trackState = (side: DilemaTrack): 'live' | 'killed' | 'spared' | 'idle' => {
    if (inResults && pub.killedTrack) return side === pub.killedTrack ? 'killed' : 'spared';
    if (inPicks || pub.phase === 'verdict') return 'live';
    return 'idle';
  };

  const intensity = over ? 'climax' : pub.phase === 'verdict' || pub.phase === 'roundResults' ? 'high' : 'normal';

  return (
    <>
      <div className="dil-reactions" aria-hidden="true">
        {reactions.slice(-6).map((r) => (
          <div key={r.key} className="dil-reaction-bubble">
            <span className="dil-reaction-emoji">{r.reaction}</span>
            <span className="dil-reaction-who">{nameOf(r.playerId)}</span>
          </div>
        ))}
      </div>

      <HostStage
        scene={scene}
        theme={dilemaTheme}
        intensity={intensity}
        hud={
          <>
            <div className="dil-brand">
              <BrandMark text="Dilema" size="md" />
              <span className="dil-brand-sub">
                Sala {pub.roomCode} · Rodada {pub.round}/{pub.totalRounds}
              </span>
              {!connected ? <span className="dil-conn-pill">reconectando…</span> : null}
            </div>
            <div className="dil-conductor">
              🎩 Maquinista: <strong>{pub.conductorName ?? '—'}</strong>
            </div>
            {inPicks && pub.step ? (
              <div className="dil-step-pill">
                Passo {STEP_NUM[pub.step]}/3 · {STEP_LABEL[pub.step]}
              </div>
            ) : null}
          </>
        }
        moment={stage.moment ? <Moment key={stage.momentId} {...stage.moment} /> : null}
        broadcast={stage.broadcast ? <Broadcast key={stage.broadcast.id} item={stage.broadcast} /> : null}
      >
        {over ? (
          <div className="dil-gameover-scene">
            {pub.winnerId ? (
              <VictorySplash
                winner={{ name: nameOf(pub.winnerId), avatar: avatarOf(pub.winnerId) }}
                subtitle="o mais poupado"
                accent={ACCENT}
              />
            ) : (
              <h2>🤝 Empate — ninguém foi mais poupado</h2>
            )}
            <ol className="dil-final-standings">
              {scoreRows.map((s, i) => (
                <li key={s.playerId}>
                  <span className="dil-rank">{i + 1}º</span>
                  <span className="dil-final-name">{s.name}</span>
                  <span className="dil-final-score">poupado {s.score}×</span>
                </li>
              ))}
            </ol>
          </div>
        ) : (
          <section className="dil-stage">
            {pub.phase === 'assigning' ? (
              <p className="dil-eyebrow dil-assign">
                🎩 <strong>{pub.conductorName}</strong> puxa a alavanca nesta rodada. Formando os times…
              </p>
            ) : null}

            {inPicks && pub.step ? (
              <p className="dil-eyebrow">
                {CARD_ICON[pub.step]} <strong>{STEP_LABEL[pub.step]}</strong> — {STEP_HINT[pub.step]}
              </p>
            ) : null}

            {pub.phase === 'verdict' ? (
              <p className="dil-eyebrow dil-verdict">
                ⚖️ <strong>{pub.conductorName}</strong> decide qual trilho o trólebus atropela. Sem relógio — discutam.
              </p>
            ) : null}

            {inResults ? (
              <p className="dil-eyebrow dil-result-line">
                {pub.verdictWasAuto ? '🪙 Maquinista fora — ' : `🔧 ${pub.conductorName} escolheu — `}
                {pub.sparedTrack
                  ? `${pub.sparedTrack === 'left' ? pub.tracks.left.label : pub.tracks.right.label} sobreviveu`
                  : ''}
              </p>
            ) : null}

            <div className={`dil-tracks ${inResults && pub.killedTrack ? `is-crashing-${pub.killedTrack}` : ''}`}>
              <TrackColumn track={pub.tracks.left} avatarOf={avatarOf} state={trackState('left')} />
              <div
                className={`dil-fork ${inResults && pub.killedTrack ? `is-crash-${pub.killedTrack}` : ''}`}
                aria-hidden="true"
              >
                <span className="dil-trolley">🚋</span>
                <span className="dil-crash-flash" />
                <span className="dil-crash-boom">💥</span>
              </div>
              <TrackColumn track={pub.tracks.right} avatarOf={avatarOf} state={trackState('right')} />
            </div>

            {inResults ? (
              <RoundScoreboard
                title={`Rodada ${pub.round} de ${pub.totalRounds} · poupados`}
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

      <div className="dil-op-cluster">
        {over ? (
          <>
            <Button variant="primary" onClick={() => send('START_GAME', {})}>Nova partida</Button>
            <Button variant="danger" onClick={() => send('END_GAME', {})}>Encerrar</Button>
          </>
        ) : null}
        <button
          type="button"
          className="dil-sound-toggle"
          aria-pressed={soundOn}
          onClick={() => setSoundOn(sounds.toggle())}
        >
          {soundOn ? '🔊' : '🔇'}
        </button>
      </div>
    </>
  );
}
