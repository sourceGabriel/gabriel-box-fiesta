import type { SintoniaSide } from '@party/shared';

/**
 * The semicircular "wavelength" dial for the host TV. Pure SVG, no deps. Value
 * 0–100 maps left→right across a 180° arc. During `reveal` the grey cover lifts
 * and the scoring bands (widest → narrowest) fan out around the hidden target.
 *
 * All arcs are drawn as polylines/polygons sampled along the circle, so there is
 * no SVG arc-flag ambiguity to get wrong.
 */

const CX = 220;
const CY = 220;
const R = 190;
const R_INNER = 78;

/** Bands: `[halfWidth, points]`, widest first (must match server `BANDS`). */
const BANDS: ReadonlyArray<readonly [number, number, string]> = [
  [22, 2, 'var(--sint-band-2)'],
  [14, 3, 'var(--sint-band-3)'],
  [6, 4, 'var(--sint-band-4)'],
];

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));

function point(v: number, r: number): [number, number] {
  const a = Math.PI * (1 - clamp(v, 0, 100) / 100);
  return [CX + r * Math.cos(a), CY - r * Math.sin(a)];
}

function arcPts(v1: number, v2: number, r: number, steps = 40): string {
  const out: string[] = [];
  for (let i = 0; i <= steps; i++) {
    const [x, y] = point(v1 + ((v2 - v1) * i) / steps, r);
    out.push(`${x.toFixed(1)},${y.toFixed(1)}`);
  }
  return out.join(' ');
}

function wedge(v1: number, v2: number): string {
  return `${arcPts(v1, v2, R)} ${arcPts(v2, v1, R_INNER)}`;
}

export function SintoniaDial({
  value,
  target,
  revealed,
  showNeedle,
  sideBet,
}: {
  value: number;
  target: number | null;
  revealed: boolean;
  showNeedle: boolean;
  sideBet?: SintoniaSide | null;
}) {
  const [nx, ny] = point(value, R - 12);
  const tgt = target ?? 50;
  const [tx, ty] = point(tgt, R - 4);

  return (
    <svg className="sint-dial" viewBox="0 0 440 240" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Dial de sintonia">
      {/* track */}
      <polyline points={arcPts(0, 100, R)} fill="none" stroke="var(--sint-track)" strokeWidth="26" strokeLinecap="round" />

      {revealed && target !== null ? (
        <g className="sint-bands">
          {BANDS.map(([hw, pts, color]) => (
            <polygon key={pts} points={wedge(clamp(tgt - hw, 0, 100), clamp(tgt + hw, 0, 100))} fill={color} />
          ))}
          {/* target marker */}
          <line x1={CX} y1={CY} x2={tx} y2={ty} stroke="var(--sint-target)" strokeWidth="5" strokeDasharray="6 5" />
          <circle cx={tx} cy={ty} r="9" fill="var(--sint-target)" />
        </g>
      ) : (
        /* grey cover over the target zone before the reveal */
        <polygon points={wedge(2, 98)} className="sint-cover" fill="var(--sint-cover)" />
      )}

      {/* dial needle */}
      {showNeedle ? (
        <g className={`sint-needle ${revealed ? 'is-locked' : ''}`}>
          <line x1={CX} y1={CY} x2={nx} y2={ny} stroke="var(--sint-needle)" strokeWidth="7" strokeLinecap="round" />
          <circle cx={CX} cy={CY} r="14" fill="var(--sint-needle)" stroke="#04121a" strokeWidth="3" />
        </g>
      ) : (
        <circle cx={CX} cy={CY} r="14" fill="var(--sint-track)" stroke="#04121a" strokeWidth="3" />
      )}

      {revealed && target !== null ? (
        <text x={CX} y="28" className="sint-dial-val" textAnchor="middle">
          alvo {target} · dial {Math.round(value)}
        </text>
      ) : showNeedle ? (
        <text x={CX} y="28" className="sint-dial-val" textAnchor="middle">
          {Math.round(value)}
          {sideBet ? <tspan className="sint-dial-bet"> · aposta {sideBet === 'left' ? '◀' : '▶'}</tspan> : null}
        </text>
      ) : null}
    </svg>
  );
}
