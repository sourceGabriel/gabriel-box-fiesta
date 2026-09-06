import { useMemo, useState } from 'react';
import type { CoupCharacter, CoupPrivateState, CoupPublicState } from '@party/shared';
import { Button, Timer } from '@party/ui';
import { MobileHeader } from '../../shell/MobileHeader';
import type { ControllerGameViewProps } from '../types';
import { ACTIONS, ACTION_LABEL, CHARACTER_META } from './coupCards';
import { HowToPlay } from './HowToPlay';
import './coup-controller.css';

const charLabel = (c: CoupCharacter | null | undefined): string => (c ? (CHARACTER_META[c]?.label ?? c) : '');

export function CoupControllerView({ publicState, privateState, playerId, connected, roomCode, send }: ControllerGameViewProps) {
  const pub = publicState as CoupPublicState;
  const priv = privateState as CoupPrivateState;

  const [pendingActionType, setPendingActionType] = useState<string | null>(null);
  const [exchangeKeep, setExchangeKeep] = useState<number[]>([]);
  const [showHowTo, setShowHowTo] = useState(false);

  const act = (action: Record<string, unknown>): void => {
    send('GAME_ACTION', { action });
    setPendingActionType(null);
    setExchangeKeep([]);
  };

  const me = pub.players.find((p) => p.id === playerId);
  const myCoins = me?.coins ?? 0;
  const forcedCoup = myCoins >= 10;
  const nameOf = useMemo(() => {
    const map = new Map(pub.players.map((p) => [p.id, p.name] as const));
    return (id: string | null | undefined) => (id ? (map.get(id) ?? '—') : '—');
  }, [pub.players]);

  const decision = priv.pendingDecision;
  const timerSeconds = pub.timer ? Math.max(0, Math.ceil(pub.timer.remainingMs / 1000)) : null;
  const timerActive = decision !== null;

  const paused = pub.phase === 'paused';
  const over = pub.phase === 'game_over';

  const pa = pub.pendingAction;
  const targets = pub.players.filter((p) => p.isAlive && p.id !== playerId);

  // ─── status banner ───
  let banner = '';
  if (decision === 'action') banner = 'Sua vez';
  else if (decision === 'challenge') banner = 'Desafiar a alegação?';
  else if (decision === 'block') banner = 'Bloquear esta ação?';
  else if (decision === 'block_challenge') banner = 'Desafiar o bloqueio?';
  else if (decision === 'influence_loss') banner = 'Escolha a carta a revelar';
  else if (decision === 'exchange') banner = 'Escolha as cartas para manter';
  else if (pub.currentPlayerId) banner = `Vez de ${nameOf(pub.currentPlayerId)}`;

  const myInfluences = priv.influences;

  return (
    <>
      <MobileHeader roomCode={roomCode} connected={connected}>
        {!paused && !over ? <Timer seconds={timerSeconds} active={timerActive} /> : null}
      </MobileHeader>

      {showHowTo ? <HowToPlay onClose={() => setShowHowTo(false)} /> : null}

      {paused ? (
        <section className="coup-panel coup-center">
          <div className="coup-badge">⏸</div>
          <h2>Partida pausada</h2>
          <p className="hint">Aguardando o anfitrião continuar…</p>
        </section>
      ) : over ? (
        <section className="coup-panel coup-center coup-result">
          <h2>{pub.winnerId === playerId ? '🏆 Você venceu!' : `🏆 ${nameOf(pub.winnerId)} venceu`}</h2>
          <p className="hint">Aguarde o anfitrião iniciar uma nova partida.</p>
        </section>
      ) : (
        <>
          <section className={`coup-banner-strip ${decision ? 'is-live' : ''}`}>{banner}</section>

          <section className="coup-panel coup-me">
            <div className="coup-me-head">
              <h2>Suas influências</h2>
              <span className="coup-me-coins">💰 {myCoins}</span>
            </div>
            <div className="coup-me-cards">
              {myInfluences.map((inf, i) => {
                const meta = inf.character ? CHARACTER_META[inf.character] : null;
                return (
                  <div key={i} className={`coup-mini ${inf.revealed ? 'is-revealed' : ''}`} style={meta ? { borderColor: meta.color } : undefined}>
                    <span className="coup-mini-emoji">{meta?.emoji ?? '⚜'}</span>
                    <span className="coup-mini-name">{meta ? meta.label : '—'}</span>
                    {inf.revealed ? <span className="coup-mini-tag">perdida</span> : null}
                  </div>
                );
              })}
            </div>
            <div className="coup-table-tags">
              <span className="coup-tag">Baralho {pub.deckCount}</span>
              <span className="coup-tag">Tesouro {pub.treasury}</span>
              <button type="button" className="coup-howto-open" onClick={() => setShowHowTo(true)}>
                ? Como jogar
              </button>
            </div>
          </section>

          {/* ─── the single active prompt ─── */}
          {decision === 'action' && !pendingActionType ? (
            <section className="coup-panel coup-prompt">
              <h2>Escolha uma ação</h2>
              {forcedCoup ? <p className="coup-prompt-note">Com 10+ moedas, só dá para dar Golpe.</p> : null}
              <div className="coup-actions">
                {ACTIONS.map((a) => {
                  const tooExpensive = myCoins < a.cost;
                  const blockedByForce = forcedCoup && a.type !== 'Coup';
                  const disabled = tooExpensive || blockedByForce;
                  const reason = tooExpensive ? `Precisa de ${a.cost}` : blockedByForce ? 'Golpe obrigatório' : a.detail;
                  return (
                    <button
                      key={a.type}
                      type="button"
                      className="coup-action-btn"
                      disabled={disabled}
                      onClick={() => (a.target ? setPendingActionType(a.type) : act({ kind: 'declare_action', action: a.type }))}
                    >
                      <strong>{a.label}</strong>
                      <span>{reason}</span>
                    </button>
                  );
                })}
              </div>
            </section>
          ) : null}

          {decision === 'action' && pendingActionType ? (
            <section className="coup-panel coup-prompt">
              <h2>{ACTION_LABEL[pendingActionType] ?? pendingActionType} — escolha o alvo</h2>
              <div className="coup-targets">
                {targets.map((t) => {
                  const noSteal = pendingActionType === 'Steal' && t.coins === 0;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      className="coup-target-btn"
                      disabled={noSteal}
                      onClick={() => act({ kind: 'declare_action', action: pendingActionType, targetId: t.id })}
                    >
                      {t.name} <span>💰 {t.coins}</span>
                      {noSteal ? <em>sem moedas</em> : null}
                    </button>
                  );
                })}
              </div>
              <Button variant="ghost" onClick={() => setPendingActionType(null)}>Voltar</Button>
            </section>
          ) : null}

          {decision === 'challenge' && pa ? (
            <section className="coup-panel coup-prompt">
              <h2>
                {nameOf(pa.actorId)} alega <strong>{charLabel(pa.claimedCharacter)}</strong> para{' '}
                {ACTION_LABEL[pa.type] ?? pa.type}
              </h2>
              <div className="coup-yesno">
                <button type="button" className="coup-danger" onClick={() => act({ kind: 'challenge' })}>
                  Desafiar
                </button>
                <button type="button" className="coup-neutral" onClick={() => act({ kind: 'pass_challenge' })}>
                  Passar
                </button>
              </div>
            </section>
          ) : null}

          {decision === 'block' && pa ? (
            <section className="coup-panel coup-prompt">
              <h2>
                {nameOf(pa.actorId)}: {ACTION_LABEL[pa.type] ?? pa.type}
                {pa.targetId === playerId ? ' contra você' : ''}
              </h2>
              <div className="coup-block-opts">
                {priv.blockOptions.map((c) => (
                  <button key={c} type="button" className="coup-block-btn" onClick={() => act({ kind: 'block', character: c })}>
                    Bloquear com {charLabel(c)}
                  </button>
                ))}
                <button type="button" className="coup-neutral" onClick={() => act({ kind: 'pass_block' })}>
                  Passar
                </button>
              </div>
            </section>
          ) : null}

          {decision === 'block_challenge' && pub.pendingBlock ? (
            <section className="coup-panel coup-prompt">
              <h2>
                {nameOf(pub.pendingBlock.blockerId)} bloqueia com{' '}
                <strong>{charLabel(pub.pendingBlock.claimedCharacter)}</strong>
              </h2>
              <div className="coup-yesno">
                <button type="button" className="coup-danger" onClick={() => act({ kind: 'challenge_block' })}>
                  Desafiar bloqueio
                </button>
                <button type="button" className="coup-neutral" onClick={() => act({ kind: 'pass_challenge_block' })}>
                  Passar
                </button>
              </div>
            </section>
          ) : null}

          {decision === 'influence_loss' ? (
            <section className="coup-panel coup-prompt">
              <h2>Escolha a carta a revelar</h2>
              <div className="coup-lose-opts">
                {myInfluences.map((inf, i) =>
                  inf.revealed ? null : (
                    <button key={i} type="button" className="coup-lose-btn" onClick={() => act({ kind: 'lose_influence', influenceIndex: i })}>
                      {inf.character ? `${CHARACTER_META[inf.character].emoji} ${CHARACTER_META[inf.character].label}` : `Carta ${i + 1}`}
                    </button>
                  ),
                )}
              </div>
            </section>
          ) : null}

          {decision === 'exchange' && priv.exchange ? (
            <ExchangePrompt
              drawn={priv.exchange.drawnCards}
              mine={myInfluences.filter((i) => !i.revealed).map((i) => i.character).filter((c): c is CoupCharacter => c !== null)}
              keepCount={priv.exchange.keepCount}
              selected={exchangeKeep}
              onToggle={(idx) =>
                setExchangeKeep((cur) =>
                  cur.includes(idx) ? cur.filter((x) => x !== idx) : cur.length < (priv.exchange?.keepCount ?? 0) ? [...cur, idx] : cur,
                )
              }
              onConfirm={() => act({ kind: 'exchange', keepIndices: exchangeKeep })}
            />
          ) : null}

          <section className="coup-panel coup-roster">
            <h2>Jogadores</h2>
            <ul>
              {pub.players.map((p) => (
                <li key={p.id} className={`${p.id === pub.currentPlayerId ? 'is-turn' : ''} ${p.isAlive ? '' : 'is-out'}`}>
                  <span>{p.name}{p.id === playerId ? ' (você)' : ''}</span>
                  <span className="coup-roster-meta">
                    💰 {p.coins} · {p.influenceCount - p.revealedCharacters.length}🂠
                    {p.isAlive ? '' : ' · fora'}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        </>
      )}
    </>
  );
}

function ExchangePrompt({
  drawn,
  mine,
  keepCount,
  selected,
  onToggle,
  onConfirm,
}: {
  drawn: CoupCharacter[];
  mine: CoupCharacter[];
  keepCount: number;
  selected: number[];
  onToggle: (idx: number) => void;
  onConfirm: () => void;
}) {
  // Server order is [...hiddenCharacters, ...drawnCards].
  const all = [...mine, ...drawn];
  return (
    <section className="coup-panel coup-prompt">
      <h2>Manter {keepCount} carta(s)</h2>
      <div className="coup-exchange">
        {all.map((c, i) => {
          const meta = CHARACTER_META[c];
          const on = selected.includes(i);
          return (
            <button key={i} type="button" className={`coup-ex-card ${on ? 'on' : ''}`} style={{ borderColor: meta.color }} onClick={() => onToggle(i)}>
              <span className="coup-mini-emoji">{meta.emoji}</span>
              <span className="coup-mini-name">{meta.label}</span>
            </button>
          );
        })}
      </div>
      <Button variant="success" disabled={selected.length !== keepCount} onClick={onConfirm}>
        Confirmar ({selected.length}/{keepCount})
      </Button>
    </section>
  );
}
