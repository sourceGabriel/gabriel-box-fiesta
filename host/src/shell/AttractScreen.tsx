import { useEffect, useRef, type CSSProperties, type MouseEvent as ReactMouseEvent } from 'react';
import bgUrl from './attract-bg.webp';

/** Only render QR images we generated ourselves (base64 PNG data URI). */
const SAFE_QR_PREFIX = 'data:image/png;base64,';

/** Extra bleed around the viewport so the mouse-parallax never exposes an edge. */
const BLEED = 0.06;
/** Max parallax travel, as a fraction of the viewport (kept < BLEED). */
const SHIFT = 0.035;

interface AttractScreenProps {
  roomCode: string;
  connected: boolean;
  onlineCount: number;
  joinUrl: string;
  joinQrDataUrl?: string;
  /** Advance to the game catalog (any key / any click / tap). */
  onStart: () => void;
}

/**
 * The host attract/start screen. The owner-painted room fills the viewport
 * (`background-size: cover` — a tall screen shows nearly all of it, a wide screen
 * zooms toward the centre, no exposed edge) and drifts with the mouse for a
 * parallax feel. The live bits — room code, phone count, QR, "press any key" —
 * live in a self-contained CRT-styled panel floated over the scene, so any
 * background image works without measuring anything. See `attract-bg.CREDITS.md`.
 */
export function AttractScreen({
  roomCode,
  connected,
  onlineCount,
  joinUrl,
  joinQrDataUrl,
  onStart,
}: AttractScreenProps) {
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

  const qr = joinQrDataUrl?.startsWith(SAFE_QR_PREFIX) ? joinQrDataUrl : undefined;
  const joinLabel = joinUrl.replace(/^https?:\/\//, '');

  return (
    <main
      className="attract"
      onClick={onStart}
      onMouseMove={onMouseMove}
      onMouseLeave={resetParallax}
      role="button"
      tabIndex={0}
      style={{ '--attract-bg': `url(${bgUrl})`, '--bleed': `${BLEED * 100}%` } as unknown as CSSProperties}
    >
      <div className="attract-scene" ref={sceneRef}>
        <div className="attract-bg" aria-hidden="true" />
      </div>

      <div className="attract-panel">
        <div className="attract-screen-fx" aria-hidden="true" />
        <span className="attract-sala">Sala</span>
        <strong className="attract-code">{roomCode || '····'}</strong>
        <p className="attract-online">
          {connected
            ? `${onlineCount} ${onlineCount === 1 ? 'celular conectado' : 'celulares conectados'}`
            : 'conectando…'}
        </p>
        <div className="attract-join">
          {qr ? <img src={qr} alt="QR code da sala" /> : <div className="attract-qr-skeleton" aria-hidden="true" />}
          <span className="attract-join-url">{joinLabel || 'boxfiesta'}</span>
        </div>
      </div>

      <p className="attract-cta">
        <span>Pressione qualquer tecla</span>
        <span>ou toque para começar</span>
      </p>
    </main>
  );
}
