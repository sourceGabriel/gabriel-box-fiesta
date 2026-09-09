import type { SintoniaResult } from '@party/shared';

/**
 * The semicircular "wavelength" dial for the host TV. Pure SVG, no deps. Value
 * 0–100 maps left→right across a 180° arc. During `guessing` the target zone is
 * hidden under a grey cover and no needles show (guesses are independent). During
 * `reveal` the cover lifts, the proximity bands fan out around the target, and
 * every guesser's needle drops onto the arc.
 *
 * All arcs are drawn as polylines/polygons sampled along the circle, so there is
 * no SVG arc-flag ambiguity to get wrong.
 */

const CX = 220;
const CY = 220;
const R = 190;
const R_INNER = 78;

/** Bands: `[halfWidth, colour]`, widest first (must line up with server `BANDS` distances). */
const BANDS: ReadonlyArray<readonly [number, string]> = [
  [42, 'var(--sint-band-1, #1f3b42)'],
  [30, 'var(--sint-band-2, #2f5d54)'],
  [20, 'var(--sint-band-3, #3f8a6d)'],
  [12, 'var(--sint-band-4, #4fb98a)'],
  [6, 'var(--sint-band-5, #6fe0a8)'],
  [2, 'var(--sint-band-6, #b9ffd8)'],
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

const initial = (name: string) => (name.trim()[0] ?? '?').toUpperCase();

export function SintoniaDial({
  results,
  target,
  revealed,
}: {
  results: SintoniaResult[];
  target: number | null;
  revealed: boolean;
}) {
  const tgt = target ?? 50;

  return (
    <svg
      className="sint-dial"
      viewBox="0 0 440 264"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Dial de sintonia"
    >
      {/* track */}
      <polyline
        points={arcPts(0, 100, R)}
        fill="none"
        stroke="var(--sint-track)"
        strokeWidth="26"
        strokeLinecap="round"
      />

      {revealed && target !== null ? (
        <g className="sint-bands">
          {BANDS.map(([hw, color]) => (
            <polygon
              key={hw}
              points={wedge(clamp(tgt - hw, 0, 100), clamp(tgt + hw, 0, 100))}
              fill={color}
            />
          ))}
          <line
            x1={CX}
            y1={CY}
            x2={point(tgt, R - 4)[0]}
            y2={point(tgt, R - 4)[1]}
            stroke="var(--sint-target)"
            strokeWidth="5"
            strokeDasharray="6 5"
          />
          <circle cx={point(tgt, R - 4)[0]} cy={point(tgt, R - 4)[1]} r="9" fill="var(--sint-target)" />
        </g>
      ) : (
        <polygon points={wedge(2, 98)} className="sint-cover" fill="var(--sint-cover)" />
      )}

      {/* guesser needles (reveal only) — the initial rides the needle tip; points live in the scoreboard below */}
      {revealed
        ? results.map((r, i) => {
            const [nx, ny] = point(r.value, R - 10);
            const [lxRaw, ly] = point(r.value, R + 14);
            const lx = Math.max(18, Math.min(422, lxRaw));
            const hot = r.points >= 5;
            const color = hot ? 'var(--sint-needle-hot, #6fe0a8)' : 'var(--sint-needle, #cfd8e3)';
            return (
              <g key={r.playerId} className="sint-guess-needle" style={{ ['--gi' as string]: i }}>
                <line x1={CX} y1={CY} x2={nx} y2={ny} stroke={color} strokeWidth="4" strokeLinecap="round" opacity="0.85" />
                <circle cx={nx} cy={ny} r="7" fill={color} />
                <text x={lx} y={ly} className="sint-guess-label" textAnchor="middle">
                  {initial(r.name)}
                </text>
              </g>
            );
          })
        : null}

      <circle cx={CX} cy={CY} r="14" fill="var(--sint-track)" stroke="#04121a" strokeWidth="3" />

      {revealed && target !== null ? (
        <text x={CX} y="256" className="sint-dial-val" textAnchor="middle">
          alvo {target}
        </text>
      ) : null}
    </svg>
  );
}
