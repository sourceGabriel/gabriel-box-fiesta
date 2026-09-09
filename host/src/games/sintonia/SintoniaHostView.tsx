import { useEffect, useMemo, useRef, useState } from 'react';
import type { AvatarSpec, SintoniaGameEvent, SintoniaPublicState, SintoniaTeamId } from '@party/shared';
import { Avatar, BrandMark, Button, getSounds, Overlay, RoundScoreboard, roundTaunt, Timer, VictorySplash } from '@party/ui';
import type { HostGameViewProps } from '../types';
import { describeEvent } from './describeEvent';
import { soundForEvent } from './sound-map';
import { SintoniaDial } from './SintoniaDial';
import './sintonia-host.css';

function TeamPanel({
  team,
  avatarOf,
  mediumId,
}: {
  team: SintoniaPublicState['teams'][number];
  avatarOf: (id: string) => AvatarSpec | undefined;
  mediumId: string | null;
}) {
  return (
    <section className={`sint-team is-${team.id} ${team.isActive ? 'is-active' : ''}`}>
      <header className="sint-team-head">
        <h3>{team.name}</h3>
        <span className="sint-team-score">{team.score}</span>
      </header>
      <ul className="sint-team-members">
        {team.memberIds.map((id, i) => (
          <li key={id} className={id === mediumId ? 'is-medium' : ''}>
            {avatarOf(id) ? <Avatar spec={avatarOf(id)!} size={22} /> : null}
            <span>{team.memberNames[i]}</span>
            {id === mediumId ? <span className="sint-medium-tag">🔮</span> : null}
          </li>
        ))}
      </ul>
      {team.isActive ? <p className="sint-team-role">sintonizando</p> : <p className="sint-team-role">apostando o lado</p>}
    </section>
  );
}

export function SintoniaHostView({ publicState, events, players, connected, reactions, send }: HostGameViewProps) {
  const pub = publicState as SintoniaPublicState;
  const seenSeqRef = useRef(0);
  const [feed, setFeed] = useState<{ seq: number; text: string }[]>([]);
  const sounds = useMemo(() => getSounds(), []);
  const [soundOn, setSoundOn] = useState(() => sounds.isEnabled());

  const nameOf = useMemo(() => {
    const map = new Map<string, string>();
    for (const t of pub.teams) t.memberIds.forEach((id, i) => map.set(id, t.memberNames[i]));
    for (const p of players) if (!map.has(p.id)) map.set(p.id, p.name);
    return (id: string) => map.get(id) ?? '—';
  }, [pub.teams, players]);

  const avatarOf = useMemo(() => {
    const map = new Map(players.map((p) => [p.id, p.avatar] as const));
    return (id: string) => map.get(id);
  }, [players]);

  useEffect(() => {
    if (events.length === 0) {
      seenSeqRef.current = 0;
      setFeed([]);
      return;
    }
    const lastSeq = events[events.length - 1].seq;
    if (lastSeq <= seenSeqRef.current) return;
    const fresh = events.filter((e) => e.seq > seenSeqRef.current);
    seenSeqRef.current = lastSeq;
    for (const { event } of fresh) {
      const spec = soundForEvent(event as SintoniaGameEvent);
      if (spec) sounds.play(spec);
    }
    const lines = fresh
      .map((e) => ({ seq: e.seq, text: describeEvent(e.event as SintoniaGameEvent, nameOf) }))
      .filter((l): l is { seq: number; text: string } => l.text !== null);
    if (lines.length > 0) setFeed((cur) => [...cur, ...lines].slice(-9));
  }, [events, nameOf, sounds]);

  const paused = pub.phase === 'paused';
  const over = pub.phase === 'gameover';
  const inReveal = pub.phase === 'reveal' || over;
  const timerSeconds = pub.timer ? Math.max(0, Math.ceil(pub.timer.remainingMs / 1000)) : null;

  const activeTeam = pub.teams[pub.activeTeamId];
  const opponent = pub.teams[pub.activeTeamId === 0 ? 1 : 0];

  const scoreRows = useMemo(
    () =>
      pub.teams
        .map((t) => ({ playerId: `team-${t.id}`, name: t.name, score: t.score, roundPoints: 0 }))
        .sort((a, b) => b.score - a.score),
    [pub.teams],
  );

  const teamPt = (id: SintoniaTeamId) => pub.teams[id].name;

  return (
    <main className="host-shell sintonia-host">
      <div className="sint-reactions" aria-hidden="true">
        {reactions.slice(-6).map((r) => (
          <div key={r.key} className="sint-reaction-bubble">
            <span className="sint-reaction-emoji">{r.reaction}</span>
            <span className="sint-reaction-who">{nameOf(r.playerId)}</span>
          </div>
        ))}
      </div>

      {paused ? (
        <Overlay label="Partida pausada">
          <p className="eyebrow">Partida pausada</p>
          <h2>⏸ Aguardando o anfitrião</h2>
          <div className="sint-result-actions">
            <Button variant="primary" onClick={() => send('RESUME_GAME', {})}>Continuar</Button>
            <Button variant="danger" onClick={() => send('END_GAME', {})}>Encerrar</Button>
          </div>
        </Overlay>
      ) : null}

      {over ? (
        <Overlay label="Fim da partida">
          <p className="eyebrow">Fim de Sintonia</p>
          {pub.winnerTeamId === null ? (
            <h2>🤝 Empate!</h2>
          ) : (
            <VictorySplash
              winner={{
                name: pub.winnerName ?? teamPt(pub.winnerTeamId),
                avatar: avatarOf(pub.teams[pub.winnerTeamId].memberIds[0]),
              }}
              subtitle={`capitão do ${teamPt(pub.winnerTeamId)}`}
              accent="#2dd4bf"
            />
          )}
          <ol className="sint-final-standings">
            {pub.teams
              .slice()
              .sort((a, b) => b.score - a.score)
              .map((t) => (
                <li key={t.id}>
                  <span className="sint-final-name">{t.name}</span>
                  <span className="sint-final-score">{t.score} pts</span>
                  <span className="sint-final-members">{t.memberNames.join(', ')}</span>
                </li>
              ))}
          </ol>
          <div className="sint-result-actions">
            <Button variant="primary" onClick={() => send('START_GAME', {})}>Nova partida</Button>
            <Button variant="danger" onClick={() => send('END_GAME', {})}>Encerrar</Button>
          </div>
        </Overlay>
      ) : null}

      <header className="sint-topbar">
        <div className="sint-brand">
          <BrandMark text="Sintonia" size="md" />
          <span className="sint-brand-sub">
            Sala {pub.roomCode} · Rodada {pub.round}/{pub.totalRounds}
          </span>
          {!connected ? <span className="sint-conn-pill">reconectando…</span> : null}
        </div>
        <div className="sint-medium">
          🔮 Médium: <strong>{pub.mediumName ?? '—'}</strong>
        </div>
        <Timer seconds={timerSeconds} active={pub.phase === 'cluing' || pub.phase === 'guessing'} />
      </header>

      <div className="sint-body">
        <section className="sint-stage">
          {pub.phase === 'cluing' ? (
            <p className="sint-eyebrow sint-cluing">
              🔮 <strong>{pub.mediumName}</strong> está escolhendo a dica no celular…
            </p>
          ) : null}

          {pub.phase === 'guessing' && pub.clue ? (
            <p className="sint-clue">“{pub.clue}”</p>
          ) : null}

          {inReveal ? (
            <p className="sint-eyebrow sint-result-line">
              {pub.roundSkipped
                ? '⌛ Sem dica nesta rodada'
                : `🎯 ${activeTeam.name} +${pub.bandPoints ?? 0}${pub.sideCorrect ? ` · ${opponent.name} acertou o lado +1` : ''}`}
            </p>
          ) : null}

          <div className="sint-dial-wrap">
            <SintoniaDial
              value={pub.dialValue}
              target={pub.target}
              revealed={inReveal}
              showNeedle={pub.phase === 'guessing' || inReveal}
              sideBet={pub.sideBet}
            />
            <div className="sint-poles">
              <span>◀ {pub.spectrum[0]}</span>
              <span>{pub.spectrum[1]} ▶</span>
            </div>
          </div>

          {pub.phase === 'guessing' ? (
            <p className="sint-eyebrow">
              {activeTeam.name}: girem o dial · {opponent.name}: apostem ◀ / ▶
            </p>
          ) : null}

          {inReveal && !over ? (
            <RoundScoreboard
              title={`Rodada ${pub.round} de ${pub.totalRounds}`}
              standings={scoreRows}
              taunt={roundTaunt(scoreRows.map((s) => ({ name: s.name, score: s.score })), pub.round)}
            />
          ) : null}
        </section>

        <aside className="sint-side">
          <div className="sint-side-head">
            <h2>Times</h2>
            <span className="status-chip">{connected ? 'ao vivo' : 'offline'}</span>
          </div>
          <TeamPanel team={pub.teams[0]} avatarOf={avatarOf} mediumId={pub.mediumId} />
          <TeamPanel team={pub.teams[1]} avatarOf={avatarOf} mediumId={pub.mediumId} />
          {feed.length > 0 ? (
            <ul className="sint-feed" aria-live="polite">
              {feed.map((line) => (
                <li key={line.seq}>{line.text}</li>
              ))}
            </ul>
          ) : (
            <p className="hint">Aguardando…</p>
          )}
          <div className="sint-side-actions">
            <Button variant="ghost" onClick={() => send(paused ? 'RESUME_GAME' : 'PAUSE_GAME', {})}>
              {paused ? '▶ Continuar' : '⏸ Pausar'}
            </Button>
            <Button variant="danger" onClick={() => send('END_GAME', {})}>Encerrar</Button>
          </div>
          <button
            type="button"
            className="sint-sound-toggle"
            aria-pressed={soundOn}
            onClick={() => setSoundOn(sounds.toggle())}
          >
            {soundOn ? '🔊 Som ligado' : '🔇 Som desligado'}
          </button>
        </aside>
      </div>
    </main>
  );
}
