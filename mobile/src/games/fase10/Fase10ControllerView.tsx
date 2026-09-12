import { useEffect, useMemo, useState } from 'react';
import type { Fase10Card, Fase10PrivatePlayerState, Fase10PublicState } from '@party/shared';
import { Avatar, Timer, VictorySplash } from '@party/ui';
import { MobileHeader } from '../../shell/MobileHeader';
import type { ControllerGameViewProps } from '../types';
import { HowToPlay } from './HowToPlay';
import './fase10-controller.css';

const REACTION_EMOJIS = ['😂', '🔥', '🤯', '😱', '🎴', '🙏'];
const COLOR_PT: Record<string, string> = { red: 'Vermelho', yellow: 'Amarelo', green: 'Verde', blue: 'Azul' };

const cardText = (c: Fase10Card): string =>
  c.kind === 'wild' ? 'Curinga' : c.kind === 'skip' ? 'Pula' : `${c.value} ${COLOR_PT[c.color]}`;

function Card({ card, selected, disabled, onClick }: { card: Fase10Card; selected: boolean; disabled?: boolean; onClick?: () => void }) {
  const face =
    card.kind === 'wild' ? '★' : card.kind === 'skip' ? '⊘' : String(card.value);
  const cls = card.kind === 'number' ? `c-${card.color}` : card.kind === 'wild' ? 'is-wild' : 'is-skip';
  return (
    <button
      type="button"
      className={`f10c-card ${cls} ${selected ? 'selected' : ''}`}
      disabled={disabled}
      onClick={onClick}
      aria-label={cardText(card)}
      aria-pressed={selected}
    >
      {face}
    </button>
  );
}

export function Fase10ControllerView({
  publicState,
  privateState,
  playerId,
  connected,
  roomCode,
  roomPlayers,
  reactions,
  send,
}: ControllerGameViewProps) {
  const pub = publicState as Fase10PublicState;
  const priv = privateState as Fase10PrivatePlayerState;
  const [showHowTo, setShowHowTo] = useState(false);
  const [showPhases, setShowPhases] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [mode, setMode] = useState<'discard' | 'hit'>('discard');
  const [wildEnd, setWildEnd] = useState<'low' | 'high'>('high');
  const [skipFor, setSkipFor] = useState<string | null>(null);

  // A new turn (or hand) invalidates any stale selection / hit mode.
  useEffect(() => {
    setSelected([]);
    setMode('discard');
    setSkipFor(null);
  }, [pub.turn, pub.hand]);

  const act = (action: Record<string, unknown>) => send('GAME_ACTION', { action });

  const avatarOf = useMemo(() => {
    const map = new Map(roomPlayers.map((p) => [p.id, p.avatar] as const));
    return (id: string) => map.get(id);
  }, [roomPlayers]);
  const nameOf = useMemo(() => {
    const map = new Map(pub.players.map((p) => [p.id, p.name] as const));
    return (id: string | null | undefined) => (id ? map.get(id) ?? '—' : '—');
  }, [pub.players]);

  const timerSeconds = pub.timer ? Math.max(0, Math.ceil(pub.timer.remainingMs / 1000)) : null;
  const paused = pub.phase === 'paused';
  const handOver = pub.phase === 'handOver';
  const gameOver = pub.phase === 'gameOver';
  const myTurn = pub.currentPlayerId === playerId && priv.canAct;
  const phaseNeed = priv.phaseSpec.groups.reduce((n, g) => n + g.size, 0);

  const toggle = (id: string) => {
    setSelected((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));
  };
  const clearSel = () => setSelected([]);

  const selCards = priv.hand.filter((c) => selected.includes(c.id));
  const oneSel = selCards.length === 1 ? selCards[0] : null;

  const doDraw = (source: 'pile' | 'discard') => {
    act({ type: 'draw', source });
    clearSel();
  };
  const doLay = () => {
    act({ type: 'layPhase', cardIds: selected });
    clearSel();
  };
  const doHit = (groupId: string) => {
    if (!oneSel) return;
    act({ type: 'hit', cardId: oneSel.id, groupId, end: oneSel.kind === 'wild' ? wildEnd : undefined });
    clearSel();
    setMode('discard');
  };
  const doDiscard = (skipTargetId?: string) => {
    if (!oneSel) return;
    act({ type: 'discard', cardId: oneSel.id, skipTargetId });
    clearSel();
    setSkipFor(null);
  };
  const onDiscardClick = () => {
    if (!oneSel) return;
    if (oneSel.kind === 'skip') setSkipFor(oneSel.id);
    else doDiscard();
  };

  const myRow = pub.players.find((p) => p.id === playerId);
  const finalRank = useMemo(
    () =>
      [...pub.players].sort(
        (a, b) => Number(b.phaseIndex > pub.targetPhase) - Number(a.phaseIndex > pub.targetPhase) || a.score - b.score,
      ),
    [pub.players, pub.targetPhase],
  );

  return (
    <>
      <MobileHeader roomCode={roomCode} connected={connected}>
        {!paused && !gameOver ? <Timer seconds={timerSeconds} active={myTurn} /> : null}
      </MobileHeader>

      {showHowTo ? <HowToPlay onClose={() => setShowHowTo(false)} /> : null}

      {showPhases ? (
        <div className="f10c-howto" role="dialog" aria-modal="true" aria-label="As 10 fases">
          <div className="f10c-howto-card">
            <h2>As 10 fases</h2>
            <ol className="f10c-phaselist">
              {pub.phaseSpecs.map((spec) => {
                const done = spec.index < priv.phaseIndex;
                const current = spec.index === priv.phaseIndex;
                return (
                  <li key={spec.index} className={`${current ? 'current' : ''} ${done ? 'done' : ''}`}>
                    <span className="f10c-phasenum">{done ? '✓' : spec.index}</span>
                    <span className="f10c-phaselabel">{spec.label}</span>
                    {current ? <span className="f10c-phasetag">você está aqui</span> : null}
                  </li>
                );
              })}
            </ol>
            <p className="hint">Grupo = mesmo número · sequência = números seguidos · o Curinga (★) vale qualquer carta.</p>
            <button type="button" className="f10c-howto-close" onClick={() => setShowPhases(false)}>Fechar</button>
          </div>
        </div>
      ) : null}

      {paused ? (
        <section className="f10c-panel f10c-center">
          <div className="f10c-big">⏸</div>
          <h2>Partida pausada</h2>
          <p className="hint">Aguardando o anfitrião continuar…</p>
          <button type="button" className="f10c-howto-open" onClick={() => setShowHowTo(true)}>? Como jogar</button>
        </section>
      ) : gameOver ? (
        <section className="f10c-panel f10c-center">
          {pub.gameWinnerId === null ? (
            <h2>🤝 Empate!</h2>
          ) : (
            <VictorySplash
              winner={{
                name: pub.gameWinnerId === playerId ? 'Você' : nameOf(pub.gameWinnerId),
                avatar: avatarOf(pub.gameWinnerId),
              }}
              subtitle={`completou a fase ${pub.targetPhase}`}
              accent="#a855f7"
            />
          )}
          <ol className="f10c-final">
            {finalRank.map((p, i) => (
              <li key={p.id} className={p.id === playerId ? 'is-mine' : ''}>
                <span>{i + 1}º {p.name}{p.id === playerId ? ' (você)' : ''}</span>
                <span>fase {Math.min(p.phaseIndex, pub.targetPhase)} · {p.score} pts</span>
              </li>
            ))}
          </ol>
          <p className="hint">Aguarde o anfitrião iniciar uma nova partida.</p>
        </section>
      ) : (
        <>
          <section className={`f10c-banner ${myTurn ? 'is-live' : ''}`}>
            {handOver
              ? pub.handWinnerId === playerId
                ? '🏁 Você zerou a mão!'
                : `🏁 ${nameOf(pub.handWinnerId)} zerou a mão`
              : myTurn
                ? priv.mustDraw
                  ? 'Sua vez — compre uma carta'
                  : priv.laid
                    ? 'Sua vez — encaixe, descarte ou baixe extra'
                    : 'Sua vez — baixe a fase ou descarte'
                : `Vez de ${nameOf(pub.currentPlayerId)}`}
            <span className="f10c-hand-tag">Mão {pub.hand}</span>
          </section>

          <section className="f10c-panel">
            <button type="button" className="f10c-myphase" onClick={() => setShowPhases(true)}>
              <span>
                Sua fase <strong>{priv.phaseIndex}</strong>: {priv.phaseSpec.label}
                {priv.laid ? <span className="f10c-done"> ✓ baixada</span> : null}
              </span>
              <span className="f10c-myphase-more">ver as 10 ›</span>
            </button>
            <div className="f10c-mesa">
              <span className="f10c-mesa-pile">Monte: {pub.drawPileCount}</span>
              <span className="f10c-mesa-disc">
                Descarte: {pub.topDiscard ? cardText(pub.topDiscard) : '—'}
              </span>
            </div>
          </section>

          {handOver ? (
            <section className="f10c-panel">
              <h2>Fim da mão {pub.hand}</h2>
              <ol className="f10c-final">
                {(pub.handResult ?? []).map((r) => (
                  <li key={r.playerId} className={r.playerId === playerId ? 'is-mine' : ''}>
                    <span>{r.name}{r.playerId === playerId ? ' (você)' : ''}</span>
                    <span>{r.advanced ? `▲ fase ${r.phaseIndex}` : `fase ${r.phaseIndex}`} · +{r.gained}</span>
                  </li>
                ))}
              </ol>
              <p className="hint">Aguarde o anfitrião iniciar a próxima mão.</p>
            </section>
          ) : null}

          {/* laid groups on the table (targets for a hit) */}
          {pub.table.length > 0 ? (
            <section className="f10c-panel">
              <h3 className="f10c-sub">Mesa</h3>
              <div className="f10c-groups">
                {pub.table.map((g) => {
                  const canHitHere = myTurn && !priv.mustDraw && priv.laid && mode === 'hit' && oneSel;
                  return (
                    <button
                      key={g.id}
                      type="button"
                      className="f10c-group"
                      disabled={!canHitHere}
                      onClick={() => doHit(g.id)}
                    >
                      <small>{nameOf(g.ownerId)} · {g.req.type === 'run' ? 'seq' : g.req.type === 'color' ? 'cor' : 'grupo'}</small>
                      <span className="f10c-group-cards">
                        {g.cards.map((c, i) => (
                          <span key={c.id + i} className={`f10c-mini ${c.kind === 'number' ? `c-${c.color}` : c.kind === 'wild' ? 'is-wild' : 'is-skip'}`}>
                            {c.kind === 'number' ? c.value : c.kind === 'wild' ? '★' : '⊘'}
                          </span>
                        ))}
                      </span>
                    </button>
                  );
                })}
              </div>
              {myTurn && !priv.mustDraw && priv.laid && mode === 'hit' && oneSel?.kind === 'wild' ? (
                <div className="f10c-wildend">
                  Curinga na sequência:
                  <button type="button" className={wildEnd === 'low' ? 'on' : ''} onClick={() => setWildEnd('low')}>início</button>
                  <button type="button" className={wildEnd === 'high' ? 'on' : ''} onClick={() => setWildEnd('high')}>fim</button>
                </div>
              ) : null}
            </section>
          ) : null}

          {/* my hand */}
          <section className="f10c-panel">
            <div className="f10c-hand-head">
              <h3 className="f10c-sub">Sua mão · {priv.hand.length}</h3>
              <button type="button" className="f10c-howto-open" onClick={() => setShowHowTo(true)}>? Como jogar</button>
            </div>
            <div className="f10c-hand">
              {priv.hand.map((c) => (
                <Card
                  key={c.id}
                  card={c}
                  selected={selected.includes(c.id)}
                  disabled={!myTurn || priv.mustDraw}
                  onClick={() => toggle(c.id)}
                />
              ))}
            </div>
            {selected.length > 0 ? (
              <button type="button" className="f10c-clear" onClick={clearSel}>limpar seleção ({selected.length})</button>
            ) : null}
          </section>

          {/* action bar */}
          {myTurn ? (
            <section className="f10c-actions">
              {priv.mustDraw ? (
                <>
                  <button type="button" className="f10c-btn primary" onClick={() => doDraw('pile')}>
                    Comprar do monte
                  </button>
                  <button
                    type="button"
                    className="f10c-btn"
                    disabled={!pub.discardDrawable}
                    onClick={() => doDraw('discard')}
                  >
                    Pegar descarte
                  </button>
                </>
              ) : (
                <>
                  {!priv.laid ? (
                    <button
                      type="button"
                      className="f10c-btn primary"
                      disabled={selected.length !== phaseNeed}
                      onClick={doLay}
                    >
                      Baixar fase ({selected.length}/{phaseNeed})
                    </button>
                  ) : (
                    <button
                      type="button"
                      className={`f10c-btn ${mode === 'hit' ? 'primary' : ''}`}
                      onClick={() => setMode((m) => (m === 'hit' ? 'discard' : 'hit'))}
                    >
                      {mode === 'hit' ? 'Encaixando… (toque um grupo)' : 'Encaixar carta'}
                    </button>
                  )}
                  <button
                    type="button"
                    className="f10c-btn danger"
                    disabled={selCards.length !== 1 || mode === 'hit'}
                    onClick={onDiscardClick}
                  >
                    Descartar {oneSel ? cardText(oneSel) : '1 carta'}
                  </button>
                </>
              )}
            </section>
          ) : null}

          {/* skip target picker */}
          {skipFor ? (
            <div className="f10c-modal" role="dialog" aria-modal="true" aria-label="Quem pular">
              <div className="f10c-modal-card">
                <h2>Pular quem?</h2>
                <div className="f10c-skip-choices">
                  {pub.players
                    .filter((p) => p.id !== playerId)
                    .map((p) => (
                      <button key={p.id} type="button" onClick={() => doDiscard(p.id)}>
                        {p.name}
                      </button>
                    ))}
                </div>
                <button type="button" className="f10c-modal-close" onClick={() => setSkipFor(null)}>Cancelar</button>
              </div>
            </div>
          ) : null}

          {/* scoreboard */}
          <section className="f10c-panel">
            <h3 className="f10c-sub">Jogadores</h3>
            <ul className="f10c-score">
              {pub.players.map((p) => (
                <li key={p.id} className={`${p.id === playerId ? 'is-mine' : ''} ${p.id === pub.currentPlayerId ? 'is-turn' : ''}`}>
                  {avatarOf(p.id) ? <Avatar spec={avatarOf(p.id)!} size={22} /> : null}
                  <span className="f10c-score-name">
                    {p.name}{p.id === playerId ? ' (você)' : ''}
                  </span>
                  <span className="f10c-score-phase">F{p.phaseIndex}</span>
                  <span className="f10c-score-hand">{p.handCount}</span>
                  <span className="f10c-score-pts">{p.score}</span>
                </li>
              ))}
            </ul>
            {myRow ? <p className="hint">Menos pontos ganha. Você: {myRow.score} pts.</p> : null}
          </section>

          <section className="f10c-reactions-bar" aria-label="Reações">
            {REACTION_EMOJIS.map((e) => (
              <button key={e} type="button" onClick={() => send('SEND_REACTION', { reaction: e })}>
                {e}
              </button>
            ))}
          </section>
        </>
      )}

      <div className="f10c-reaction-feed" aria-live="polite">
        {reactions.slice(-4).map((r) => (
          <div key={r.key} className="f10c-reaction-pop">
            <span>{r.reaction}</span>
            <small>{nameOf(r.playerId)}</small>
          </div>
        ))}
      </div>
    </>
  );
}
