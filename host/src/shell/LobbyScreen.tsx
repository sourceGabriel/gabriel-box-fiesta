import type { CSSProperties, FC } from 'react';
import type { ContentTier, GameMeta } from '@party/shared';
import { BrandMark, Button, PlayerRoster, QrPanel } from '@party/ui';
import type { GamePersonality } from '../games/types';
import type { ShellPlayer } from './useRoomConnection';

/** Games whose prompt/question bank has a `leve`/`pesado` split. */
const TIERED_GAMES = new Set(['zap', 'lorota', 'sabetudo', 'fdp', 'evoce']);

interface LobbyScreenProps {
  roomCode: string;
  players: ShellPlayer[];
  joinUrl: string;
  joinQrDataUrl?: string;
  connected: boolean;
  lastError: string;
  catalog: GameMeta[];
  selectedGameId: string;
  contentTier: ContentTier;
  /** gameId → chosen match length (rounds/questions), from GAME_CATALOG. */
  matchLengths: Record<string, number>;
  /** id → cover art component + personality, for the lobby backdrop + accent tint. */
  covers: Record<string, FC>;
  personalities: Record<string, GamePersonality>;
  onStart: () => void;
  /** Back to the game catalog. */
  onChangeGame: () => void;
  onSetContentTier: (tier: ContentTier) => void;
  onSetMatchLength: (gameId: string, length: number) => void;
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
  contentTier,
  matchLengths,
  covers,
  personalities,
  onStart,
  onChangeGame,
  onSetContentTier,
  onSetMatchLength,
}: LobbyScreenProps) {
  const onlineCount = players.filter((p) => p.connected).length;
  const selected = catalog.find((g) => g.id === selectedGameId) ?? catalog[0];
  const minPlayers = selected?.minPlayers ?? 2;
  const maxPlayers = selected?.maxPlayers ?? 8;
  const canStart = onlineCount >= minPlayers && onlineCount <= maxPlayers;
  const showTier = TIERED_GAMES.has(selected?.id ?? '');
  const lengthOpts = selected?.lengthOptions;
  const currentLength =
    (selected && matchLengths[selected.id]) ?? lengthOpts?.default ?? 0;
  const Cover = selected ? covers[selected.id] : undefined;
  const accent = (selected && personalities[selected.id]?.accent) || 'var(--accent)';

  return (
    <main className="host-shell host-lobby" style={{ '--game-accent': accent } as unknown as CSSProperties}>
      {Cover ? (
        <div className="lobby-backdrop" aria-hidden="true">
          <Cover />
        </div>
      ) : null}
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

        {lengthOpts && selected ? (
          <div className="lobby-tier" role="group" aria-label={lengthOpts.label}>
            <span className="lobby-tier-label">{lengthOpts.label}</span>
            <div className="lobby-tier-switch">
              {lengthOpts.values.map((v) => (
                <button
                  key={v}
                  type="button"
                  className={currentLength === v ? 'is-on' : ''}
                  aria-pressed={currentLength === v}
                  disabled={!connected}
                  onClick={() => onSetMatchLength(selected.id, v)}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {showTier ? (
          <div className="lobby-tier" role="group" aria-label="Intensidade do conteúdo">
            <span className="lobby-tier-label">Conteúdo</span>
            <div className="lobby-tier-switch">
              <button
                type="button"
                className={contentTier === 'leve' ? 'is-on' : ''}
                aria-pressed={contentTier === 'leve'}
                disabled={!connected}
                onClick={() => onSetContentTier('leve')}
              >
                😇 Leve
              </button>
              <button
                type="button"
                className={contentTier === 'pesado' ? 'is-on' : ''}
                aria-pressed={contentTier === 'pesado'}
                disabled={!connected}
                onClick={() => onSetContentTier('pesado')}
              >
                🔞 Pesado
              </button>
            </div>
            <span className="lobby-tier-hint">
              {contentTier === 'pesado'
                ? 'Humor negro, sexo, palavrão, +18. Só para maiores e para quem topa.'
                : 'Zoeira leve, sem conteúdo explícito.'}
            </span>
          </div>
        ) : null}

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
