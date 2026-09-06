import { useMemo, useState } from 'react';
import type { UnoCard, UnoPrivatePlayerState, UnoPublicState } from '@party/shared';
import { Button, Timer } from '@party/ui';
import { getCardArt } from '@party/ui/uno-cards';
import { MobileHeader } from '../../shell/MobileHeader';
import type { ControllerGameViewProps } from '../types';
import './uno-controller.css';

const COLOR_PT: Record<string, string> = { red: 'Vermelho', yellow: 'Amarelo', green: 'Verde', blue: 'Azul' };

export function UnoControllerView({ publicState, privateState, playerId, connected, roomCode, send }: ControllerGameViewProps) {
  const pub = publicState as UnoPublicState;
  const priv = privateState as UnoPrivatePlayerState;

  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [chosenColor, setChosenColor] = useState<'red' | 'yellow' | 'green' | 'blue'>('red');

  const myTurn = pub.currentPlayerId === playerId;
  const selectedCard = useMemo(
    () => priv.hand.find((card) => card.id === selectedCardId) ?? null,
    [priv, selectedCardId],
  );
  // The server pushes state ~2x/s and computes remainingMs itself, so we never read the phone clock.
  const timerSeconds = pub.timer ? Math.max(0, Math.ceil(pub.timer.remainingMs / 1000)) : null;

  const gameOver = pub.phase === 'game_finished';
  const paused = pub.phase === 'paused';
  const roundOver = pub.phase === 'round_finished' || gameOver;
  const playing = !roundOver && !paused;
  const mustPickColor = pub.phase === 'awaiting_color_choice' && pub.pendingColorChoiceBy === playerId;
  const canAct = pub.phase === 'round_active';

  const resultWinnerId = gameOver ? pub.gameWinnerPlayerId : pub.winnerPlayerId;
  const resultWinnerName = pub.players.find((player) => player.id === resultWinnerId)?.name ?? '—';
  const scoreboard = useMemo(() => [...pub.players].sort((a, b) => b.score - a.score), [pub.players]);

  const rosterPlayers = pub.players;
  const challengeableOpponents = pub.players.filter((player) => player.unoChallengeable && player.id !== playerId);
  const myHandCount = priv.hand.length;
  const iAmChallengeable = Boolean(pub.players.find((player) => player.id === playerId)?.unoChallengeable);
  const currentName = rosterPlayers.find((player) => player.id === pub.currentPlayerId)?.name ?? '—';
  const activeColor = pub.currentColor ?? null;
  const sentido = pub.direction === -1 ? '↺ anti-horário' : '↻ horário';

  const act = (action: Record<string, unknown>): void => send('GAME_ACTION', { action });

  const playCard = (): void => {
    if (!selectedCard) {
      return;
    }
    // Wild cards are played first; the server then asks for a colour (see the colour modal).
    act({ type: 'play_card', cardId: selectedCard.id });
    setSelectedCardId(null);
  };
  const confirmColor = (): void => act({ type: 'choose_color', color: chosenColor });
  const drawCard = (): void => act({ type: 'draw_card' });
  const callUno = (): void => act({ type: 'uno_call' });
  const challengeUno = (targetPlayerId: string): void => act({ type: 'uno_challenge', targetPlayerId });

  return (
    <>
      <MobileHeader roomCode={roomCode} connected={connected}>
        {playing ? <Timer seconds={timerSeconds} active={myTurn} /> : null}
      </MobileHeader>

      {paused ? (
        <section className="waiting-panel">
          <div className="waiting-badge">⏸</div>
          <h2>Partida pausada</h2>
          <p className="hint">Aguardando o anfitrião continuar…</p>
        </section>
      ) : null}

      {playing ? (
        <section className={`turn-banner ${myTurn ? 'is-mine' : ''}`}>
          {myTurn ? 'Sua vez de jogar' : <>Vez de <strong>{currentName}</strong></>}
        </section>
      ) : null}

      {playing ? (
        <section className={`mesa color-${activeColor ?? 'neutral'}`}>
          <img className="mesa-card" src={getCardArt(pub.topDiscard)} alt="Carta no descarte" />
          <div className="mesa-tags">
            <span className={`color-chip dot-${activeColor ?? 'neutral'}`}>{activeColor ? COLOR_PT[activeColor] : '—'}</span>
            {pub.pendingDraw > 0 ? <span className="pending-chip">Comprar +{pub.pendingDraw}</span> : null}
            <span className="sentido-chip">{sentido}</span>
          </div>
        </section>
      ) : null}

      {!roundOver ? (
        <section className="players-panel">
          <h2>Jogadores · {rosterPlayers.length}</h2>
          <div className="player-list">
            {rosterPlayers.map((player) => (
              <div
                key={player.id}
                className={`player-pill ${player.id === playerId ? 'is-me' : ''} ${player.id === pub.currentPlayerId ? 'is-turn' : ''}`}
              >
                <span>{player.name}</span>
                <small>{player.handCount}</small>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {roundOver ? (
        <section className="result-panel">
          <h2>{gameOver ? `🏆 ${resultWinnerName} venceu a partida!` : `${resultWinnerName} zerou a mão`}</h2>
          <ol className="result-scoreboard">
            {scoreboard.map((player, index) => (
              <li
                key={player.id}
                className={`${index === 0 ? 'leader' : ''} ${player.id === playerId ? 'is-me' : ''}`}
              >
                <span>{index + 1}º · {player.name}</span>
                <strong>{player.score} pts</strong>
              </li>
            ))}
          </ol>
          <p className="hint">
            {gameOver ? 'Aguarde o anfitrião iniciar uma nova partida.' : 'Aguarde o anfitrião iniciar a próxima rodada.'}
          </p>
        </section>
      ) : null}

      {playing ? (
        <>
          {iAmChallengeable ? (
            <section className="uno-alert self">
              <strong>Você está com 1 carta!</strong>
              <span>Toque em UNO! antes que denunciem.</span>
            </section>
          ) : null}

          {challengeableOpponents.length > 0 ? (
            <section className="uno-alert">
              <strong>Esqueceram o UNO!</strong>
              <div className="challenge-row">
                {challengeableOpponents.map((opponent) => (
                  <button
                    key={opponent.id}
                    type="button"
                    className="challenge-button"
                    onClick={() => challengeUno(opponent.id)}
                  >
                    Denunciar {opponent.name}
                  </button>
                ))}
              </div>
            </section>
          ) : null}

          <section className="hand-panel">
            <div className="hand-head">
              <h2>Suas cartas</h2>
              <span className="hand-count">{myHandCount} na mão</span>
            </div>
            <div className="cards">
              {priv.hand.map((card: UnoCard) => {
                const selected = selectedCardId === card.id;
                const playable = priv.selectableCardIds.includes(card.id);
                const label = card.type === 'number' ? `${card.color} ${card.value}` : `${card.color} ${card.type}`;
                return (
                  <button
                    key={card.id}
                    className={`card ${selected ? 'selected' : ''} ${playable ? 'playable' : ''}`}
                    disabled={!canAct || !myTurn || !playable}
                    onClick={() => setSelectedCardId(selected ? null : card.id)}
                    type="button"
                    aria-label={label}
                  >
                    <img className="uno-card-image" src={getCardArt(card)} alt={label} />
                  </button>
                );
              })}
            </div>
          </section>

          <section className="actions-panel">
            {myHandCount === 1 ? (
              <button
                className={`action-button action-red ${iAmChallengeable ? 'is-live' : ''}`}
                onClick={callUno}
                type="button"
              >
                UNO! — gritar agora
              </button>
            ) : null}
            <div className="action-row">
              <button className="action-button action-green" disabled={!canAct || !myTurn || !selectedCard} onClick={playCard} type="button">
                {selectedCard ? <>Jogar <img className="play-mini" src={getCardArt(selectedCard)} alt="" /></> : 'Escolha uma carta'}
              </button>
              <button className="action-button action-blue" disabled={!canAct || !myTurn} onClick={drawCard} type="button">
                Comprar
              </button>
            </div>
          </section>
        </>
      ) : null}

      {mustPickColor ? (
        <div className="color-modal" role="dialog" aria-modal="true" aria-label="Escolha a cor">
          <div className="color-modal-card">
            <h2>Escolha a cor</h2>
            <div className="color-choice" role="group">
              {(['red', 'yellow', 'green', 'blue'] as const).map((color) => (
                <button
                  key={color}
                  type="button"
                  className={`color-swatch swatch-${color} ${chosenColor === color ? 'selected' : ''}`}
                  onClick={() => setChosenColor(color)}
                  aria-pressed={chosenColor === color}
                >
                  {COLOR_PT[color]}
                </button>
              ))}
            </div>
            <Button variant="success" className="color-confirm" onClick={confirmColor}>Confirmar</Button>
          </div>
        </div>
      ) : null}
    </>
  );
}
