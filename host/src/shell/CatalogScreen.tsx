import { useCallback, useEffect, useState, type CSSProperties, type FC } from 'react';
import type { GameMeta } from '@party/shared';
import { BrandMark, getSounds } from '@party/ui';
import type { GamePersonality } from '../games/types';

interface CatalogScreenProps {
  catalog: GameMeta[];
  selectedGameId: string;
  /** id → cover art component, supplied by the app from the game registry. */
  covers: Record<string, FC>;
  /** id → catalog personality (accent + vibe + acid blurb), from the registry. */
  personalities: Record<string, GamePersonality>;
  /** Owner picked a game — the app sends SELECT_GAME and moves to the lobby. */
  onPick: (gameId: string) => void;
  /** Back to the attract screen. */
  onBack: () => void;
  lastError: string;
  platformName?: string;
}

const FALLBACK_PERSONALITY: GamePersonality = {
  accent: '#f59e0b',
  vibe: 'FESTA',
  blurb: 'Chama a galera e senta o dedo.',
  how: 'Pega o celular, entra na sala e segue o que a TV pedir.',
};

/** Custom-property style bag — TS's CSSProperties has no `--*` index. */
const vars = (o: Record<string, string | number>): CSSProperties => o as unknown as CSSProperties;

/**
 * The game picker as a 3-up coverflow: the focused game sits big and centre with
 * its accent glow, the neighbours flank it small and tilted, everything else is
 * parked off-stage. Arrows / ← → rotate the reel, Enter starts the centre game.
 */
export function CatalogScreen({
  catalog,
  selectedGameId,
  covers,
  personalities,
  onPick,
  onBack,
  lastError,
  platformName = 'Box Fiesta',
}: CatalogScreenProps) {
  const [focus, setFocus] = useState(0);
  const n = catalog.length;

  // Start focus on the currently selected game; keep it in range as the catalog loads.
  useEffect(() => {
    const idx = catalog.findIndex((g) => g.id === selectedGameId);
    setFocus((current) => (idx >= 0 ? idx : Math.min(current, Math.max(0, n - 1))));
  }, [catalog, selectedGameId, n]);

  const step = useCallback(
    (dir: number) => {
      if (n === 0) return;
      setFocus((f) => (f + dir + n) % n);
      getSounds().select();
    },
    [n],
  );

  const pick = useCallback(
    (gameId: string) => {
      getSounds().special();
      onPick(gameId);
    },
    [onPick],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (n === 0) return;
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault();
        step(1);
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault();
        step(-1);
      } else if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        const game = catalog[focus];
        if (game) pick(game.id);
      } else if (e.key === 'Escape' || e.key === 'Backspace') {
        e.preventDefault();
        onBack();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [catalog, focus, n, step, pick, onBack]);

  const active = catalog[focus];
  const activeP = (active && personalities[active.id]) || FALLBACK_PERSONALITY;

  /** Shortest signed distance from the focused card, wrapped around the reel. */
  const rel = (index: number): number => {
    let off = index - focus;
    if (off > n / 2) off -= n;
    if (off < -n / 2) off += n;
    return off;
  };

  return (
    <main className="host-shell catalog-screen" style={vars({ '--game-accent': activeP.accent })}>
      <header className="catalog-head">
        <BrandMark text={platformName} variant="platform" size="sm" />
        <h1>Escolha um jogo</h1>
      </header>

      <div className="cf-stage">
        <button
          type="button"
          className="cf-arrow cf-arrow-left"
          onClick={() => step(-1)}
          aria-label="Jogo anterior"
          disabled={n < 2}
        >
          ‹
        </button>

        <div className="cf-reel">
          {catalog.map((game, index) => {
            const off = rel(index);
            const abs = Math.abs(off);
            const hidden = abs > 2;
            const isCenter = off === 0;
            const p = personalities[game.id] || FALLBACK_PERSONALITY;
            const Cover = covers[game.id];
            return (
              <button
                key={game.id}
                type="button"
                className={`cf-card${isCenter ? ' is-center' : ''}`}
                data-hidden={hidden || undefined}
                style={vars({ '--off': off, '--abs': abs, '--accent': p.accent })}
                aria-hidden={hidden || undefined}
                tabIndex={isCenter ? 0 : -1}
                onClick={() => (isCenter ? pick(game.id) : setFocus(index))}
              >
                <div className="cf-frame">
                  <div className="cf-cover">
                    {Cover ? <Cover /> : <div className="catalog-cover-fallback">{game.name}</div>}
                    <span className="cf-vibe">{p.vibe}</span>
                  </div>
                  <div className="cf-plate">
                    <strong>{game.name}</strong>
                    <span className="cf-players">
                      {game.minPlayers}–{game.maxPlayers} jogadores
                    </span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        <button
          type="button"
          className="cf-arrow cf-arrow-right"
          onClick={() => step(1)}
          aria-label="Próximo jogo"
          disabled={n < 2}
        >
          ›
        </button>
      </div>

      <div className="cf-hero" key={active?.id}>
        <p className="cf-blurb">{activeP.blurb}</p>
        <p className="cf-how">{activeP.how}</p>
        {active ? (
          <button type="button" className="cf-start" onClick={() => pick(active.id)}>
            ▶ Iniciar {active.name}
          </button>
        ) : (
          <p className="hint">Carregando o catálogo…</p>
        )}
      </div>

      <div className="cf-dots" role="tablist" aria-label="Jogos">
        {catalog.map((game, index) => (
          <button
            key={game.id}
            type="button"
            role="tab"
            aria-selected={index === focus}
            aria-label={game.name}
            className={`cf-dot${index === focus ? ' is-on' : ''}`}
            onClick={() => setFocus(index)}
          />
        ))}
      </div>

      <p className="catalog-hint">← → navegar · Enter jogar · Esc voltar</p>
      {lastError ? <p className="error">{lastError}</p> : null}
    </main>
  );
}
