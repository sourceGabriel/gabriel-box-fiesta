import type { GameMeta } from '@party/shared';
import { BrandMark, Button, PlayerRoster, QrPanel } from '@party/ui';
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

  return (
    <main className="host-shell host-lobby">
      <div className="lobby-card">
        <div className="lobby-title">
          <BrandMark text={selected?.name ?? 'Jogo'} size="xl" />
          {selected?.tagline ? <p>{selected.tagline}</p> : <p>Escaneie o QR code ou digite o código no celular para entrar.</p>}
        </div>

        <div className="lobby-grid">
          <QrPanel dataUrl={joinQrDataUrl} code={roomCode} url={joinUrl} />
          <PlayerRoster
            layout="list"
            title={`Jogadores (${players.length})`}
            players={players}
          />
        </div>

        <div className="lobby-cta">
          <Button variant="ghost" onClick={onChangeGame}>Trocar de jogo</Button>
          <Button variant="primary" disabled={!connected || !canStart} onClick={onStart}>
            {canStart ? `Iniciar ${selected?.name ?? 'partida'}` : `Aguardando ${minPlayers}+ jogadores`}
          </Button>
          <span className="status-chip">{connected ? `${onlineCount} online` : 'offline'}</span>
        </div>

        {lastError ? <p className="error">{lastError}</p> : null}
      </div>
    </main>
  );
}
