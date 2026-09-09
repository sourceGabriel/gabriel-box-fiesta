import { useEffect, useMemo, useRef, useState } from 'react';
import type { SintoniaPrivateState, SintoniaPublicState, SintoniaSide } from '@party/shared';
import { Avatar, TextAnswerInput, Timer } from '@party/ui';
import { MobileHeader } from '../../shell/MobileHeader';
import type { ControllerGameViewProps } from '../types';
import { HowToPlay } from './HowToPlay';
import './sintonia-controller.css';

const REACTION_EMOJIS = ['😂', '🔥', '🤯', '🧠', '😱', '🙏'];
const CLUE_MAX = 60;

export function SintoniaControllerView({
  publicState,
  privateState,
  playerId,
  connected,
  roomCode,
  roomPlayers,
  reactions,
  send,
}: ControllerGameViewProps) {
  const pub = publicState as SintoniaPublicState;
  const priv = privateState as SintoniaPrivateState;
  const [showHowTo, setShowHowTo] = useState(false);

  const avatarOf = useMemo(() => {
    const map = new Map(roomPlayers.map((p) => [p.id, p.avatar] as const));
    return (id: string) => map.get(id);
  }, [roomPlayers]);
  const nameOf = useMemo(() => {
    const map = new Map<string, string>();
    for (const t of pub.teams) t.memberIds.forEach((id, i) => map.set(id, t.memberNames[i]));
    return (id: string | null | undefined) => (id ? (map.get(id) ?? '—') : '—');
  }, [pub.teams]);

  const act = (action: Record<string, unknown>) => send('GAME_ACTION', { action });

  const timerSeconds = pub.timer ? Math.max(0, Math.ceil(pub.timer.remainingMs / 1000)) : null;
  const paused = pub.phase === 'paused';
  const over = pub.phase === 'gameover';
  const role = priv.role;
  const myTeam = priv.teamId !== null ? pub.teams[priv.teamId] : null;

  // ── dial slider: keep the live value in a ref, drip it to the server ~8×/s ──
  const dialRef = useRef(pub.dialValue);
  const [localDial, setLocalDial] = useState(pub.dialValue);
  const setDial = (v: number) => {
    dialRef.current = v;
    setLocalDial(v);
  };

  useEffect(() => {
    // Follow the authoritative value while we are not the one dragging.
    if (role !== 'dial') setDial(pub.dialValue);
  }, [pub.dialValue, role]);

  useEffect(() => {
    if (role !== 'dial') return;
    let sent = dialRef.current;
    const t = setInterval(() => {
      if (sent !== dialRef.current) {
        sent = dialRef.current;
        send('GAME_ACTION', { action: { type: 'moveDial', value: sent } });
      }
    }, 120);
    return () => clearInterval(t);
  }, [role, send]);

  const flush = () => {
    if (role === 'dial') send('GAME_ACTION', { action: { type: 'moveDial', value: dialRef.current } });
  };
  const onDial = (value: number) => setDial(value);

  const myStandingRow = pub.standings.find((s) => s.playerId === playerId);

  let banner = '';
  if (paused) banner = 'Partida pausada';
  else if (role === 'medium') banner = '🔮 Você é o médium';
  else if (role === 'dial') banner = '🎚️ Gire o dial';
  else if (role === 'sideBet') banner = priv.myBet ? 'Aposta feita! Aguardando…' : '◀ / ▶ Aposte o lado';
  else if (pub.phase === 'cluing') banner = 'O médium está pensando…';
  else if (pub.phase === 'guessing') banner = 'Seu time está adivinhando…';
  else if (pub.phase === 'reveal') banner = 'Resultado da rodada';

  const betBtn = (side: SintoniaSide, label: string) => {
    const chosen = priv.myBet === side;
    const locked = priv.myBet !== null;
    return (
      <button
        type="button"
        className={`sint-bet-btn ${chosen ? 'is-chosen' : ''}`}
        disabled={locked}
        onClick={() => act({ type: 'betSide', side })}
      >
        {label}
        {chosen ? <span className="sint-bet-check">✓ sua aposta</span> : null}
      </button>
    );
  };

  return (
    <>
      <MobileHeader roomCode={roomCode} connected={connected}>
        {!paused && !over ? (
          <Timer seconds={timerSeconds} active={role === 'medium' || role === 'dial' || role === 'sideBet'} />
        ) : null}
      </MobileHeader>

      {showHowTo ? <HowToPlay onClose={() => setShowHowTo(false)} /> : null}

      {paused ? (
        <section className="sint-panel sint-center">
          <div className="sint-big">⏸</div>
          <h2>Partida pausada</h2>
          <p className="hint">Aguardando o anfitrião continuar…</p>
          <button type="button" className="sint-howto-open" onClick={() => setShowHowTo(true)}>? Como jogar</button>
        </section>
      ) : over ? (
        <section className="sint-panel sint-center">
          <h2>
            {pub.winnerTeamId === null
              ? '🤝 Empate!'
              : priv.teamId === pub.winnerTeamId
                ? '🏆 Seu time venceu!'
                : `🏆 ${pub.teams[pub.winnerTeamId].name} venceu`}
          </h2>
          {myStandingRow ? <p className="hint">Seu time: {myStandingRow.score} pts</p> : null}
          <p className="hint">Aguarde o anfitrião iniciar uma nova partida.</p>
        </section>
      ) : (
        <>
          <section className={`sint-banner ${role !== 'idle' ? 'is-live' : ''}`}>
            {banner}
            <span className="sint-round-tag">
              Rodada {pub.round}/{pub.totalRounds}
              {myTeam ? ` · ${myTeam.name}` : ''}
            </span>
          </section>

          {/* ── médium: pick the clue ── */}
          {role === 'medium' ? (
            <section className="sint-panel">
              <p className="sint-spectrum">
                <span>◀ {pub.spectrum[0]}</span>
                <span>{pub.spectrum[1]} ▶</span>
              </p>
              <div className="sint-target-bar">
                <div className="sint-target-fill" style={{ width: `${priv.target ?? 50}%` }} />
                <div className="sint-target-pin" style={{ left: `${priv.target ?? 50}%` }} aria-hidden="true">
                  🎯
                </div>
              </div>
              <p className="hint">O alvo está em <strong>{priv.target}</strong> — descreva esse ponto com uma dica curta, sem números.</p>
              <TextAnswerInput
                key={`clue-${pub.round}`}
                prompt="Sua dica"
                placeholder="ex.: quase no talo, mas não tanto"
                maxLength={CLUE_MAX}
                submittedText={priv.done ? priv.clue : null}
                disabled={priv.done}
                onSubmit={(text) => act({ type: 'submitClue', clue: text })}
              />
            </section>
          ) : null}

          {/* ── dial mover ── */}
          {role === 'dial' ? (
            <section className="sint-panel">
              <p className="sint-clue-line">“{priv.clue ?? '…'}”</p>
              <p className="sint-spectrum">
                <span>◀ {pub.spectrum[0]}</span>
                <span>{pub.spectrum[1]} ▶</span>
              </p>
              <div className="sint-dial-readout">{Math.round(localDial)}</div>
              <input
                className="sint-slider"
                type="range"
                min={0}
                max={100}
                step={1}
                value={localDial}
                onChange={(e) => onDial(Number(e.target.value))}
                onPointerUp={flush}
                aria-label="Dial"
              />
              <p className="hint">Arraste até onde vocês acham que o alvo está. Trava no fim do tempo.</p>
            </section>
          ) : null}

          {/* ── side bet ── */}
          {role === 'sideBet' ? (
            <section className="sint-panel">
              <p className="sint-clue-line">“{priv.clue ?? '…'}”</p>
              <p className="hint">O outro time parou o dial em <strong>{Math.round(pub.dialValue)}</strong>. O alvo está pra que lado?</p>
              <div className="sint-bet-btns">
                {betBtn('left', '◀ Esquerda')}
                {betBtn('right', 'Direita ▶')}
              </div>
            </section>
          ) : null}

          {/* ── idle / spectate ── */}
          {role === 'idle' && (pub.phase === 'cluing' || pub.phase === 'guessing') ? (
            <section className="sint-panel sint-center">
              <p className="hint">
                {pub.phase === 'cluing'
                  ? `🔮 ${pub.mediumName} está escolhendo a dica…`
                  : 'Seu time está no dial — torça (em voz alta).'}
              </p>
            </section>
          ) : null}

          {/* ── reveal ── */}
          {pub.phase === 'reveal' ? (
            <section className="sint-panel sint-center">
              {pub.roundSkipped ? (
                <p className="hint">⌛ Ninguém deu a dica — rodada pulada.</p>
              ) : (
                <>
                  <h2>Alvo: {pub.target} · Dial: {Math.round(pub.dialValue)}</h2>
                  <p className="sint-reveal-line">
                    {pub.teams[pub.activeTeamId].name} +{pub.bandPoints ?? 0}
                    {pub.sideCorrect ? ` · outro time +1 (lado certo)` : ''}
                  </p>
                </>
              )}
            </section>
          ) : null}

          {/* ── teams / score ── */}
          <section className="sint-panel sint-roster">
            <div className="sint-roster-head">
              <h2>Times</h2>
              <button type="button" className="sint-howto-open" onClick={() => setShowHowTo(true)}>? Como jogar</button>
            </div>
            {pub.teams.map((t) => (
              <div key={t.id} className={`sint-team-row ${priv.teamId === t.id ? 'is-mine' : ''} ${t.isActive ? 'is-active' : ''}`}>
                <div className="sint-team-row-head">
                  <strong>{t.name}</strong>
                  <span>{t.score} pts</span>
                </div>
                <ul>
                  {t.memberIds.map((id, i) => (
                    <li key={id}>
                      {avatarOf(id) ? <Avatar spec={avatarOf(id)!} size={24} /> : null}
                      <span>
                        {t.memberNames[i]}
                        {id === playerId ? ' (você)' : ''}
                        {id === pub.mediumId ? ' 🔮' : ''}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </section>

          <section className="sint-reactions-bar" aria-label="Reações">
            {REACTION_EMOJIS.map((e) => (
              <button key={e} type="button" onClick={() => send('SEND_REACTION', { reaction: e })}>
                {e}
              </button>
            ))}
          </section>
        </>
      )}

      <div className="sint-reaction-feed" aria-live="polite">
        {reactions.slice(-4).map((r) => (
          <div key={r.key} className="sint-reaction-pop">
            <span>{r.reaction}</span>
            <small>{nameOf(r.playerId)}</small>
          </div>
        ))}
      </div>
    </>
  );
}
