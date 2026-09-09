import { useMemo, useState } from 'react';
import type {
  DilemaHandCard,
  DilemaPrivateState,
  DilemaPublicState,
  DilemaTrack,
} from '@party/shared';
import { Avatar, Timer } from '@party/ui';
import { MobileHeader } from '../../shell/MobileHeader';
import type { ControllerGameViewProps } from '../types';
import { HowToPlay } from './HowToPlay';
import './dilema-controller.css';

const REACTION_EMOJIS = ['😂', '🔥', '😱', '😈', '💀', '🙏'];
const TYPE_LABEL: Record<string, string> = { innocent: 'Inocente', guilty: 'Culpado', modifier: 'Modificador' };
const TYPE_ICON: Record<string, string> = { innocent: '😇', guilty: '😈', modifier: '✨' };

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
  const [pickModifier, setPickModifier] = useState<DilemaHandCard | null>(null);

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
  const myTrack = priv.myTrack;
  const isConductor = priv.isConductor;

  const myStanding = pub.standings.find((s) => s.playerId === playerId);
  const myRank = myStanding ? pub.standings.findIndex((s) => s.playerId === playerId) + 1 : null;
  const spared = pub.sparedTrack && myTrack === pub.sparedTrack;

  const playInnocentOrGuilty = (card: DilemaHandCard) => {
    if (!myTrack) return;
    const enemy: DilemaTrack = myTrack === 'left' ? 'right' : 'left';
    act({ type: 'playCard', cardId: card.id, targetTrack: card.type === 'innocent' ? myTrack : enemy });
  };

  const playModifier = (card: DilemaHandCard, track: DilemaTrack, targetCardId: string) => {
    act({ type: 'playCard', cardId: card.id, targetTrack: track, targetCardId });
    setPickModifier(null);
  };

  const baseTargets = useMemo(
    () =>
      (['left', 'right'] as DilemaTrack[]).flatMap((side) =>
        pub.tracks[side].cards.map((c) => ({ side, id: c.id, text: c.text, type: c.type })),
      ),
    [pub.tracks],
  );

  let banner = '';
  if (pub.phase === 'assigning') banner = isConductor ? '🎩 Você é o Maquinista' : `Você está no ${myTrack === 'left' ? 'Trilho Esquerdo' : 'Trilho Direito'}`;
  else if (pub.phase === 'playing') banner = isConductor ? 'Os times estão montando os trilhos…' : priv.passed ? 'Pronto! Aguardando os outros…' : 'Monte o seu trilho';
  else if (pub.phase === 'verdict') banner = isConductor ? '⚖️ Puxe a alavanca' : 'O Maquinista está decidindo…';
  else if (pub.phase === 'roundResults') banner = spared ? '🚋 Seu trilho foi poupado!' : isConductor ? 'Veredito dado' : '💥 Seu trilho foi atropelado';

  const renderMiniTracks = () => (
    <div className="dil-mini-tracks">
      {(['left', 'right'] as DilemaTrack[]).map((side) => (
        <div key={side} className={`dil-mini-track ${myTrack === side ? 'is-mine' : ''} ${pub.killedTrack === side ? 'is-killed' : ''} ${pub.sparedTrack === side ? 'is-spared' : ''}`}>
          <h4>{side === 'left' ? 'Esquerdo' : 'Direito'}{myTrack === side ? ' (você)' : ''}</h4>
          <ul>
            {pub.tracks[side].cards.map((c) => (
              <li key={c.id}>
                <span>{TYPE_ICON[c.type]} {c.text}</span>
                {c.modifiers.map((m) => (
                  <span key={m.id} className="dil-mini-mod">＋ {m.text}</span>
                ))}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );

  return (
    <>
      <MobileHeader roomCode={roomCode} connected={connected}>
        {!paused && !over ? (
          <Timer seconds={timerSeconds} active={priv.pendingDecision === 'play' || priv.pendingDecision === 'decide'} />
        ) : null}
      </MobileHeader>

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
          <section className={`dil-banner ${priv.pendingDecision === 'play' || priv.pendingDecision === 'decide' ? 'is-live' : ''}`}>
            {banner}
            <span className="dil-round-tag">Rodada {pub.round}/{pub.totalRounds}</span>
          </section>

          {/* ── verdict: the Maquinista's lever ── */}
          {pub.phase === 'verdict' && isConductor ? (
            <section className="dil-panel">
              <p className="dil-lever-hint">Escolha qual trilho o trólebus atropela:</p>
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

          {/* ── playing: your hand ── */}
          {pub.phase === 'playing' && !isConductor && !priv.passed ? (
            <section className="dil-panel">
              <p className="dil-hand-hint">
                Seu trilho: <strong>{myTrack === 'left' ? 'Esquerdo' : 'Direito'}</strong> · jogadas: {priv.cardsPlayed}
              </p>
              <div className="dil-hand">
                {priv.hand.map((card) => (
                  <div key={card.id} className={`dil-hand-card is-${card.type}`}>
                    <div className="dil-hand-card-top">
                      <span className="dil-hand-type">{TYPE_ICON[card.type]} {TYPE_LABEL[card.type]}</span>
                    </div>
                    <p className="dil-hand-text">{card.text}</p>
                    {card.type === 'modifier' ? (
                      pickModifier?.id === card.id ? (
                        <div className="dil-mod-targets">
                          <p className="hint">Grudar em qual carta?</p>
                          {baseTargets.map((t) => (
                            <button
                              key={`${t.side}-${t.id}`}
                              type="button"
                              className="dil-mod-target"
                              onClick={() => playModifier(card, t.side, t.id)}
                            >
                              <span className="dil-mod-target-side">{t.side === 'left' ? 'ESQ' : 'DIR'}</span>
                              {TYPE_ICON[t.type]} {t.text}
                            </button>
                          ))}
                          <button type="button" className="dil-mod-cancel" onClick={() => setPickModifier(null)}>Cancelar</button>
                        </div>
                      ) : (
                        <button type="button" className="dil-play-btn" onClick={() => setPickModifier(card)}>
                          ✨ Escolher carta-alvo
                        </button>
                      )
                    ) : (
                      <button type="button" className="dil-play-btn" onClick={() => playInnocentOrGuilty(card)}>
                        {card.type === 'innocent' ? '😇 Jogar no meu trilho' : '😈 Jogar no trilho inimigo'}
                      </button>
                    )}
                  </div>
                ))}
                {priv.hand.length === 0 ? <p className="hint">Mão vazia — você está pronto.</p> : null}
              </div>
              <button type="button" className="dil-pass-btn" onClick={() => act({ type: 'pass' })}>
                ✅ Pronto (não vou jogar mais)
              </button>
            </section>
          ) : null}

          {/* ── everyone else / spectate the tracks ── */}
          {(pub.phase === 'assigning' ||
            (pub.phase === 'playing' && (isConductor || priv.passed)) ||
            (pub.phase === 'verdict' && !isConductor) ||
            pub.phase === 'roundResults') ? (
            <section className="dil-panel">
              {pub.phase === 'assigning' && !isConductor ? (
                <>
                  <p className="hint">Sua mão desta rodada:</p>
                  <ul className="dil-preview-hand">
                    {priv.hand.map((c) => (
                      <li key={c.id}>{TYPE_ICON[c.type]} {c.text}</li>
                    ))}
                  </ul>
                </>
              ) : (
                renderMiniTracks()
              )}
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
