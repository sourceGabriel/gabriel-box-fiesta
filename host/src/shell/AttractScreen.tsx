import { useEffect, useRef, useState, type CSSProperties, type MouseEvent as ReactMouseEvent } from 'react';
import bgUrl from './attract-bg.webp';

/** Only render QR images we generated ourselves (base64 PNG data URI). */
const SAFE_QR_PREFIX = 'data:image/png;base64,';

/** Natural size of `attract-bg.webp` and the CRT screen glass within it (0–1). */
const ART_W = 1086;
const ART_H = 1448;
const GLASS = { x: 0.438, y: 0.425, w: 0.173, h: 0.155 };

/** Extra bleed around the viewport so the mouse-parallax never exposes an edge. */
const BLEED = 0.06;
/** Max parallax travel, as a fraction of the viewport (kept < BLEED). */
const SHIFT = 0.04;

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
 * The host attract/start screen. An owner-painted illustration fills the
 * viewport (`background-size: cover`, so a portrait screen shows almost all of
 * it and a wide screen zooms toward the centre without ever revealing an edge).
 * The room code, phone count, QR and the "press any key" banner are drawn over
 * the blank CRT in the art — its on-screen rect is recomputed from the cover
 * math on every resize so the overlay always sits on the TV. Moving the mouse
 * drifts the whole scene for a parallax feel. See `attract-bg.CREDITS.md`.
 */
export function AttractScreen({
  roomCode,
  connected,
  onlineCount,
  joinUrl,
  joinQrDataUrl,
  onStart,
}: AttractScreenProps) {
  const innerRef = useRef<HTMLDivElement>(null);
  const [crt, setCrt] = useState<CSSProperties>({});

  useEffect(() => {
    const advance = (): void => onStart();
    window.addEventListener('keydown', advance);
    return () => window.removeEventListener('keydown', advance);
  }, [onStart]);

  // Recompute the CRT overlay rect (as % of the bleed layer) from the cover fit.
  useEffect(() => {
    const recompute = (): void => {
      const iw = window.innerWidth * (1 + BLEED * 2);
      const ih = window.innerHeight * (1 + BLEED * 2);
      const s = Math.max(iw / ART_W, ih / ART_H);
      const dw = ART_W * s;
      const dh = ART_H * s;
      const ox = (iw - dw) / 2;
      const oy = (ih - dh) / 2;
      setCrt({
        left: `${((ox + GLASS.x * dw) / iw) * 100}%`,
        top: `${((oy + GLASS.y * dh) / ih) * 100}%`,
        width: `${((GLASS.w * dw) / iw) * 100}%`,
        height: `${((GLASS.h * dh) / ih) * 100}%`,
      });
    };
    recompute();
    window.addEventListener('resize', recompute);
    return () => window.removeEventListener('resize', recompute);
  }, []);

  // Mouse parallax — drift the bleed layer opposite the cursor.
  const onMouseMove = (e: ReactMouseEvent): void => {
    const el = innerRef.current;
    if (!el || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const dx = (0.5 - e.clientX / window.innerWidth) * SHIFT * 2 * window.innerWidth;
    const dy = (0.5 - e.clientY / window.innerHeight) * SHIFT * 2 * window.innerHeight;
    el.style.setProperty('--px', `${dx}px`);
    el.style.setProperty('--py', `${dy}px`);
  };
  const resetParallax = (): void => {
    const el = innerRef.current;
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
      <div className="attract-bleed" ref={innerRef}>
        <div className="attract-bg" aria-hidden="true" />

        <div className="attract-crt" style={crt}>
          <div className="attract-crt-glass" aria-hidden="true" />
          <div className="attract-crt-content">
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
        </div>
      </div>
    </main>
  );
}
