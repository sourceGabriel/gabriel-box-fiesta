import { useMemo } from 'react';
import type { GameMeta } from '@party/shared';
import { SAFE_QR_PREFIX } from './messages';
import type { ShellPlayer } from './useRoomConnection';

interface LobbyScreenProps {
  roomCode: string;
  players: ShellPlayer[];
  joinUrl: string;
  joinQrDataUrl?: string;
  connected: boolean;
  lastError: string;
  catalog: GameMeta[];
  selectedGameId: string;
  onSelectGame: (gameId: string) => void;
  onStart: () => void;
  brandName?: string;
}

export function LobbyScreen({
  roomCode,
  players,
  joinUrl,
  joinQrDataUrl,
  connected,
  lastError,
  catalog,
  selectedGameId,
  onSelectGame,
  onStart,
  brandName = 'UNO',
}: LobbyScreenProps) {
  const onlineCount = players.filter((p) => p.connected).length;
  const selected = catalog.find((g) => g.id === selectedGameId) ?? catalog[0];
  const minPlayers = selected?.minPlayers ?? 2;
  const maxPlayers = selected?.maxPlayers ?? 8;
  const canStart = onlineCount >= minPlayers && onlineCount <= maxPlayers;

  const safeQr = useMemo(
    () => (joinQrDataUrl?.startsWith(SAFE_QR_PREFIX) ? joinQrDataUrl : undefined),
    [joinQrDataUrl],
  );

  return (
    <main className="host-shell host-lobby">
      <div className="lobby-card">
        <div className="lobby-title">
          <span className="brand-mark xl">{brandName}</span>
          <p>Escaneie o QR code ou digite o código no celular para entrar.</p>
        </div>

        {catalog.length > 1 ? (
          <div className="lobby-catalog" role="group" aria-label="Escolha o jogo">
            {catalog.map((game) => (
              <button
                key={game.id}
                type="button"
                className={`catalog-item ${game.id === selectedGameId ? 'selected' : ''}`}
                onClick={() => onSelectGame(game.id)}
              >
                <strong>{game.name}</strong>
                {game.tagline ? <span>{game.tagline}</span> : null}
                <small>{game.minPlayers}–{game.maxPlayers} jogadores</small>
              </button>
            ))}
          </div>
        ) : null}

        <div className="lobby-grid">
          <div className="lobby-qr">
            {safeQr ? <img src={safeQr} alt="QR code da sala" /> : <div className="qr-skeleton" aria-hidden="true" />}
            <p className="lobby-code">{roomCode || '----'}</p>
            {joinUrl ? <p className="lobby-url">{joinUrl}</p> : null}
          </div>

          <div className="lobby-players">
            <h2>Jogadores ({players.length})</h2>
            {players.length === 0 ? (
              <p className="hint">Ninguém entrou ainda.</p>
            ) : (
              <ul>
                {players.map((player) => (
                  <li key={player.id}>
                    <span>{player.name}</span>
                    <span className={`conn-dot ${player.connected ? 'on' : 'off'}`} aria-hidden="true" />
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="lobby-cta">
          <button className="start-button" disabled={!connected || !canStart} onClick={onStart} type="button">
            {canStart ? `Iniciar ${selected?.name ?? 'partida'}` : `Aguardando ${minPlayers}+ jogadores`}
          </button>
          <span className="status-chip">{connected ? `${onlineCount} online` : 'offline'}</span>
        </div>

        {lastError ? <p className="error">{lastError}</p> : null}
      </div>
    </main>
  );
}
