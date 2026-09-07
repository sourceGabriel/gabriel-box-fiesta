import { useMemo, useState } from 'react';
import type { ZapPrivateState, ZapPublicState } from '@party/shared';
import { Avatar, TextAnswerInput, Timer } from '@party/ui';
import { MobileHeader } from '../../shell/MobileHeader';
import type { ControllerGameViewProps } from '../types';
import { HowToPlay } from './HowToPlay';
import './zap-controller.css';

const REACTION_EMOJIS = ['😂', '🔥', '👏', '😮', '💀', '❤️'];

export function ZapControllerView({
  publicState,
  privateState,
  playerId,
  connected,
  roomCode,
  roomPlayers,
  reactions,
  send,
}: ControllerGameViewProps) {
  const pub = publicState as ZapPublicState;
  const priv = privateState as ZapPrivateState;
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
  const decision = priv.pendingDecision;
  const paused = pub.phase === 'paused';
  const over = pub.phase === 'gameover';
  const isFinal = pub.roundKind === 'final';

  const myStanding = pub.standings.find((s) => s.playerId === playerId);
  const myRank = myStanding ? pub.standings.findIndex((s) => s.playerId === playerId) + 1 : null;

  let banner = '';
  if (decision === 'answer') banner = isFinal ? '🔥 Última Chance — escreva!' : 'Escreva suas respostas';
  else if (decision === 'vote') banner = 'Vote na melhor resposta';
  else if (decision === 'wait' && pub.phase === 'answering') banner = 'Enviado! Aguardando os outros…';
  else if (decision === 'wait' && pub.phase === 'voting') banner = 'Aguardando os votos…';
  else if (pub.phase === 'roundResults') banner = `Fim da rodada ${pub.round}`;

  return (
    <>
      <MobileHeader roomCode={roomCode} connected={connected}>
        {!paused && !over ? <Timer seconds={timerSeconds} active={decision === 'answer' || decision === 'vote'} /> : null}
      </MobileHeader>

      {showHowTo ? <HowToPlay onClose={() => setShowHowTo(false)} /> : null}

      {paused ? (
        <section className="zap-panel zap-center">
          <div className="zap-badge">⏸</div>
          <h2>Partida pausada</h2>
          <p className="hint">Aguardando o anfitrião continuar…</p>
        </section>
      ) : over ? (
        <section className="zap-panel zap-center">
          <h2>{pub.winnerId === playerId ? '🏆 Você venceu!' : `🏆 ${nameOf(pub.winnerId)} venceu`}</h2>
          {myRank ? <p className="hint">Você terminou em {myRank}º ({myStanding?.score ?? 0} pts)</p> : null}
          <p className="hint">Aguarde o anfitrião iniciar uma nova partida.</p>
        </section>
      ) : (
        <>
          <section className={`zap-banner ${decision === 'answer' || decision === 'vote' ? 'is-live' : ''}`}>
            {banner}
            <span className="zap-round-tag">{isFinal ? 'Última Chance' : `Rodada ${pub.round}/${pub.totalRounds}`}</span>
          </section>

          {/* ── answering ── */}
          {pub.phase === 'answering' && priv.assignments.length > 0 ? (
            <section className="zap-panel zap-answers">
              {priv.assignments.map((a) => (
                <TextAnswerInput
                  key={`${pub.round}-${a.slot}`}
                  prompt={a.prompt}
                  maxLength={80}
                  submittedText={a.answer}
                  onSubmit={(text) => act({ type: 'submitAnswer', slot: a.slot, text })}
                />
              ))}
              {priv.submittedAll ? <p className="zap-done">✅ Tudo enviado — pode relaxar</p> : null}
            </section>
          ) : null}

          {pub.phase === 'answering' && priv.assignments.length === 0 ? (
            <section className="zap-panel zap-center">
              <p className="hint">Entrou no meio da rodada — aguarde a próxima.</p>
            </section>
          ) : null}

          {/* ── voting ── */}
          {pub.phase === 'voting' && priv.ballot ? (
            <section className="zap-panel zap-ballot">
              <p className="zap-ballot-prompt">{priv.ballot.prompt}</p>
              <div className="zap-ballot-opts">
                {priv.ballot.options.map((o) => {
                  const chosen = priv.ballot!.votedSlot === o.slot;
                  const locked = priv.ballot!.votedSlot !== null;
                  return (
                    <button
                      key={o.slot}
                      type="button"
                      className={`zap-vote-btn ${chosen ? 'is-chosen' : ''}`}
                      disabled={locked}
                      onClick={() => act({ type: 'castVote', duelIndex: priv.ballot!.duelIndex, slot: o.slot })}
                    >
                      {o.text}
                      {chosen ? <span className="zap-vote-check">✓ seu voto</span> : null}
                    </button>
                  );
                })}
              </div>
              {priv.ballot.votedSlot !== null ? <p className="hint">Voto registrado. Aguardando os outros…</p> : null}
            </section>
          ) : null}

          {pub.phase === 'voting' && !priv.ballot ? (
            <section className="zap-panel zap-center">
              <p className="hint">
                {decision === 'wait' ? 'Você está neste duelo — sem voto aqui.' : 'Aguardando a votação…'}
              </p>
            </section>
          ) : null}

          {/* ── round results ── */}
          {pub.phase === 'roundResults' ? (
            <section className="zap-panel zap-center">
              {myStanding && myStanding.roundPoints > 0 ? (
                <div className="zap-cheer">⚡ +{myStanding.roundPoints} ⚡</div>
              ) : null}
              <h2>Rodada {pub.round} encerrada</h2>
              {myStanding ? (
                <p className="zap-round-score">
                  {myStanding.roundPoints > 0 ? `Você fez ${myStanding.roundPoints} nesta rodada` : 'Sem pontos nesta rodada'}
                  {' · '}
                  {myStanding.score} no total
                </p>
              ) : null}
            </section>
          ) : null}

          {/* ── standings + reactions ── */}
          <section className="zap-panel zap-roster">
            <div className="zap-roster-head">
              <h2>Placar</h2>
              <button type="button" className="zap-howto-open" onClick={() => setShowHowTo(true)}>? Como jogar</button>
            </div>
            <ul>
              {[...pub.players]
                .sort((a, b) => b.score - a.score)
                .map((p) => (
                  <li key={p.id} className={p.id === playerId ? 'is-me' : ''}>
                    <span className="zap-roster-who">
                      {avatarOf(p.id) ? <Avatar spec={avatarOf(p.id)!} size={20} /> : null}
                      {p.name}
                      {p.id === playerId ? ' (você)' : ''}
                    </span>
                    <span className="zap-roster-score">{p.score}</span>
                  </li>
                ))}
            </ul>
          </section>

          <section className="zap-reactions-bar" aria-label="Reações">
            {REACTION_EMOJIS.map((e) => (
              <button key={e} type="button" onClick={() => send('SEND_REACTION', { reaction: e })}>
                {e}
              </button>
            ))}
          </section>
        </>
      )}

      <div className="zap-reaction-feed" aria-live="polite">
        {reactions.slice(-4).map((r) => (
          <div key={r.key} className="zap-reaction-pop">
            <span>{r.reaction}</span>
            <small>{nameOf(r.playerId)}</small>
          </div>
        ))}
      </div>
    </>
  );
}
