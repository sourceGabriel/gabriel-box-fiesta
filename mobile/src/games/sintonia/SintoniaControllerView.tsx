import { useEffect, useMemo, useRef, useState } from 'react';
import type { SintoniaPrivateState, SintoniaPublicState } from '@party/shared';
import { Avatar, TextAnswerInput, Timer } from '@party/ui';
import { MobileHeader } from '../../shell/MobileHeader';
import type { ControllerGameViewProps } from '../types';
import { HowToPlay } from './HowToPlay';
import './sintonia-controller.css';

const REACTION_EMOJIS = ['😂', '🔥', '🤯', '🧠', '😱', '🙏'];
const CLUE_MAX = 60;
const DIAL_START = 50;

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
    const map = new Map(pub.players.map((p) => [p.id, p.name] as const));
    return (id: string | null | undefined) => (id ? (map.get(id) ?? '—') : '—');
  }, [pub.players]);

  const act = (action: Record<string, unknown>) => send('GAME_ACTION', { action });

  const timerSeconds = pub.timer ? Math.max(0, Math.ceil(pub.timer.remainingMs / 1000)) : null;
  const paused = pub.phase === 'paused';
  const over = pub.phase === 'gameover';
  const role = priv.role;

  // ── dial slider: keep the live value in a ref, drip it to the server ~8×/s ──
  const dialRef = useRef(priv.myGuess ?? DIAL_START);
  const [localDial, setLocalDial] = useState(priv.myGuess ?? DIAL_START);
  const setDial = (v: number) => {
    dialRef.current = v;
    setLocalDial(v);
  };

  // Reset the local dial to centre on a new round (the server has cleared every
  // guess). `priv.myGuess` is intentionally not a dep — adding it would snap the
  // slider back on every server echo and fight the drip.
  useEffect(() => {
    setDial(priv.myGuess ?? DIAL_START);
  }, [pub.round]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    // While locked / not our turn, follow the authoritative value.
    if (role !== 'guesser' || priv.myLocked) {
      if (priv.myGuess !== null) setDial(priv.myGuess);
    }
  }, [priv.myGuess, priv.myLocked, role]);

  useEffect(() => {
    if (role !== 'guesser' || priv.myLocked) return;
    let sent = dialRef.current;
    const t = setInterval(() => {
      if (sent !== dialRef.current) {
        sent = dialRef.current;
        send('GAME_ACTION', { action: { type: 'setGuess', value: sent } });
      }
    }, 120);
    return () => clearInterval(t);
  }, [role, priv.myLocked, send]);

  const flush = () => {
    if (role === 'guesser' && !priv.myLocked) {
      send('GAME_ACTION', { action: { type: 'setGuess', value: dialRef.current } });
    }
  };
  const lock = () => {
    send('GAME_ACTION', { action: { type: 'setGuess', value: dialRef.current } });
    send('GAME_ACTION', { action: { type: 'lockGuess' } });
  };

  const myResult = pub.results.find((r) => r.playerId === playerId);
  const myStandingRow = pub.standings.find((s) => s.playerId === playerId);
  const myRank = myStandingRow ? pub.standings.findIndex((s) => s.playerId === playerId) + 1 : null;

  let banner = '';
  if (paused) banner = 'Partida pausada';
  else if (role === 'medium') banner = '🔮 Você é o médium';
  else if (role === 'guesser') banner = priv.myLocked ? 'Palpite travado! Aguardando…' : '🎚️ Puxe o seu ponteiro';
  else if (pub.phase === 'cluing') banner = 'O médium está pensando…';
  else if (pub.phase === 'reveal') banner = 'Resultado da rodada';

  return (
    <>
      <MobileHeader roomCode={roomCode} connected={connected}>
        {!paused && !over ? (
          <Timer seconds={timerSeconds} active={role === 'medium' || (role === 'guesser' && !priv.myLocked)} />
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
            {pub.winnerId === null
              ? '🤝 Empate!'
              : pub.winnerId === playerId
                ? '🏆 Você venceu!'
                : `🏆 ${nameOf(pub.winnerId)} venceu`}
          </h2>
          {myRank ? <p className="hint">Você terminou em {myRank}º — {myStandingRow?.score ?? 0} pts</p> : null}
          <p className="hint">Aguarde o anfitrião iniciar uma nova partida.</p>
        </section>
      ) : (
        <>
          <section className={`sint-banner ${role !== 'idle' ? 'is-live' : ''}`}>
            {banner}
            <span className="sint-round-tag">Rodada {pub.round}/{pub.totalRounds}</span>
          </section>

          {/* ── médium: pick the clue ── */}
          {role === 'medium' ? (
            <section className="sint-panel">
              <p className="sint-spectrum">
                <span>◀ {pub.spectrum[0]}</span>
                <span>{pub.spectrum[1]} ▶</span>
              </p>
              <div className="sint-target-bar">
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

          {/* ── guesser: your own dial ── */}
          {role === 'guesser' ? (
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
                disabled={priv.myLocked}
                onChange={(e) => setDial(Number(e.target.value))}
                onPointerUp={flush}
                aria-label="Seu ponteiro"
              />
              {priv.myLocked ? (
                <button type="button" className="sint-bet-btn" onClick={() => act({ type: 'unlockGuess' })}>
                  🔓 Destravar e mudar
                </button>
              ) : (
                <button type="button" className="sint-bet-btn is-chosen" onClick={lock}>
                  🔒 Travar meu palpite
                </button>
              )}
              <p className="hint">
                {priv.myLocked
                  ? `Travado em ${Math.round(localDial)}. ${pub.guessersLockedCount}/${pub.guessersTotalCount} prontos.`
                  : 'Trave quando decidir. Trava sozinho no fim do tempo.'}
              </p>
            </section>
          ) : null}

          {/* ── idle / spectate ── */}
          {role === 'idle' && pub.phase === 'cluing' ? (
            <section className="sint-panel sint-center">
              <p className="hint">🔮 {pub.mediumName} está escolhendo a dica…</p>
            </section>
          ) : null}

          {/* ── reveal ── */}
          {pub.phase === 'reveal' ? (
            <section className="sint-panel sint-center">
              {pub.roundSkipped ? (
                <p className="hint">⌛ Ninguém deu a dica — rodada pulada.</p>
              ) : priv.isMedium ? (
                <>
                  <h2>Alvo: {pub.target}</h2>
                  <p className="sint-reveal-line">Sua dica rendeu +{pub.mediumPoints ?? 0} (média do grupo)</p>
                </>
              ) : myResult ? (
                <>
                  <h2>Alvo: {pub.target} · você: {myResult.value}</h2>
                  <p className="sint-reveal-line">
                    {myResult.points > 0 ? `+${myResult.points} pontos` : 'errou feio — 0'}
                  </p>
                </>
              ) : (
                <h2>Alvo: {pub.target}</h2>
              )}
            </section>
          ) : null}

          {/* ── placar ── */}
          <section className="sint-panel sint-roster">
            <div className="sint-roster-head">
              <h2>Placar</h2>
              <button type="button" className="sint-howto-open" onClick={() => setShowHowTo(true)}>? Como jogar</button>
            </div>
            <ul className="sint-score-list">
              {pub.standings.map((s, i) => (
                <li key={s.playerId} className={s.playerId === playerId ? 'is-mine' : ''}>
                  <span className="sint-score-rank">{i + 1}º</span>
                  {avatarOf(s.playerId) ? <Avatar spec={avatarOf(s.playerId)!} size={24} /> : null}
                  <span className="sint-score-name">
                    {s.name}
                    {s.playerId === playerId ? ' (você)' : ''}
                    {s.playerId === pub.mediumId ? ' 🔮' : ''}
                  </span>
                  <span className="sint-score-pts">{s.score}</span>
                </li>
              ))}
            </ul>
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
