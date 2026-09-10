import { useEffect, useMemo, useRef, useState } from 'react';
import type { ZapDuel, ZapGameEvent, ZapPublicState } from '@party/shared';
import {
  Avatar,
  BrandMark,
  Broadcast,
  Button,
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
import { zapTheme } from './theme';
import './zap-host.css';

const ACCENT = zapTheme.accent;

const SCENE_FOR: Record<string, HostScene> = {
  answering: 'thinking',
  voting: 'reaction',
  roundResults: 'reveal',
  gameover: 'victory',
};

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
    const need = pub.roundKind === 'final' ? 1 : 2;
    const counts = new Map<string, number>();
    for (const be of events) {
      const ev = be.event as ZapGameEvent;
      if (ev.type === 'round_started') counts.clear();
      else if (ev.type === 'answer_submitted') counts.set(ev.playerId, (counts.get(ev.playerId) ?? 0) + 1);
    }
    return new Set([...counts].filter(([, n]) => n >= need).map(([id]) => id));
  }, [events, pub.roundKind]);

  const paused = pub.phase === 'paused';
  const over = pub.phase === 'gameover';
  const timerSeconds = pub.timer ? Math.max(0, Math.ceil(pub.timer.remainingMs / 1000)) : null;
  const isFinal = pub.roundKind === 'final';
  const currentDuel = pub.duels.find((d) => d.index === pub.currentDuelIndex) ?? pub.duels[pub.duels.length - 1];
  const scene: HostScene = SCENE_FOR[pub.phase] ?? 'thinking';

  // ── stage director: moments (from public state) + broadcast lower-thirds (from events) ──
  const stage = useStageDirector({
    events,
    scene,
    broadcastFor: (e) => broadcastFor(e as ZapGameEvent, nameOf),
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
      const spec = soundForEvent(event as ZapGameEvent);
      if (spec) sounds.play(spec);
    }
    seenSeq.current = last;
  }, [events, sounds]);

  // the results scene fires a callout on a swept duel + a reveal of each winning answer
  useEffect(() => {
    if (pub.phase !== 'roundResults') return;
    for (const d of pub.duels) {
      const r = d.result;
      if (!r) continue;
      if (r.zap) {
        enqueueMoment({
          id: `r${pub.round}-d${d.index}-zap`,
          priority: 10,
          moment: { type: 'callout', title: 'ZAP!', subtitle: 'levou todos os votos', variant: 'success', accent: ACCENT },
        });
      }
      if (r.winnerSlot !== null) {
        const win = d.answers.find((a) => a.slot === r.winnerSlot);
        if (win) {
          enqueueMoment({
            id: `r${pub.round}-d${d.index}-win`,
            priority: 5,
            moment: { type: 'reveal', eyebrow: 'Melhor resposta', title: win.text, subtitle: win.authorName ?? undefined, accent: ACCENT },
          });
        }
      }
    }
  }, [pub.phase, pub.round, pub.duels, enqueueMoment]);

  const standings = pub.standings.length
    ? pub.standings
    : [...pub.players].map((p) => ({ playerId: p.id, name: p.name, score: p.score, roundPoints: 0 })).sort((a, b) => b.score - a.score);

  const intensity = over ? 'climax' : pub.phase === 'roundResults' ? 'high' : 'normal';

  return (
    <>
      <div className="zap-reactions" aria-hidden="true">
        {reactions.slice(-6).map((r) => (
          <div key={r.key} className="zap-reaction-bubble">
            <span className="zap-reaction-emoji">{r.reaction}</span>
            <span className="zap-reaction-who">{nameOf(r.playerId)}</span>
          </div>
        ))}
      </div>

      <HostStage
        scene={scene}
        theme={zapTheme}
        intensity={intensity}
        hud={
          <>
            <div className="zap-brand">
              <BrandMark text="Zap!" size="md" />
              <span className="zap-brand-sub">
                Sala {pub.roomCode} · {isFinal ? 'Última Chance' : `Rodada ${pub.round}/${pub.totalRounds}`}
              </span>
              {!connected ? <span className="zap-conn-pill">reconectando…</span> : null}
            </div>
            <Timer seconds={timerSeconds} active={pub.phase === 'voting'} />
          </>
        }
        strip={
          over || pub.phase === 'roundResults' ? undefined : (
            <ul className="zap-strip">
              {standings.map((s) => (
                <li key={s.playerId} className={s.playerId === standings[0]?.playerId ? 'is-leader' : ''}>
                  {avatarOf(s.playerId) ? <Avatar spec={avatarOf(s.playerId)!} size={34} /> : null}
                  <span className="zap-strip-name">{s.name}</span>
                  <span className="zap-strip-score">{s.score}</span>
                </li>
              ))}
            </ul>
          )
        }
      >
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
                  style={{ width: `${pub.answersExpectedCount ? (pub.answersInCount / pub.answersExpectedCount) * 100 : 0}%` }}
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

          {pub.phase === 'roundResults' && pub.duels.length > 0 ? (
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

          {pub.phase === 'roundResults' ? (
            <RoundScoreboard
              title={isFinal ? 'Última Chance' : `Rodada ${pub.round} de ${pub.totalRounds}`}
              standings={standings}
              taunt={roundTaunt(standings, pub.round)}
              avatarFor={avatarOf}
            />
          ) : null}

          {over ? (
            <div className="zap-gameover-scene">
              <VictorySplash
                winner={{ name: pub.winnerId ? nameOf(pub.winnerId) : '—', avatar: pub.winnerId ? avatarOf(pub.winnerId) : undefined }}
                subtitle="venceu o Zap!"
                accent={ACCENT}
              />
              <ol className="zap-final-standings">
                {standings.map((s, i) => (
                  <li key={s.playerId}>
                    <span className="zap-rank">{i + 1}º</span>
                    <span className="zap-final-name">{s.name}</span>
                    <span className="zap-final-score">{s.score}</span>
                  </li>
                ))}
              </ol>
            </div>
          ) : null}
        </section>
      </HostStage>

      {stage.moment ? <Moment key={stage.momentId} {...stage.moment} /> : null}
      {stage.broadcast ? <Broadcast key={stage.broadcast.id} item={stage.broadcast} /> : null}

      {paused ? (
        <Overlay label="Partida pausada">
          <p className="eyebrow">Partida pausada</p>
          <h2>⏸ Aguardando o anfitrião</h2>
          <p className="hint">O anfitrião controla pelo celular.</p>
        </Overlay>
      ) : null}

      {/* the TV keeps only end-of-game controls + the sound toggle; pause / end
          during play live on the owner's phone (HostControlsBar). */}
      <div className="zap-op-cluster">
        {over ? (
          <>
            <Button variant="primary" onClick={() => send('START_GAME', {})}>Nova partida</Button>
            <Button variant="danger" onClick={() => send('END_GAME', {})}>Encerrar</Button>
          </>
        ) : null}
        <button type="button" className="zap-sound-toggle" aria-pressed={soundOn} onClick={() => setSoundOn(sounds.toggle())}>
          {soundOn ? '🔊' : '🔇'}
        </button>
      </div>
    </>
  );
}
