import { useEffect, useMemo, useRef, useState } from 'react';
import type { CoupGameEvent, CoupPublicState } from '@party/shared';
import { BrandMark, Button, Overlay, Timer } from '@party/ui';
import type { HostGameViewProps } from '../types';
import { ACTION_LABEL, CHARACTER_META, getCoupCardArt, getCoupCardBackArt } from './coupCards';
import { describeEvent } from './describeEvent';
import './coup-host.css';

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
  const seenSeqRef = useRef(0);
  const [feed, setFeed] = useState<{ seq: number; text: string }[]>([]);

  const nameOf = useMemo(() => {
    const map = new Map<string, string>();
    for (const p of pub.players) map.set(p.id, p.name);
    for (const p of players) if (!map.has(p.id)) map.set(p.id, p.name);
    return (id: string) => map.get(id) ?? '—';
  }, [pub.players, players]);

  // Append newly-arrived events to the feed (keep last 9).
  useEffect(() => {
    if (events.length === 0) {
      seenSeqRef.current = 0;
      setFeed([]);
      return;
    }
    const lastSeq = events[events.length - 1].seq;
    if (lastSeq <= seenSeqRef.current) return;
    const fresh = events
      .filter((e) => e.seq > seenSeqRef.current)
      .map((e) => ({ seq: e.seq, text: describeEvent(e.event as CoupGameEvent, nameOf) }))
      .filter((l): l is { seq: number; text: string } => l.text !== null);
    seenSeqRef.current = lastSeq;
    if (fresh.length > 0) {
      setFeed((cur) => [...cur, ...fresh].slice(-9));
    }
  }, [events, nameOf]);

  const paused = pub.phase === 'paused';
  const over = pub.phase === 'game_over';
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
    if (window.confirm('Expulsar este jogador da sala?')) {
      send('KICK_PLAYER', { targetPlayerId: playerId });
    }
  };

  return (
    <main className="host-shell host-game coup-host">
      <div className="coup-reactions" aria-hidden="true">
        {reactions.slice(-6).map((r) => (
          <div key={r.key} className="coup-reaction-bubble">
            <span className="coup-reaction-emoji">{r.reaction}</span>
            <span className="coup-reaction-who">{nameOf(r.playerId)}</span>
          </div>
        ))}
      </div>

      {paused ? (
        <Overlay label="Partida pausada">
          <p className="eyebrow">Partida pausada</p>
          <h2>⏸ Aguardando o anfitrião</h2>
          <div className="result-actions">
            <Button variant="primary" onClick={() => send('RESUME_GAME', {})}>Continuar</Button>
            <Button variant="danger" onClick={() => send('END_GAME', {})}>Encerrar</Button>
          </div>
        </Overlay>
      ) : null}

      {over ? (
        <Overlay label="Fim da partida">
          <p className="eyebrow">Fim da partida</p>
          <h2>🏆 {winnerName} venceu!</h2>
          <div className="result-actions">
            <Button variant="primary" onClick={() => send('START_GAME', {})}>Nova partida</Button>
            <Button variant="danger" onClick={() => send('END_GAME', {})}>Encerrar</Button>
          </div>
        </Overlay>
      ) : null}

      {!over && pub.lastReveal ? (
        <div className="coup-reveal" role="status">
          {pub.lastReveal.challengedHeldCard ? '✅' : '❌'}{' '}
          {nameOf(pub.lastReveal.challengerId)} desafiou {nameOf(pub.lastReveal.challengedId)} —{' '}
          {charLabel(pub.lastReveal.character)}{' '}
          {pub.lastReveal.challengedHeldCard ? 'era verdade' : 'era blefe'}
        </div>
      ) : null}

      <header className="host-topbar">
        <div className="brand">
          <BrandMark text="Coup" size="md" />
          <span className="brand-sub">Sala {pub.roomCode} · Turno {pub.turnNumber}</span>
          {!connected ? <span className="conn-pill">reconectando…</span> : null}
        </div>
        <Timer seconds={timerSeconds} />
      </header>

      <div className="host-body coup-body">
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
                    <span className="coup-seat-name">{p.name}</span>
                    <span className="coup-coins">💰 {p.coins}</span>
                    <button
                      type="button"
                      className="kick-button"
                      aria-label={`Expulsar ${p.name}`}
                      onClick={() => kick(p.id)}
                    >
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

        <aside className="side-zone coup-side">
          <div className="side-head">
            <h2>Mesa</h2>
            <span className="status-chip">{connected ? 'ao vivo' : 'offline'}</span>
          </div>
          {feed.length > 0 ? (
            <ul className="event-feed" aria-live="polite">
              {feed.map((line) => (
                <li key={line.seq}>{line.text}</li>
              ))}
            </ul>
          ) : (
            <p className="hint">Aguardando a primeira jogada…</p>
          )}
          <div className="side-actions">
            <Button variant="ghost" onClick={() => send(paused ? 'RESUME_GAME' : 'PAUSE_GAME', {})}>
              {paused ? '▶ Continuar' : '⏸ Pausar'}
            </Button>
            <Button variant="danger" onClick={() => send('END_GAME', {})}>Encerrar partida</Button>
          </div>
        </aside>
      </div>
    </main>
  );
}
