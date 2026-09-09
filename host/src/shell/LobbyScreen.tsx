import { useEffect, type CSSProperties, type FC } from 'react';
import type { ContentTier, GameMeta } from '@party/shared';
import { Avatar, BrandMark, Button, PlayerRoster, QrPanel } from '@party/ui';
import type { GamePersonality } from '../games/types';
import type { ShellPlayer } from './useRoomConnection';

/** Games whose prompt/question bank has a `leve`/`pesado` split. */
const TIERED_GAMES = new Set(['zap', 'lorota', 'sabetudo', 'fdp', 'evoce', 'dilema']);

/** Only render QR images we generated ourselves (base64 PNG data URI). */
const SAFE_QR_PREFIX = 'data:image/png;base64,';

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
  /** id → full-bleed lobby backdrop URL. When set, the lobby renders in "art mode". */
  lobbyBgs: Record<string, string>;
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
  lobbyBgs,
  onStart,
  onChangeGame,
  onSetContentTier,
  onSetMatchLength,
}: LobbyScreenProps) {
  // Esc goes back to the game catalog (same as "Trocar de jogo").
  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onChangeGame();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onChangeGame]);

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
  const lobbyBg = selected ? lobbyBgs[selected.id] : undefined;
  const joinLabel = joinUrl.replace(/^https?:\/\//, '');
  const qr = joinQrDataUrl?.startsWith(SAFE_QR_PREFIX) ? joinQrDataUrl : undefined;

  const tierControls = (
    <>
      {lengthOpts && selected ? (
        <div className="lobby-mini-switch" role="group" aria-label={lengthOpts.label}>
          <span>{lengthOpts.label}</span>
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
      ) : null}
      {showTier ? (
        <div className="lobby-mini-switch" role="group" aria-label="Intensidade do conteúdo">
          <span>Conteúdo</span>
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
      ) : null}
    </>
  );

  // ---------- Art mode: live bits dropped into the painted panel frames ----------
  if (lobbyBg && selected) {
    const startLabel = canStart
      ? `▶ Começar ${selected.name}`
      : `Aguardando ${minPlayers}+ jogadores`;
    const slots = Array.from({ length: Math.max(maxPlayers, players.length) });

    return (
      <main
        className="host-shell host-lobby lobby-art"
        style={{ '--game-accent': accent } as unknown as CSSProperties}
      >
        <div className="lobby-stage" style={{ '--lobby-bg': `url(${lobbyBg})` } as unknown as CSSProperties}>
          <div className="lobby-stage-bg" aria-hidden="true" />

          <div className="lobby-slot lobby-slot-qr">
            {qr ? <img src={qr} alt="QR code da sala" /> : <div className="lobby-qr-skeleton" aria-hidden="true" />}
          </div>

          <div className="lobby-slot lobby-slot-code">
            <span className="lobby-qr-label">Código da sala</span>
            <strong className="lobby-qr-code">{roomCode || '····'}</strong>
            <span className="lobby-qr-url">{joinLabel || 'boxfiesta'}</span>
          </div>

          <div className="lobby-slot lobby-slot-players">
            <h2>
              Jogadores <span>({players.length}/{maxPlayers})</span>
            </h2>
            <ul>
              {slots.map((_, i) => {
                const p = players[i];
                if (!p) {
                  return (
                    <li key={`empty-${i}`} className="is-empty">
                      <span className="lobby-tile-plus">+</span>
                      <span className="lobby-tile-name">aguardando…</span>
                    </li>
                  );
                }
                return (
                  <li key={p.id} className={p.connected ? '' : 'is-off'}>
                    {p.avatar ? (
                      <Avatar spec={p.avatar} size={40} />
                    ) : (
                      <span className="lobby-tile-plus">{p.name.slice(0, 1).toUpperCase()}</span>
                    )}
                    <span className="lobby-tile-name">{p.name}</span>
                  </li>
                );
              })}
            </ul>
          </div>

          <button
            type="button"
            className="lobby-slot lobby-slot-start"
            disabled={!connected || !canStart}
            onClick={onStart}
          >
            {startLabel}
          </button>
        </div>

        <div className="lobby-controls">
          <button type="button" className="lobby-back" onClick={onChangeGame}>
            ◀ Trocar de jogo
          </button>
          {tierControls}
          <span className="status-chip">{connected ? `${onlineCount} online` : 'offline'}</span>
        </div>

        {lastError ? <p className="error lobby-art-error">{lastError}</p> : null}
      </main>
    );
  }

  // ---------- Plain card lobby ----------
  // The documented fallback for any game with no `lobbyBg` (owner room art).
  // All 9 games ship art today, so this only renders with an empty catalog
  // (`selected` undefined). Kept intentionally — a new game works before its
  // art lands.
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
