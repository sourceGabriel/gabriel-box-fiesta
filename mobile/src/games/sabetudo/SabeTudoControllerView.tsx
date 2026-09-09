import { useMemo, useState } from 'react';
import type { SabeTudoPrivateState, SabeTudoPublicState } from '@party/shared';
import { Avatar, Timer } from '@party/ui';
import { MobileHeader } from '../../shell/MobileHeader';
import type { ControllerGameViewProps } from '../types';
import { HowToPlay } from './HowToPlay';
import './sabetudo-controller.css';

const REACTION_EMOJIS = ['😂', '🔥', '👏', '😮', '💀', '❤️'];
const LETTERS = ['A', 'B', 'C', 'D'];

export function SabeTudoControllerView({
  publicState,
  privateState,
  playerId,
  connected,
  roomCode,
  roomPlayers,
  reactions,
  send,
}: ControllerGameViewProps) {
  const pub = publicState as SabeTudoPublicState;
  const priv = privateState as SabeTudoPrivateState;
  const [showHowTo, setShowHowTo] = useState(false);

  const avatarOf = useMemo(() => {
    const map = new Map(roomPlayers.map((p) => [p.id, p.avatar] as const));
    return (id: string) => map.get(id);
  }, [roomPlayers]);
  const nameOf = useMemo(() => {
    const map = new Map(pub.players.map((p) => [p.id, p.name] as const));
    return (id: string | null | undefined) => (id ? (map.get(id) ?? '—') : '—');
  }, [pub.players]);

  const act = (optionIndex: number) => send('GAME_ACTION', { action: { type: 'submitAnswer', optionIndex } });

  const timerSeconds = pub.timer ? Math.max(0, Math.ceil(pub.timer.remainingMs / 1000)) : null;
  const decision = priv.pendingDecision;
  const paused = pub.phase === 'paused';
  const over = pub.phase === 'gameover';

  const myStanding = pub.standings.find((s) => s.playerId === playerId);
  const myRank = myStanding ? pub.standings.findIndex((s) => s.playerId === playerId) + 1 : null;

  let banner = '';
  if (decision === 'answer') banner = 'Escolha a resposta certa — rápido!';
  else if (decision === 'wait') banner = 'Resposta enviada! Aguardando…';
  else if (pub.phase === 'reveal') banner = `Pergunta ${pub.round}`;

  return (
    <>
      <MobileHeader roomCode={roomCode} connected={connected}>
        {!paused && !over ? <Timer seconds={timerSeconds} active={decision === 'answer'} /> : null}
      </MobileHeader>

      {showHowTo ? <HowToPlay onClose={() => setShowHowTo(false)} /> : null}

      {paused ? (
        <section className="sabetudo-panel sabetudo-center">
          <div className="sabetudo-big">⏸</div>
          <h2>Partida pausada</h2>
          <p className="hint">Aguardando o anfitrião continuar…</p>
          <button type="button" className="sabetudo-howto-open" onClick={() => setShowHowTo(true)}>? Como jogar</button>
        </section>
      ) : over ? (
        <section className="sabetudo-panel sabetudo-center">
          <h2>{pub.winnerId === playerId ? '🏆 Você venceu!' : `🏆 ${nameOf(pub.winnerId)} venceu`}</h2>
          {myRank ? <p className="hint">Você terminou em {myRank}º ({myStanding?.score ?? 0} pts)</p> : null}
          <p className="hint">Aguarde o anfitrião iniciar uma nova partida.</p>
        </section>
      ) : (
        <>
          <section className={`sabetudo-banner ${decision === 'answer' ? 'is-live' : ''}`}>
            {banner}
            <span className="sabetudo-round-tag">Pergunta {pub.round}/{pub.totalRounds}</span>
          </section>

          {pub.category ? <p className="sabetudo-category">{pub.category}</p> : null}
          {pub.question ? <p className="sabetudo-prompt">{pub.question}</p> : null}

          {/* ── question ── */}
          {pub.phase === 'question' ? (
            <section className="sabetudo-panel">
              <div className="sabetudo-answer-grid">
                {pub.options.map((opt, i) => {
                  const chosen = priv.myAnswerIndex === i;
                  const locked = priv.myAnswerIndex !== null;
                  return (
                    <button
                      key={i}
                      type="button"
                      className={`sabetudo-answer-btn ${chosen ? 'is-chosen' : ''}`}
                      disabled={locked}
                      onClick={() => act(i)}
                    >
                      <span className="sabetudo-answer-letter">{LETTERS[i]}</span>
                      <span className="sabetudo-answer-text">{opt}</span>
                    </button>
                  );
                })}
              </div>
              {priv.myAnswerIndex !== null ? <p className="hint">Resposta travada. Aguardando os outros…</p> : null}
            </section>
          ) : null}

          {/* ── reveal ── */}
          {pub.phase === 'reveal' ? (
            <section className="sabetudo-panel sabetudo-center">
              {priv.lastAnswerCorrect === true ? (
                <div className="sabetudo-cheer ok">✅ Acertou! +{myStanding?.roundPoints ?? 0}</div>
              ) : priv.lastAnswerCorrect === false ? (
                <div className="sabetudo-cheer bad">❌ Errou — era a {LETTERS[pub.correctIndex ?? 0]}</div>
              ) : (
                <div className="sabetudo-cheer bad">⏰ Sem resposta — era a {LETTERS[pub.correctIndex ?? 0]}</div>
              )}
              {priv.streak >= 2 ? <p className="sabetudo-streak-tag">🔥 Sequência de {priv.streak}</p> : null}
              <p className="sabetudo-total">{myStanding?.score ?? 0} pontos no total</p>
            </section>
          ) : null}

          {/* ── standings + reactions ── */}
          <section className="sabetudo-panel sabetudo-roster">
            <div className="sabetudo-roster-head">
              <h2>Placar</h2>
              <button type="button" className="sabetudo-howto-open" onClick={() => setShowHowTo(true)}>? Como jogar</button>
            </div>
            <ul>
              {[...pub.players]
                .sort((a, b) => b.score - a.score)
                .map((p) => (
                  <li key={p.id} className={p.id === playerId ? 'is-me' : ''}>
                    <span className="sabetudo-roster-who">
                      {avatarOf(p.id) ? <Avatar spec={avatarOf(p.id)!} size={30} /> : null}
                      {p.name}
                      {p.id === playerId ? ' (você)' : ''}
                    </span>
                    <span className="sabetudo-roster-score">{p.score}</span>
                  </li>
                ))}
            </ul>
          </section>

          <section className="sabetudo-reactions-bar" aria-label="Reações">
            {REACTION_EMOJIS.map((e) => (
              <button key={e} type="button" onClick={() => send('SEND_REACTION', { reaction: e })}>
                {e}
              </button>
            ))}
          </section>
        </>
      )}

      <div className="sabetudo-reaction-feed" aria-live="polite">
        {reactions.slice(-4).map((r) => (
          <div key={r.key} className="sabetudo-reaction-pop">
            <span>{r.reaction}</span>
            <small>{nameOf(r.playerId)}</small>
          </div>
        ))}
      </div>
    </>
  );
}
