import { useRef } from 'react';

/**
 * The phone-side "termômetro" — a semicircular gauge the guesser drags to pick a
 * 0–100 spot, mirroring the host TV dial. Pure SVG + pointer events; the arc is
 * the touch target (`touch-action: none` so a drag never scrolls the page).
 *
 * At reveal it goes read-only and can also draw the hidden `target` next to the
 * player's locked needle.
 */

const VBW = 320;
const VBH = 196;
const CX = 160;
const CY = 168;
const R = 138;
const R_IN = 60;

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));

function point(v: number, r: number): [number, number] {
  const a = Math.PI * (1 - clamp(v, 0, 100) / 100);
  return [CX + r * Math.cos(a), CY - r * Math.sin(a)];
}
function arc(v1: number, v2: number, r: number, steps = 48): string {
  const out: string[] = [];
  for (let i = 0; i <= steps; i++) {
    const [x, y] = point(v1 + ((v2 - v1) * i) / steps, r);
    out.push(`${x.toFixed(1)},${y.toFixed(1)}`);
  }
  return out.join(' ');
}
const wedge = (v1: number, v2: number) => `${arc(v1, v2, R)} ${arc(v2, v1, R_IN)}`;

export function SintoniaGauge({
  value,
  onChange,
  onCommit,
  disabled = false,
  target = null,
}: {
  value: number;
  onChange?: (v: number) => void;
  /** fired once when a drag / keypress ends — a good moment to flush to the server. */
  onCommit?: () => void;
  disabled?: boolean;
  /** reveal only — the hidden target, drawn as a dashed marker. */
  target?: number | null;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const dragging = useRef(false);

  const valueFromEvent = (clientX: number, clientY: number): number => {
    const el = svgRef.current;
    if (!el) return value;
    const rect = el.getBoundingClientRect();
    const sx = ((clientX - rect.left) / rect.width) * VBW;
    const sy = ((clientY - rect.top) / rect.height) * VBH;
    let a = Math.atan2(CY - sy, sx - CX); // 0..π across the upper half
    if (a < 0) a = sx < CX ? Math.PI : 0; // drags below the arc snap to the nearest pole
    return clamp(Math.round((1 - a / Math.PI) * 100), 0, 100);
  };

  const down = (e: React.PointerEvent) => {
    if (disabled || !onChange) return;
    dragging.current = true;
    svgRef.current?.setPointerCapture(e.pointerId);
    onChange(valueFromEvent(e.clientX, e.clientY));
  };
  const move = (e: React.PointerEvent) => {
    if (!dragging.current || disabled || !onChange) return;
    onChange(valueFromEvent(e.clientX, e.clientY));
  };
  const up = (e: React.PointerEvent) => {
    if (!dragging.current) return;
    dragging.current = false;
    try {
      svgRef.current?.releasePointerCapture(e.pointerId);
    } catch {
      /* capture may already be gone */
    }
    onCommit?.();
  };
  const key = (e: React.KeyboardEvent) => {
    if (disabled || !onChange) return;
    const step = e.shiftKey ? 10 : 1;
    if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') { e.preventDefault(); onChange(clamp(value - step, 0, 100)); onCommit?.(); }
    else if (e.key === 'ArrowRight' || e.key === 'ArrowUp') { e.preventDefault(); onChange(clamp(value + step, 0, 100)); onCommit?.(); }
  };

  const [nx, ny] = point(value, R - 8);
  const [hx, hy] = point(value, R - 8);

  return (
    <svg
      ref={svgRef}
      className={`sint-gauge ${disabled ? 'is-locked' : ''}`}
      viewBox={`0 0 ${VBW} ${VBH}`}
      xmlns="http://www.w3.org/2000/svg"
      style={{ touchAction: 'none' }}
      role="slider"
      aria-label="Seu ponteiro"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(value)}
      aria-disabled={disabled}
      tabIndex={disabled ? -1 : 0}
      onPointerDown={down}
      onPointerMove={move}
      onPointerUp={up}
      onPointerCancel={up}
      onKeyDown={key}
    >
      <polygon points={wedge(0, 100)} className="sint-gauge-bed" />
      {value > 0 ? <polygon points={wedge(0, value)} className="sint-gauge-fill" /> : null}
      <polyline points={arc(0, 100, R)} className="sint-gauge-rim" fill="none" />

      {target !== null ? (
        <g className="sint-gauge-target">
          <line
            x1={CX}
            y1={CY}
            x2={point(target, R + 2)[0]}
            y2={point(target, R + 2)[1]}
            strokeDasharray="5 4"
          />
          <circle cx={point(target, R + 2)[0]} cy={point(target, R + 2)[1]} r="6" />
        </g>
      ) : null}

      <line x1={CX} y1={CY} x2={nx} y2={ny} className="sint-gauge-needle" />
      <circle cx={hx} cy={hy} r="11" className="sint-gauge-handle" />
      <circle cx={CX} cy={CY} r="8" className="sint-gauge-hub" />
    </svg>
  );
}
