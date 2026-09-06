import { useEffect, useState, type FC } from 'react';
import type { GameMeta } from '@party/shared';

interface CatalogScreenProps {
  catalog: GameMeta[];
  selectedGameId: string;
  /** id → cover art component, supplied by the app from the game registry. */
  covers: Record<string, FC>;
  /** Owner picked a game — the app sends SELECT_GAME and moves to the lobby. */
  onPick: (gameId: string) => void;
  /** Back to the attract screen. */
  onBack: () => void;
  lastError: string;
  platformName?: string;
}

export function CatalogScreen({
  catalog,
  selectedGameId,
  covers,
  onPick,
  onBack,
  lastError,
  platformName = 'Box Fiesta',
}: CatalogScreenProps) {
  const [focus, setFocus] = useState(0);

  // Start focus on the currently selected game; keep it in range as the catalog loads.
  useEffect(() => {
    const idx = catalog.findIndex((g) => g.id === selectedGameId);
    setFocus((current) => (idx >= 0 ? idx : Math.min(current, Math.max(0, catalog.length - 1))));
  }, [catalog, selectedGameId]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (catalog.length === 0) return;
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault();
        setFocus((f) => (f + 1) % catalog.length);
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault();
        setFocus((f) => (f - 1 + catalog.length) % catalog.length);
      } else if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        const game = catalog[focus];
        if (game) onPick(game.id);
      } else if (e.key === 'Escape' || e.key === 'Backspace') {
        e.preventDefault();
        onBack();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [catalog, focus, onPick, onBack]);

  return (
    <main className="host-shell catalog-screen">
      <header className="catalog-head">
        <span className="platform-mark sm">{platformName}</span>
        <h1>Escolha um jogo</h1>
      </header>

      <div className="catalog-grid">
        {catalog.map((game, index) => {
          const Cover = covers[game.id];
          return (
            <button
              key={game.id}
              type="button"
              className={`catalog-card ${index === focus ? 'is-focused' : ''}`}
              onClick={() => onPick(game.id)}
              onMouseEnter={() => setFocus(index)}
            >
              <div className="catalog-cover">
                {Cover ? <Cover /> : <div className="catalog-cover-fallback">{game.name}</div>}
              </div>
              <div className="catalog-card-meta">
                <strong>{game.name}</strong>
                {game.tagline ? <span>{game.tagline}</span> : null}
                <small>{game.minPlayers}–{game.maxPlayers} jogadores</small>
              </div>
            </button>
          );
        })}
      </div>

      <p className="catalog-hint">← → navegar · Enter escolher · Esc voltar</p>
      {lastError ? <p className="error">{lastError}</p> : null}
    </main>
  );
}
