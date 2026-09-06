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
  onStart: () => void;
  /** Back to the game catalog. */
  onChangeGame: () => void;
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
  onStart,
  onChangeGame,
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
          <span className="brand-mark xl">{selected?.name ?? 'Jogo'}</span>
          {selected?.tagline ? <p>{selected.tagline}</p> : <p>Escaneie o QR code ou digite o código no celular para entrar.</p>}
        </div>

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
          <button className="ghost-button" type="button" onClick={onChangeGame}>Trocar de jogo</button>
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
