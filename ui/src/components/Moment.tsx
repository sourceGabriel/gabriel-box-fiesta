import { useEffect, useRef, type CSSProperties } from 'react';
import type { AvatarSpec } from '@party/shared';
import { usePerformanceMode } from './HostStage';
import { VictorySplash } from './VictorySplash';

/**
 * A "big moment" for the host TV — a full-screen dramatic beat that plays a short
 * choreography and then calls `onDone`. The host stacks these through
 * `useStageDirector` so simultaneous events never stomp each other.
 *
 * Every choreography has three tiers: `normal`, `reduced` (prefers-reduced-motion)
 * and `safe` (weak TV — `performanceMode === 'safe'`). Same hierarchy, less effect.
 */

export type MomentType = 'reveal' | 'callout' | 'victory';

export interface MomentProps {
  type: MomentType;
  /** Small kicker above the headline, e.g. "MELHOR RESPOSTA" / "GABRIEL DISSE". */
  eyebrow?: string;
  /** The headline — the answer text, the callout word, or the winner's name. */
  title: string;
  /** One line under the headline, e.g. the author's name. */
  subtitle?: string;
  /** Hex accent for the glow / underline pulse. */
  accent?: string;
  variant?: 'success' | 'neutral' | 'danger';
  /** `victory` only — the winner's avatar for the splash. */
  avatar?: AvatarSpec;
  /** How long the beat holds after entering. `victory` defaults to "until dismissed". */
  holdMs?: number;
  onDone?: () => void;
}

const DEFAULT_HOLD: Record<MomentType, number> = { reveal: 2400, callout: 1200, victory: 6000 };
const ENTER_MS = 700;
const EXIT_MS = 360;

export function Moment({
  type,
  eyebrow,
  title,
  subtitle,
  accent,
  variant = 'neutral',
  avatar,
  holdMs,
  onDone,
}: MomentProps) {
  const perf = usePerformanceMode();
  const doneRef = useRef(onDone);
  doneRef.current = onDone;

  useEffect(() => {
    const hold = holdMs ?? DEFAULT_HOLD[type];
    if (hold === Infinity) return;
    const total = ENTER_MS + hold + EXIT_MS;
    const t = window.setTimeout(() => doneRef.current?.(), total);
    return () => window.clearTimeout(t);
  }, [type, holdMs]);

  const style = accent ? ({ ['--moment-accent' as string]: accent } as CSSProperties) : undefined;

  if (type === 'victory') {
    return (
      <div className="ui-moment ui-moment-victory" style={style} role="status" aria-live="assertive">
        <VictorySplash winner={{ name: title, avatar }} subtitle={subtitle ?? 'venceu!'} accent={accent} />
      </div>
    );
  }

  return (
    <div
      className={`ui-moment ui-moment-${type} is-${variant}`}
      data-perf={perf}
      style={style}
      role="status"
      aria-live="assertive"
    >
      <div className="ui-moment-inner">
        {eyebrow ? <p className="ui-moment-eyebrow">{eyebrow}</p> : null}
        <p className="ui-moment-title">{title}</p>
        {subtitle ? <p className="ui-moment-subtitle">{subtitle}</p> : null}
      </div>
    </div>
  );
}
