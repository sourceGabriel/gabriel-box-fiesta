import { useEffect, useRef, type CSSProperties, type MouseEvent as ReactMouseEvent } from 'react';
import bgUrl from './attract-bg.webp';
import bgPortraitUrl from './attract-bg-portrait.webp';

/** Extra bleed around the viewport so the mouse-parallax never exposes an edge. */
const BLEED = 0.06;
/** Max parallax travel, as a fraction of the viewport (kept < BLEED). */
const SHIFT = 0.035;

interface AttractScreenProps {
  /** Advance to the game catalog (any key / any click / tap). */
  onStart: () => void;
}

/**
 * The host attract/start screen — pure presentation. An owner-painted poster
 * (wordmark + tagline already baked in) fills the viewport with
 * `background-size: cover` and drifts a little with the mouse; a "toque para
 * começar" sticker is the only live element. No room code, QR or phone count —
 * those belong to the lobby. Portrait screens get the portrait poster.
 * See `attract-bg.CREDITS.md`.
 */
export function AttractScreen({ onStart }: AttractScreenProps) {
  const sceneRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const advance = (): void => onStart();
    window.addEventListener('keydown', advance);
    return () => window.removeEventListener('keydown', advance);
  }, [onStart]);

  const onMouseMove = (e: ReactMouseEvent): void => {
    const el = sceneRef.current;
    if (!el || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const dx = (0.5 - e.clientX / window.innerWidth) * SHIFT * 2 * window.innerWidth;
    const dy = (0.5 - e.clientY / window.innerHeight) * SHIFT * 2 * window.innerHeight;
    el.style.setProperty('--px', `${dx}px`);
    el.style.setProperty('--py', `${dy}px`);
  };
  const resetParallax = (): void => {
    const el = sceneRef.current;
    if (el) {
      el.style.setProperty('--px', '0px');
      el.style.setProperty('--py', '0px');
    }
  };

  return (
    <main
      className="attract"
      onClick={onStart}
      onMouseMove={onMouseMove}
      onMouseLeave={resetParallax}
      role="button"
      tabIndex={0}
      aria-label="Toque ou pressione qualquer tecla para começar"
      style={
        {
          '--attract-bg': `url(${bgUrl})`,
          '--attract-bg-portrait': `url(${bgPortraitUrl})`,
          '--bleed': `${BLEED * 100}%`,
        } as unknown as CSSProperties
      }
    >
      <div className="attract-scene" ref={sceneRef}>
        <div className="attract-bg" aria-hidden="true" />
      </div>

      <p className="attract-cta">
        <span>Pressione qualquer tecla</span>
        <span>ou toque para começar</span>
      </p>
    </main>
  );
}
