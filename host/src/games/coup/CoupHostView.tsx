import { useEffect, useMemo, useRef, useState } from 'react';
import type { CoupGameEvent, CoupPublicState } from '@party/shared';
import {
  Avatar,
  BrandMark,
  Broadcast,
  Button,
  getSounds,
  HostStage,
  Moment,
  Overlay,
  Timer,
  useStageDirector,
  VictorySplash,
  type HostScene,
} from '@party/ui';
import type { HostGameViewProps } from '../types';
import { ACTION_LABEL, CHARACTER_META, getCoupCardArt, getCoupCardBackArt } from './coupCards';
import { broadcastFor } from './describeEvent';
import { soundForEvent } from './sound-map';
import { coupTheme } from './theme';
import './coup-host.css';

const ACCENT = coupTheme.accent;

const charLabel = (c: keyof typeof CHARACTER_META | null | undefined): string =>
  c ? (CHARACTER_META[c]?.label ?? c) : '';

function InfluenceCard({ character, revealed }: { character: keyof typeof CHARACTER_META | null; revealed: boolean }) {
  if (revealed && character) {
    const meta = CHARACTER_META[character];
    return (
      <div className="coup-card is-revealed" style={{ borderColor: meta.color }}>
        <img className="coup-card-art" src={getCoupCardArt(character)} alt={meta.label} draggable={false} />
        <span className="coup-card-name">{meta.label}</span>
      </div>
    );
  }
  return (
    <div className="coup-card is-back" aria-label="Influência oculta">
      <img className="coup-card-art" src={getCoupCardBackArt()} alt="" draggable={false} />
    </div>
  );
}

export function CoupHostView({ publicState, events, players, connected, reactions, send }: HostGameViewProps) {
  const pub = publicState as CoupPublicState;
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
  const over = pub.phase === 'game_over';
  const scene: HostScene = over ? 'victory' : 'table';

  const stage = useStageDirector({
    events,
    scene,
    broadcastFor: (e) => broadcastFor(e as CoupGameEvent, nameOf),
    nameFor: nameOf,
    avatarFor: avatarOf,
  });
  const { enqueueMoment } = stage;

  // sound + moments follow the raw event stream
  const seenSeq = useRef(0);
  useEffect(() => {
    if (events.length === 0) { seenSeq.current = 0; return; }
    const last = events[events.length - 1].seq;
    if (last <= seenSeq.current) return;
    for (const { seq, event } of events) {
      if (seq <= seenSeq.current) continue;
      const ev = event as CoupGameEvent;
      const spec = soundForEvent(ev);
      if (spec) sounds.play(spec);

      if (ev.type === 'challenge_made') {
        enqueueMoment({
          id: `s${seq}`,
          priority: 20,
          moment: {
            type: 'callout',
            title: 'DESAFIO!',
            subtitle: `${nameOf(ev.challengerId)} → ${nameOf(ev.challengedId)}`,
            variant: 'danger',
            accent: coupTheme.accentSecondary,
          },
        });
      } else if (ev.type === 'challenge_resolved') {
        enqueueMoment({
          id: `s${seq}`,
          priority: 15,
          moment: {
            type: 'reveal',
            eyebrow: 'A carta era',
            title: charLabel(ev.character),
            subtitle: ev.challengedHeldCard
              ? `${nameOf(ev.challengedId)} dizia a verdade`
              : `${nameOf(ev.challengedId)} blefou`,
            variant: ev.challengedHeldCard ? 'success' : 'danger',
            accent: ev.challengedHeldCard ? undefined : coupTheme.accentSecondary,
          },
        });
      } else if (ev.type === 'player_eliminated') {
        enqueueMoment({
          id: `s${seq}`,
          priority: 30,
          moment: { type: 'callout', title: `${nameOf(ev.playerId)}`, subtitle: 'fora do jogo', variant: 'danger', accent: coupTheme.accentSecondary },
        });
      }
    }
    seenSeq.current = last;
  }, [events, sounds, nameOf, enqueueMoment]);

  const timerSeconds = pub.timer ? Math.max(0, Math.ceil(pub.timer.remainingMs / 1000)) : null;
  const winnerName = pub.winnerId ? nameOf(pub.winnerId) : '—';
  const currentName = pub.currentPlayerId ? nameOf(pub.currentPlayerId) : '—';
  const pa = pub.pendingAction;
  const actionLabel = pa ? (ACTION_LABEL[pa.type] ?? pa.type) : '';

  let banner: string;
  switch (pub.phase) {
    case 'awaiting_action':
      banner = `Vez de ${currentName}`;
      break;
    case 'awaiting_action_challenge':
      banner = pa
        ? `${nameOf(pa.actorId)} alega ${charLabel(pa.claimedCharacter)} — ${actionLabel}${pa.targetId ? ` em ${nameOf(pa.targetId)}` : ''}`
        : 'Janela de desafio';
      break;
    case 'awaiting_block':
      banner = pa
        ? `${nameOf(pa.actorId)}: ${actionLabel}${pa.targetId ? ` em ${nameOf(pa.targetId)}` : ''} — bloquear?`
        : 'Janela de bloqueio';
      break;
    case 'awaiting_block_challenge':
      banner = pub.pendingBlock
        ? `${nameOf(pub.pendingBlock.blockerId)} bloqueia com ${charLabel(pub.pendingBlock.claimedCharacter)} — desafiar?`
        : 'Desafiar bloqueio?';
      break;
    case 'awaiting_influence_loss':
      banner = `${pub.influenceLossPlayerId ? nameOf(pub.influenceLossPlayerId) : 'Alguém'} vai perder uma influência`;
      break;
    case 'awaiting_exchange':
      banner = `${pub.exchangingPlayerId ? nameOf(pub.exchangingPlayerId) : 'Alguém'} está trocando cartas`;
      break;
    default:
      banner = '';
  }

  const kick = (playerId: string) => {
    if (window.confirm('Expulsar este jogador da sala?')) send('KICK_PLAYER', { targetPlayerId: playerId });
  };

  return (
    <>
      <div className="coup-reactions" aria-hidden="true">
        {reactions.slice(-6).map((r) => (
          <div key={r.key} className="coup-reaction-bubble">
            <span className="coup-reaction-emoji">{r.reaction}</span>
            <span className="coup-reaction-who">{nameOf(r.playerId)}</span>
          </div>
        ))}
      </div>

      <HostStage
        scene={scene}
        theme={coupTheme}
        intensity={over ? 'climax' : 'normal'}
        hud={
          <>
            <div className="coup-brand">
              <BrandMark text="Coup" size="md" />
              <span className="coup-brand-sub">Sala {pub.roomCode} · Turno {pub.turnNumber}</span>
              {!connected ? <span className="coup-conn-pill">reconectando…</span> : null}
            </div>
            <Timer seconds={timerSeconds} />
          </>
        }
        moment={stage.moment ? <Moment key={stage.momentId} {...stage.moment} /> : null}
        broadcast={stage.broadcast ? <Broadcast key={stage.broadcast.id} item={stage.broadcast} /> : null}
      >
        {over ? (
          <div className="coup-gameover-scene">
            <VictorySplash
              winner={{ name: winnerName, avatar: pub.winnerId ? avatarOf(pub.winnerId) : undefined }}
              subtitle="o último de pé"
              accent={ACCENT}
            />
          </div>
        ) : (
          <section className="coup-table">
            <p className="coup-banner">{banner}</p>
            <div className="coup-meta-row">
              <span className="meta-chip">Baralho: {pub.deckCount}</span>
              <span className="meta-chip">Tesouro: {pub.treasury}</span>
            </div>

            <ul className="coup-seats">
              {pub.players.map((p) => {
                const hidden = p.influenceCount - p.revealedCharacters.length;
                return (
                  <li
                    key={p.id}
                    className={`coup-seat ${p.id === pub.currentPlayerId ? 'is-turn' : ''} ${p.isAlive ? '' : 'is-out'}`}
                  >
                    <div className="coup-seat-head">
                      <span className={`conn-dot ${p.connected ? 'on' : 'off'}`} aria-hidden="true" />
                      {avatarOf(p.id) ? <Avatar spec={avatarOf(p.id)!} size={26} className="coup-seat-avatar" /> : null}
                      <span className="coup-seat-name">{p.name}</span>
                      <span className="coup-coins">💰 {p.coins}</span>
                      <button type="button" className="kick-button" aria-label={`Expulsar ${p.name}`} onClick={() => kick(p.id)}>
                        ✕
                      </button>
                    </div>
                    <div className="coup-hand">
                      {p.revealedCharacters.map((c, i) => (
                        <InfluenceCard key={`r${i}`} character={c} revealed />
                      ))}
                      {Array.from({ length: Math.max(0, hidden) }, (_, i) => (
                        <InfluenceCard key={`h${i}`} character={null} revealed={false} />
                      ))}
                    </div>
                    {!p.isAlive ? <span className="coup-out-tag">eliminado</span> : null}
                  </li>
                );
              })}
            </ul>
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

      {/* TV keeps only end-of-game controls; mid-game pause / end are on the
          owner's phone (HostControlsBar). */}
      <div className="coup-op-cluster">
        {over ? (
          <>
            <Button variant="primary" onClick={() => send('START_GAME', {})}>Nova partida</Button>
            <Button variant="danger" onClick={() => send('END_GAME', {})}>Encerrar</Button>
          </>
        ) : null}
        <button type="button" className="coup-sound-toggle" aria-pressed={soundOn} onClick={() => setSoundOn(sounds.toggle())}>
          {soundOn ? '🔊' : '🔇'}
        </button>
      </div>
    </>
  );
}
