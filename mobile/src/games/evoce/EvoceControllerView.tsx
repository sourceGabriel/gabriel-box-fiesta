import { useMemo, useState } from 'react';
import type { EvocePrivateState, EvocePublicState } from '@party/shared';
import { Avatar, DrawingCanvas, DrawingView, TextAnswerInput, Timer } from '@party/ui';
import { MobileHeader } from '../../shell/MobileHeader';
import type { ControllerGameViewProps } from '../types';
import { HowToPlay } from './HowToPlay';
import './evoce-controller.css';

const REACTION_EMOJIS = ['😂', '🔥', '👏', '😮', '💀', '🫵'];
const KIND_LABEL: Record<string, string> = { enquete: 'Enquete', legenda: 'Legenda', rabisco: 'Rabisco', final: 'A Obra-Prima' };

export function EvoceControllerView({
  publicState,
  privateState,
  playerId,
  connected,
  roomCode,
  roomPlayers,
  reactions,
  send,
}: ControllerGameViewProps) {
  const pub = publicState as EvocePublicState;
  const priv = privateState as EvocePrivateState;
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

  const active = decision === 'vote_player' || decision === 'write' || decision === 'draw' || decision === 'vote_submission';

  let banner = '';
  if (decision === 'vote_player') banner = 'Quem de vocês?';
  else if (decision === 'write') banner = 'Complete a frase';
  else if (decision === 'draw') banner = isFinal ? '🎨 Se desenhe — vale o dobro' : '🎨 Desenhe';
  else if (decision === 'vote_submission') banner = 'Vote na melhor';
  else if (priv.isDrawTarget && pub.phase === 'answering') banner = 'Você é o modelo';
  else if (decision === 'wait') banner = 'Enviado! Aguardando…';
  else if (pub.phase === 'roundResults') banner = `Fim da rodada ${pub.round}`;

  return (
    <>
      <MobileHeader roomCode={roomCode} connected={connected}>
        {!paused && !over ? <Timer seconds={timerSeconds} active={active} /> : null}
      </MobileHeader>

      {showHowTo ? <HowToPlay onClose={() => setShowHowTo(false)} /> : null}

      {paused ? (
        <section className="evoce-panel evoce-center">
          <div className="evoce-big">⏸</div>
          <h2>Partida pausada</h2>
          <p className="hint">Aguardando o anfitrião continuar…</p>
        </section>
      ) : over ? (
        <section className="evoce-panel evoce-center">
          <h2>{pub.winnerId === playerId ? '🏆 Você venceu!' : `🏆 ${nameOf(pub.winnerId)} venceu`}</h2>
          {myRank ? <p className="hint">Você terminou em {myRank}º ({myStanding?.score ?? 0} pts)</p> : null}
          <p className="hint">Aguarde o anfitrião iniciar uma nova partida.</p>
        </section>
      ) : (
        <>
          <section className={`evoce-banner ${active ? 'is-live' : ''}`}>
            {banner}
            <span className="evoce-round-tag">Rodada {pub.round}/{pub.totalRounds} · {KIND_LABEL[pub.roundKind] ?? pub.roundKind}</span>
          </section>

          {pub.prompt ? <p className="evoce-prompt">{pub.prompt}</p> : null}

          {/* ── enquete: vote a player ── */}
          {pub.phase === 'answering' && pub.roundKind === 'enquete' ? (
            <section className="evoce-panel">
              <div className="evoce-ballot">
                {pub.players.map((p) => {
                  const chosen = priv.myPlayerVote === p.id;
                  const locked = priv.myPlayerVote !== null;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      className={`evoce-ballot-btn ${chosen ? 'is-chosen' : ''}`}
                      disabled={locked}
                      onClick={() => act({ type: 'votePlayer', targetId: p.id })}
                    >
                      {avatarOf(p.id) ? <Avatar spec={avatarOf(p.id)!} size={28} /> : null}
                      <span>{p.name}{p.id === playerId ? ' (você)' : ''}</span>
                      {chosen ? <span className="evoce-check">✓</span> : null}
                    </button>
                  );
                })}
              </div>
              <button
                type="button"
                className={`evoce-joker ${priv.jokerPlayed ? 'is-played' : ''}`}
                disabled={priv.jokerPlayed || priv.jokersLeft === 0}
                onClick={() => act({ type: 'playJoker' })}
              >
                {priv.jokerPlayed ? '🃏 Curinga jogado — se acertar o consenso, pontos ×2' : `🃏 Jogar Curinga (${priv.jokersLeft})`}
              </button>
            </section>
          ) : null}

          {/* ── legenda: caption ── */}
          {pub.phase === 'answering' && pub.roundKind === 'legenda' ? (
            <section className="evoce-panel">
              <TextAnswerInput
                key={`cap-${pub.round}`}
                prompt="Sua legenda"
                placeholder="Manda a melhor…"
                maxLength={100}
                submittedText={priv.mySubmissionText}
                onSubmit={(text) => act({ type: 'submitCaption', text })}
              />
              {priv.pendingDecision === 'wait' ? <p className="evoce-done">✅ Legenda enviada</p> : null}
            </section>
          ) : null}

          {/* ── rabisco / final: draw ── */}
          {pub.phase === 'answering' && (pub.roundKind === 'rabisco' || pub.roundKind === 'final') ? (
            priv.isDrawTarget ? (
              <section className="evoce-panel evoce-center">
                {avatarOf(playerId) ? <Avatar spec={avatarOf(playerId)!} size={72} /> : null}
                <h2>Você é o modelo!</h2>
                <p className="hint">A galera vai te desenhar. Relaxa e aguarda a votação.</p>
              </section>
            ) : (
              <section className="evoce-panel">
                <DrawingCanvas
                  key={`draw-${pub.round}`}
                  submitted={priv.mySubmissionDrawing != null}
                  onSubmit={(drawing) => act({ type: 'submitDrawing', drawing })}
                />
                {priv.mySubmissionDrawing != null ? <p className="evoce-done">✅ Desenho enviado</p> : null}
              </section>
            )
          ) : null}

          {/* ── voting ── */}
          {pub.phase === 'voting' ? (
            <section className="evoce-panel">
              {priv.voteOptions.length === 0 ? (
                <p className="hint">Nada pra votar além do seu 😅 Aguardando…</p>
              ) : priv.voteOptions[0].kind === 'drawing' ? (
                <div className="evoce-vote-grid">
                  {priv.voteOptions.map((o) => {
                    const chosen = priv.myVoteId === o.id;
                    return (
                      <button
                        key={o.id}
                        type="button"
                        className={`evoce-vote-draw ${chosen ? 'is-chosen' : ''}`}
                        disabled={priv.myVoteId !== null}
                        onClick={() => act({ type: 'castVote', submissionId: o.id })}
                      >
                        <DrawingView drawing={o.drawing} />
                        {chosen ? <span className="evoce-check">✓ seu voto</span> : null}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="evoce-vote-list">
                  {priv.voteOptions.map((o) => {
                    const chosen = priv.myVoteId === o.id;
                    return (
                      <button
                        key={o.id}
                        type="button"
                        className={`evoce-vote-cap ${chosen ? 'is-chosen' : ''}`}
                        disabled={priv.myVoteId !== null}
                        onClick={() => act({ type: 'castVote', submissionId: o.id })}
                      >
                        {o.text}
                        {chosen ? <span className="evoce-check">✓ seu voto</span> : null}
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
            <section className="evoce-panel evoce-center">
              {pub.roundKind === 'enquete' && priv.matchedGroup ? <div className="evoce-cheer ok">✅ Você votou com a maioria!</div> : null}
              {pub.roundWinnerId === playerId && pub.roundKind !== 'enquete' ? <div className="evoce-cheer ok">👑 Sua resposta ganhou!</div> : null}
              <h2>Rodada {pub.round}</h2>
              <p className="evoce-round-score">
                {priv.myRoundPoints > 0 ? `+${priv.myRoundPoints}` : '+0'} nesta rodada · {myStanding?.score ?? 0} no total
              </p>
            </section>
          ) : null}

          {/* ── standings + reactions ── */}
          <section className="evoce-panel evoce-roster">
            <div className="evoce-roster-head">
              <h2>Placar</h2>
              <button type="button" className="evoce-howto-open" onClick={() => setShowHowTo(true)}>? Como jogar</button>
            </div>
            <ul>
              {[...pub.players].sort((a, b) => b.score - a.score).map((p) => (
                <li key={p.id} className={p.id === playerId ? 'is-me' : ''}>
                  <span className="evoce-roster-who">
                    {avatarOf(p.id) ? <Avatar spec={avatarOf(p.id)!} size={20} /> : null}
                    {p.name}{p.id === playerId ? ' (você)' : ''}
                    <span className="evoce-jk">{'🃏'.repeat(p.jokersLeft)}</span>
                  </span>
                  <span className="evoce-roster-score">{p.score}</span>
                </li>
              ))}
            </ul>
          </section>

          <section className="evoce-reactions-bar" aria-label="Reações">
            {REACTION_EMOJIS.map((e) => (
              <button key={e} type="button" onClick={() => send('SEND_REACTION', { reaction: e })}>{e}</button>
            ))}
          </section>
        </>
      )}

      <div className="evoce-reaction-feed" aria-live="polite">
        {reactions.slice(-4).map((r) => (
          <div key={r.key} className="evoce-reaction-pop"><span>{r.reaction}</span><small>{nameOf(r.playerId)}</small></div>
        ))}
      </div>
    </>
  );
}
