import { useMemo, useState } from 'react';
import type { FdpPrivateState, FdpPublicState } from '@party/shared';
import { Avatar, TextAnswerInput, Timer } from '@party/ui';
import { MobileHeader } from '../../shell/MobileHeader';
import type { ControllerGameViewProps } from '../types';
import { HowToPlay } from './HowToPlay';
import './fdp-controller.css';

const REACTION_EMOJIS = ['😂', '🔥', '👏', '😮', '💀', '🍆'];

export function FdpControllerView({
  publicState,
  privateState,
  playerId,
  connected,
  roomCode,
  roomPlayers,
  reactions,
  send,
}: ControllerGameViewProps) {
  const pub = publicState as FdpPublicState;
  const priv = privateState as FdpPrivateState;
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
  const wonRound = pub.roundWinnerId === playerId;

  let banner = '';
  if (decision === 'write') banner = isFinal ? '🔥 Final FDP — capricha!' : 'Complete a frase';
  else if (decision === 'vote') banner = 'Vote na melhor resposta';
  else if (decision === 'wait' && pub.phase === 'writing') banner = 'Resposta enviada! Aguardando…';
  else if (decision === 'wait' && pub.phase === 'voting') banner = 'Voto dado! Aguardando…';
  else if (pub.phase === 'roundResults') banner = `Fim da rodada ${pub.round}`;

  return (
    <>
      <MobileHeader roomCode={roomCode} connected={connected}>
        {!paused && !over ? <Timer seconds={timerSeconds} active={decision === 'write' || decision === 'vote'} /> : null}
      </MobileHeader>

      {showHowTo ? <HowToPlay onClose={() => setShowHowTo(false)} /> : null}

      {paused ? (
        <section className="fdp-panel fdp-center">
          <div className="fdp-big">⏸</div>
          <h2>Partida pausada</h2>
          <p className="hint">Aguardando o anfitrião continuar…</p>
        </section>
      ) : over ? (
        <section className="fdp-panel fdp-center">
          <h2>{pub.winnerId === playerId ? '🏆 Você venceu!' : `🏆 ${nameOf(pub.winnerId)} venceu`}</h2>
          {myRank ? <p className="hint">Você terminou em {myRank}º ({myStanding?.score ?? 0} pts)</p> : null}
          <p className="hint">Aguarde o anfitrião iniciar uma nova partida.</p>
        </section>
      ) : (
        <>
          <section className={`fdp-banner ${decision === 'write' || decision === 'vote' ? 'is-live' : ''}`}>
            {banner}
            <span className="fdp-round-tag">{isFinal ? 'Final FDP' : `Rodada ${pub.round}/${pub.totalRounds}`}</span>
          </section>

          {pub.prompt ? <p className="fdp-prompt">{pub.prompt}</p> : null}

          {/* ── writing ── */}
          {pub.phase === 'writing' ? (
            <section className="fdp-panel">
              <TextAnswerInput
                key={`ans-${pub.round}`}
                prompt="Sua resposta"
                placeholder="Sem vergonha…"
                maxLength={100}
                submittedText={priv.myAnswer}
                onSubmit={(text) => act({ type: 'submitAnswer', text })}
              />
              {priv.pendingDecision === 'wait' ? <p className="fdp-done">✅ Resposta enviada</p> : null}
            </section>
          ) : null}

          {/* ── voting ── */}
          {pub.phase === 'voting' ? (
            <section className="fdp-panel">
              {priv.voteOptions.length === 0 ? (
                <p className="hint">Ninguém pra votar além de você 😅 Aguardando…</p>
              ) : (
                <div className="fdp-vote-opts">
                  {priv.voteOptions.map((o) => {
                    const chosen = priv.myVoteId === o.id;
                    const locked = priv.myVoteId !== null;
                    return (
                      <button
                        key={o.id}
                        type="button"
                        className={`fdp-vote-btn ${chosen ? 'is-chosen' : ''}`}
                        disabled={locked}
                        onClick={() => act({ type: 'castVote', answerId: o.id })}
                      >
                        {o.text}
                        {chosen ? <span className="fdp-vote-check">✓ seu voto</span> : null}
                      </button>
                    );
                  })}
                </div>
              )}
              {priv.myVoteId !== null ? <p className="hint">Voto registrado. Aguardando os outros…</p> : null}
            </section>
          ) : null}

          {/* ── roundResults ── */}
          {pub.phase === 'roundResults' ? (
            <section className="fdp-panel fdp-center">
              {wonRound ? <div className="fdp-cheer">👑 Sua resposta ganhou a rodada!</div> : null}
              <h2>Rodada {pub.round}</h2>
              <p className="fdp-round-score">
                {priv.myRoundVotes > 0 ? `${priv.myRoundVotes} voto${priv.myRoundVotes === 1 ? '' : 's'} · ` : 'Sem votos · '}
                {myStanding && myStanding.roundPoints > 0 ? `+${myStanding.roundPoints}` : '+0'} nesta rodada
              </p>
              <p className="hint">{myStanding?.score ?? 0} no total</p>
            </section>
          ) : null}

          {/* ── standings + reactions ── */}
          <section className="fdp-panel fdp-roster">
            <div className="fdp-roster-head">
              <h2>Placar</h2>
              <button type="button" className="fdp-howto-open" onClick={() => setShowHowTo(true)}>? Como jogar</button>
            </div>
            <ul>
              {[...pub.players]
                .sort((a, b) => b.score - a.score)
                .map((p) => (
                  <li key={p.id} className={p.id === playerId ? 'is-me' : ''}>
                    <span className="fdp-roster-who">
                      {avatarOf(p.id) ? <Avatar spec={avatarOf(p.id)!} size={30} /> : null}
                      {p.name}
                      {p.id === playerId ? ' (você)' : ''}
                    </span>
                    <span className="fdp-roster-score">{p.score}</span>
                  </li>
                ))}
            </ul>
          </section>

          <section className="fdp-reactions-bar" aria-label="Reações">
            {REACTION_EMOJIS.map((e) => (
              <button key={e} type="button" onClick={() => send('SEND_REACTION', { reaction: e })}>
                {e}
              </button>
            ))}
          </section>
        </>
      )}

      <div className="fdp-reaction-feed" aria-live="polite">
        {reactions.slice(-4).map((r) => (
          <div key={r.key} className="fdp-reaction-pop">
            <span>{r.reaction}</span>
            <small>{nameOf(r.playerId)}</small>
          </div>
        ))}
      </div>
    </>
  );
}
