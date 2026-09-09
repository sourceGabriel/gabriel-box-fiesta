import { useEffect, useMemo, useState } from 'react';
import type {
  DilemaCandidate,
  DilemaPrivateState,
  DilemaPublicState,
  DilemaStep,
  DilemaTrack,
} from '@party/shared';
import { Avatar } from '@party/ui';
import { MobileHeader } from '../../shell/MobileHeader';
import type { ControllerGameViewProps } from '../types';
import { HowToPlay } from './HowToPlay';
import './dilema-controller.css';

const REACTION_EMOJIS = ['😂', '🔥', '😱', '😈', '💀', '🙏'];
const TYPE_ICON: Record<string, string> = { innocent: '😇', guilty: '😈', modifier: '✨' };
const STEP_NUM: Record<DilemaStep, number> = { innocent: 1, guilty: 2, modifier: 3 };
const STEP_TITLE: Record<DilemaStep, string> = {
  innocent: 'Inocente pro seu trilho',
  guilty: 'Culpado pro trilho inimigo',
  modifier: 'Modificador — e onde grudar',
};

export function DilemaControllerView({
  publicState,
  privateState,
  playerId,
  connected,
  roomCode,
  roomPlayers,
  reactions,
  send,
}: ControllerGameViewProps) {
  const pub = publicState as DilemaPublicState;
  const priv = privateState as DilemaPrivateState;
  const [showHowTo, setShowHowTo] = useState(false);
  const [pendingModifier, setPendingModifier] = useState<DilemaCandidate | null>(null);

  const avatarOf = useMemo(() => {
    const map = new Map(roomPlayers.map((p) => [p.id, p.avatar] as const));
    return (id: string) => map.get(id);
  }, [roomPlayers]);
  const nameOf = useMemo(() => {
    const map = new Map(pub.players.map((p) => [p.id, p.name] as const));
    return (id: string | null | undefined) => (id ? (map.get(id) ?? '—') : '—');
  }, [pub.players]);

  const act = (action: Record<string, unknown>) => send('GAME_ACTION', { action });

  const paused = pub.phase === 'paused';
  const over = pub.phase === 'gameover';
  const inPicks = pub.phase === 'pickInnocent' || pub.phase === 'pickGuilty' || pub.phase === 'pickModifier';
  const myTrack = priv.myTrack;
  const isConductor = priv.isConductor;
  const step = priv.step;

  const myStanding = pub.standings.find((s) => s.playerId === playerId);
  const myRank = myStanding ? pub.standings.findIndex((s) => s.playerId === playerId) + 1 : null;
  const spared = pub.sparedTrack && myTrack === pub.sparedTrack;
  const myPick = !isConductor && myTrack ? pub.tracks[myTrack].pick : null;
  const teamLocked = myPick?.locked ?? false;

  const propose = (cand: DilemaCandidate, targetCardId?: string) => {
    act({ type: 'propose', cardId: cand.id, targetCardId });
    setPendingModifier(null);
  };

  // Drop a half-open modifier-target picker when the step / phase moves on.
  useEffect(() => {
    if (pub.phase !== 'pickModifier') setPendingModifier(null);
  }, [pub.phase]);

  let banner = '';
  if (pub.phase === 'assigning')
    banner = isConductor
      ? '🎩 Você é o Maquinista'
      : `Você está no ${myTrack === 'left' ? 'Trilho Esquerdo' : 'Trilho Direito'}`;
  else if (inPicks)
    banner = isConductor
      ? 'Os times estão decidindo as cartas…'
      : priv.pendingDecision === 'propose'
        ? '🗳️ Proponha uma carta pro time'
        : priv.pendingDecision === 'confirm'
          ? '🤝 Concorde com a proposta (ou proponha outra)'
          : 'Aguardando o time / o outro lado…';
  else if (pub.phase === 'verdict') banner = isConductor ? '⚖️ Puxe a alavanca' : 'O Maquinista está decidindo…';
  else if (pub.phase === 'roundResults')
    banner = spared ? '🚋 Seu trilho foi poupado!' : isConductor ? 'Veredito dado' : '💥 Seu trilho foi atropelado';

  const renderMiniTracks = () => (
    <div className="dil-mini-tracks">
      {(['left', 'right'] as DilemaTrack[]).map((side) => (
        <div
          key={side}
          className={`dil-mini-track ${myTrack === side ? 'is-mine' : ''} ${pub.killedTrack === side ? 'is-killed' : ''} ${pub.sparedTrack === side ? 'is-spared' : ''}`}
        >
          <h4>
            {side === 'left' ? 'Esquerdo' : 'Direito'}
            {myTrack === side ? ' (você)' : ''}
          </h4>
          <ul>
            {pub.tracks[side].cards.map((c) => (
              <li key={c.id}>
                <span>
                  {TYPE_ICON[c.type]} {c.text}
                </span>
                {c.modifiers.map((m) => (
                  <span key={m.id} className="dil-mini-mod">＋ {m.text}</span>
                ))}
              </li>
            ))}
            {pub.tracks[side].pick && !pub.tracks[side].pick!.locked && pub.tracks[side].pick!.proposalText ? (
              <li className="dil-mini-proposal">
                <span>⏳ {pub.tracks[side].pick!.proposalText}</span>
              </li>
            ) : null}
          </ul>
        </div>
      ))}
    </div>
  );

  const modifierTargetPicker = (cand: DilemaCandidate) => (
    <div className="dil-mod-targets">
      <p className="hint">Grudar “{cand.text}” em qual carta?</p>
      {priv.modifierTargets.map((t) => (
        <button
          key={t.id}
          type="button"
          className="dil-mod-target"
          onClick={() => propose(cand, t.id)}
        >
          <span className="dil-mod-target-side">{t.side === 'left' ? 'ESQ' : 'DIR'}</span>
          {TYPE_ICON[t.type]} {t.text}
        </button>
      ))}
      <button type="button" className="dil-mod-cancel" onClick={() => setPendingModifier(null)}>
        Cancelar
      </button>
    </div>
  );

  return (
    <>
      <MobileHeader roomCode={roomCode} connected={connected} />

      {showHowTo ? <HowToPlay onClose={() => setShowHowTo(false)} /> : null}

      {paused ? (
        <section className="dil-panel dil-center">
          <div className="dil-big">⏸</div>
          <h2>Partida pausada</h2>
          <p className="hint">Aguardando o anfitrião continuar…</p>
          <button type="button" className="dil-howto-open" onClick={() => setShowHowTo(true)}>? Como jogar</button>
        </section>
      ) : over ? (
        <section className="dil-panel dil-center">
          <h2>{pub.winnerId === playerId ? '🏆 Você foi o mais poupado!' : `🏆 ${nameOf(pub.winnerId)} foi o mais poupado`}</h2>
          {myRank ? <p className="hint">Você terminou em {myRank}º — poupado {myStanding?.spared ?? 0}×</p> : null}
          <p className="hint">Aguarde o anfitrião iniciar uma nova partida.</p>
        </section>
      ) : (
        <>
          <section className={`dil-banner ${priv.pendingDecision === 'propose' || priv.pendingDecision === 'confirm' || priv.pendingDecision === 'decide' ? 'is-live' : ''}`}>
            {banner}
            <span className="dil-round-tag">Rodada {pub.round}/{pub.totalRounds}</span>
          </section>

          {/* ── verdict: the Maquinista's lever ── */}
          {pub.phase === 'verdict' && isConductor ? (
            <section className="dil-panel">
              <p className="dil-lever-hint">Sem relógio — decidam em voz alta, depois escolha:</p>
              {renderMiniTracks()}
              <div className="dil-lever-btns">
                <button type="button" className="dil-lever-btn is-left" onClick={() => act({ type: 'castVerdict', killedTrack: 'left' })}>
                  💥 Atropelar<br />Trilho Esquerdo
                </button>
                <button type="button" className="dil-lever-btn is-right" onClick={() => act({ type: 'castVerdict', killedTrack: 'right' })}>
                  💥 Atropelar<br />Trilho Direito
                </button>
              </div>
            </section>
          ) : null}

          {/* ── pick step: candidates + consensus ── */}
          {inPicks && !isConductor && step ? (
            <section className="dil-panel">
              <p className="dil-hand-hint">
                <strong>Passo {STEP_NUM[step]}/3 — {STEP_TITLE[step]}</strong>
                <br />
                Trilho: {myTrack === 'left' ? 'Esquerdo' : 'Direito'} · time {priv.teamConfirmedCount}/{priv.teamMemberCount} concordam
              </p>

              {teamLocked ? (
                <div className="dil-consensus-box">
                  <p>✅ Escolha do time travada. Aguardando o outro trilho.</p>
                </div>
              ) : priv.iConfirmed && priv.teamProposalCardId ? (
                <div className="dil-consensus-box">
                  <p>✅ Você concordou. Aguardando o resto do time.</p>
                  <button type="button" className="dil-pass-btn" onClick={() => act({ type: 'unconfirm' })}>
                    ↩︎ Reabrir a discussão
                  </button>
                </div>
              ) : null}

              {!teamLocked && !priv.iConfirmed ? (
                <>
                  <div className="dil-hand">
                    {priv.candidates.map((cand) => {
                      const isProposed = priv.teamProposalCardId === cand.id;
                      return (
                        <div key={cand.id} className={`dil-hand-card is-${cand.type} ${isProposed ? 'is-proposed' : ''}`}>
                          <p className="dil-hand-text">
                            {TYPE_ICON[cand.type]} {cand.text}
                            {isProposed ? <span className="dil-proposed-tag"> · proposta do time</span> : null}
                          </p>
                          {isProposed && cand.type === 'modifier' && priv.teamProposalTargetId ? (
                            <p className="dil-proposed-target">
                              → grudar em: {priv.modifierTargets.find((t) => t.id === priv.teamProposalTargetId)?.text ?? '—'}
                            </p>
                          ) : null}
                          {cand.type === 'modifier' && pendingModifier?.id === cand.id ? (
                            modifierTargetPicker(cand)
                          ) : (
                            <button
                              type="button"
                              className="dil-play-btn"
                              onClick={() =>
                                cand.type === 'modifier' ? setPendingModifier(cand) : propose(cand)
                              }
                            >
                              {isProposed ? 'Propor de novo' : cand.type === 'modifier' ? '✨ Escolher alvo' : 'Propor essa'}
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {priv.teamProposalCardId ? (
                    <button type="button" className="dil-confirm-btn" onClick={() => act({ type: 'confirm' })}>
                      ✅ Concordo com a proposta
                    </button>
                  ) : (
                    <p className="hint">Proponha uma carta. O time inteiro precisa concordar antes de travar.</p>
                  )}
                </>
              ) : null}
            </section>
          ) : null}

          {/* ── the board — everyone sees it during picks / verdict / results ── */}
          {(pub.phase === 'assigning' ||
            inPicks ||
            (pub.phase === 'verdict' && !isConductor) ||
            pub.phase === 'roundResults') ? (
            <section className="dil-panel">
              {inPicks ? <p className="hint">Nos trilhos até agora:</p> : null}
              {renderMiniTracks()}
            </section>
          ) : null}

          {/* ── standings ── */}
          <section className="dil-panel dil-roster">
            <div className="dil-roster-head">
              <h2>Poupados</h2>
              <button type="button" className="dil-howto-open" onClick={() => setShowHowTo(true)}>? Como jogar</button>
            </div>
            <ul>
              {[...pub.players]
                .sort((a, b) => b.spared - a.spared)
                .map((p) => (
                  <li key={p.id} className={p.id === playerId ? 'is-me' : ''}>
                    <span className="dil-roster-who">
                      {avatarOf(p.id) ? <Avatar spec={avatarOf(p.id)!} size={30} /> : null}
                      {p.name}
                      {p.id === playerId ? ' (você)' : ''}
                      {p.id === pub.conductorId ? ' 🎩' : ''}
                    </span>
                    <span className="dil-roster-score">{p.spared}×</span>
                  </li>
                ))}
            </ul>
          </section>

          <section className="dil-reactions-bar" aria-label="Reações">
            {REACTION_EMOJIS.map((e) => (
              <button key={e} type="button" onClick={() => send('SEND_REACTION', { reaction: e })}>
                {e}
              </button>
            ))}
          </section>
        </>
      )}

      <div className="dil-reaction-feed" aria-live="polite">
        {reactions.slice(-4).map((r) => (
          <div key={r.key} className="dil-reaction-pop">
            <span>{r.reaction}</span>
            <small>{nameOf(r.playerId)}</small>
          </div>
        ))}
      </div>
    </>
  );
}
