import { useEffect, useRef } from 'react';

/**
 * A "big moment" for the host TV — a full-screen dramatic beat that plays a short
 * choreography and then calls `onDone`. The host stacks these through a queue
 * (`useMomentQueue`) so simultaneous events never stomp each other.
 *
 * Spike scope: `reveal` (the winning answer, big) and `callout` ("ZAP!"). The
 * other types (spotlight / countdown / elimination / victory) land in Phase 1.
 *
 * `prefers-reduced-motion` collapses every choreography to a plain fade + hold;
 * the hierarchy (what you're meant to look at) is unchanged.
 */

export type MomentType = 'reveal' | 'callout';

export interface MomentProps {
  type: MomentType;
  /** Small kicker above the headline, e.g. "MELHOR RESPOSTA" / "GABRIEL DISSE". */
  eyebrow?: string;
  /** The headline — the answer text, or the callout word ("ZAP!"). */
  title: string;
  /** One line under the headline, e.g. the author's name. */
  subtitle?: string;
  /** Hex accent for the glow / underline pulse. */
  accent?: string;
  variant?: 'success' | 'neutral' | 'danger';
  /** How long the beat holds after entering, before it exits. */
  holdMs?: number;
  onDone?: () => void;
}

const DEFAULT_HOLD: Record<MomentType, number> = { reveal: 2400, callout: 1200 };
const ENTER_MS = 700;
const EXIT_MS = 360;

export function Moment({
  type,
  eyebrow,
  title,
  subtitle,
  accent,
  variant = 'neutral',
  holdMs,
  onDone,
}: MomentProps) {
  const doneRef = useRef(onDone);
  doneRef.current = onDone;

  useEffect(() => {
    const hold = holdMs ?? DEFAULT_HOLD[type];
    const total = ENTER_MS + hold + EXIT_MS;
    const t = window.setTimeout(() => doneRef.current?.(), total);
    return () => window.clearTimeout(t);
  }, [type, holdMs]);

  const style = accent ? ({ ['--moment-accent' as string]: accent } as React.CSSProperties) : undefined;

  return (
    <div
      className={`ui-moment ui-moment-${type} is-${variant}`}
      data-enter-ms={ENTER_MS}
      data-exit-ms={EXIT_MS}
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
