import { useMemo, useState } from 'react';
import type { LorotaPrivateState, LorotaPublicState } from '@party/shared';
import { Avatar, TextAnswerInput, Timer } from '@party/ui';
import { MobileHeader } from '../../shell/MobileHeader';
import type { ControllerGameViewProps } from '../types';
import { HowToPlay } from './HowToPlay';
import './lorota-controller.css';

const REACTION_EMOJIS = ['😂', '🔥', '👏', '😮', '💀', '❤️'];

export function LorotaControllerView({
  publicState,
  privateState,
  playerId,
  connected,
  roomCode,
  roomPlayers,
  reactions,
  send,
}: ControllerGameViewProps) {
  const pub = publicState as LorotaPublicState;
  const priv = privateState as LorotaPrivateState;
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
  if (decision === 'lie') banner = isFinal ? '🔥 Lorota Final — minta bem!' : 'Invente uma resposta falsa';
  else if (decision === 'guess') banner = 'Ache a verdade';
  else if (decision === 'wait' && pub.phase === 'lying') banner = 'Mentira enviada! Aguardando…';
  else if (decision === 'wait' && pub.phase === 'guessing') banner = 'Palpite dado! Aguardando…';
  else if (pub.phase === 'reveal') banner = `Fim da rodada ${pub.round}`;

  return (
    <>
      <MobileHeader roomCode={roomCode} connected={connected}>
        {!paused && !over ? <Timer seconds={timerSeconds} active={decision === 'lie' || decision === 'guess'} /> : null}
      </MobileHeader>

      {showHowTo ? <HowToPlay onClose={() => setShowHowTo(false)} /> : null}

      {paused ? (
        <section className="lorota-panel lorota-center">
          <div className="lorota-badge">⏸</div>
          <h2>Partida pausada</h2>
          <p className="hint">Aguardando o anfitrião continuar…</p>
        </section>
      ) : over ? (
        <section className="lorota-panel lorota-center">
          <h2>{pub.winnerId === playerId ? '🏆 Você venceu!' : `🏆 ${nameOf(pub.winnerId)} venceu`}</h2>
          {myRank ? <p className="hint">Você terminou em {myRank}º ({myStanding?.score ?? 0} pts)</p> : null}
          <p className="hint">Aguarde o anfitrião iniciar uma nova partida.</p>
        </section>
      ) : (
        <>
          <section className={`lorota-banner ${decision === 'lie' || decision === 'guess' ? 'is-live' : ''}`}>
            {banner}
            <span className="lorota-round-tag">{isFinal ? 'Lorota Final' : `Rodada ${pub.round}/${pub.totalRounds}`}</span>
          </section>

          {pub.prompt ? <p className="lorota-prompt">{pub.prompt}</p> : null}

          {/* ── lying ── */}
          {pub.phase === 'lying' ? (
            <section className="lorota-panel">
              <TextAnswerInput
                key={`lie-${pub.round}`}
                prompt="Sua resposta falsa"
                placeholder="Algo convincente mas mentira…"
                maxLength={90}
                submittedText={priv.myLie}
                onSubmit={(text) => act({ type: 'submitLie', text })}
              />
              {priv.lieWasTheTruth ? (
                <p className="lorota-warn">😅 Essa é a resposta verdadeira! Invente outra.</p>
              ) : null}
              {priv.pendingDecision === 'wait' ? <p className="lorota-done">✅ Mentira enviada</p> : null}
            </section>
          ) : null}

          {/* ── guessing ── */}
          {pub.phase === 'guessing' ? (
            <section className="lorota-panel">
              <div className="lorota-guess-opts">
                {priv.guessOptions.map((o) => {
                  const chosen = priv.myGuessId === o.id;
                  const locked = priv.myGuessId !== null;
                  return (
                    <button
                      key={o.id}
                      type="button"
                      className={`lorota-guess-btn ${chosen ? 'is-chosen' : ''}`}
                      disabled={locked}
                      onClick={() => act({ type: 'submitGuess', optionId: o.id })}
                    >
                      {o.text}
                      {chosen ? <span className="lorota-guess-check">✓ seu palpite</span> : null}
                    </button>
                  );
                })}
              </div>
              {priv.myGuessId !== null ? <p className="hint">Palpite registrado. Aguardando os outros…</p> : null}
            </section>
          ) : null}

          {/* ── reveal ── */}
          {pub.phase === 'reveal' ? (
            <section className="lorota-panel lorota-center">
              {priv.foundTruth ? <div className="lorota-cheer">✅ Você achou a verdade!</div> : null}
              <h2>Rodada {pub.round}</h2>
              <p className="lorota-round-score">
                {myStanding && myStanding.roundPoints > 0
                  ? `+${myStanding.roundPoints} nesta rodada`
                  : 'Sem pontos nesta rodada'}
                {' · '}
                {myStanding?.score ?? 0} no total
              </p>
              <p className="hint">A verdade era: <strong>{pub.truthText}</strong></p>
            </section>
          ) : null}

          {/* ── standings + reactions ── */}
          <section className="lorota-panel lorota-roster">
            <div className="lorota-roster-head">
              <h2>Placar</h2>
              <button type="button" className="lorota-howto-open" onClick={() => setShowHowTo(true)}>? Como jogar</button>
            </div>
            <ul>
              {[...pub.players]
                .sort((a, b) => b.score - a.score)
                .map((p) => (
                  <li key={p.id} className={p.id === playerId ? 'is-me' : ''}>
                    <span className="lorota-roster-who">
                      {avatarOf(p.id) ? <Avatar spec={avatarOf(p.id)!} size={30} /> : null}
                      {p.name}
                      {p.id === playerId ? ' (você)' : ''}
                    </span>
                    <span className="lorota-roster-score">{p.score}</span>
                  </li>
                ))}
            </ul>
          </section>

          <section className="lorota-reactions-bar" aria-label="Reações">
            {REACTION_EMOJIS.map((e) => (
              <button key={e} type="button" onClick={() => send('SEND_REACTION', { reaction: e })}>
                {e}
              </button>
            ))}
          </section>
        </>
      )}

      <div className="lorota-reaction-feed" aria-live="polite">
        {reactions.slice(-4).map((r) => (
          <div key={r.key} className="lorota-reaction-pop">
            <span>{r.reaction}</span>
            <small>{nameOf(r.playerId)}</small>
          </div>
        ))}
      </div>
    </>
  );
}
