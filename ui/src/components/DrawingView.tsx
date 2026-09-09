import type { EvoceDrawing } from '@party/shared';

/**
 * Read-only render of an É Você! `{ strokes }` drawing as scalable SVG. Used on
 * the host TV and inside the mobile vote ballot — crisp at any size.
 */
export function DrawingView({
  drawing,
  className,
  background = '#0f1826',
}: {
  drawing: EvoceDrawing | null | undefined;
  className?: string;
  background?: string;
}) {
  return (
    <svg
      viewBox="0 0 1000 1000"
      className={`ui-draw-view ${className ?? ''}`}
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label="desenho"
    >
      <rect width="1000" height="1000" fill={background} />
      {(drawing?.strokes ?? []).map((s, i) => {
        const pts: string[] = [];
        for (let p = 0; p + 1 < s.points.length; p += 2) pts.push(`${s.points[p]},${s.points[p + 1]}`);
        if (pts.length === 1) {
          return <circle key={i} cx={s.points[0]} cy={s.points[1]} r={s.width / 2} fill={s.color} />;
        }
        return (
          <polyline
            key={i}
            points={pts.join(' ')}
            fill="none"
            stroke={s.color}
            strokeWidth={s.width}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        );
      })}
    </svg>
  );
}
