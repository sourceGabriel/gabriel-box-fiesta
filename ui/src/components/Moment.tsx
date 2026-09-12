import { useEffect, useRef, useState, type CSSProperties } from 'react';
import type { AvatarSpec } from '@party/shared';
import { usePerformanceMode } from './HostStage';
import { VictorySplash } from './VictorySplash';
import { Avatar } from './Avatar';

/**
 * A "big moment" for the host TV — a full-screen dramatic beat that plays a short
 * choreography and then calls `onDone`. The host stacks these through
 * `useStageDirector` so simultaneous events never stomp each other.
 *
 * Every choreography has three tiers: `normal`, `reduced` (prefers-reduced-motion)
 * and `safe` (weak TV — `performanceMode === 'safe'`). Same hierarchy, less effect.
 */

export type MomentType = 'reveal' | 'callout' | 'victory' | 'spotlight' | 'countdown';

export interface MomentProps {
  type: MomentType;
  /** Small kicker above the headline, e.g. "MELHOR RESPOSTA" / "GABRIEL DISSE" / "O MENTIROSO". */
  eyebrow?: string;
  /** The headline — the answer text, the callout word, the winner's/spotlighted player's name.
   * Ignored for `countdown` (the number is the headline there). */
  title: string;
  /** One line under the headline, e.g. the author's name. */
  subtitle?: string;
  /** Hex accent for the glow / underline pulse. */
  accent?: string;
  variant?: 'success' | 'neutral' | 'danger';
  /** `victory` and `spotlight` — the player's avatar. */
  avatar?: AvatarSpec;
  /** How long the beat holds after entering. `victory` defaults to "until dismissed". */
  holdMs?: number;
  /** `countdown` only — ticks down from this to 1 then a final "VAI!" beat (default 3). */
  from?: number;
  onDone?: () => void;
}

const DEFAULT_HOLD: Record<MomentType, number> = { reveal: 2400, callout: 1200, victory: 6000, spotlight: 2800, countdown: 0 };
const ENTER_MS = 700;
const EXIT_MS = 360;
const COUNTDOWN_TICK_MS = 900;
const COUNTDOWN_FINAL_HOLD_MS = 700;

export function Moment({
  type,
  eyebrow,
  title,
  subtitle,
  accent,
  variant = 'neutral',
  avatar,
  holdMs,
  from = 3,
  onDone,
}: MomentProps) {
  const perf = usePerformanceMode();
  const doneRef = useRef(onDone);
  doneRef.current = onDone;
  const [tick, setTick] = useState(from);

  // Countdown drives its own clock (a beat per number) instead of one static hold.
  useEffect(() => {
    if (type !== 'countdown') return;
    setTick(from);
    if (from <= 0) {
      const t = window.setTimeout(() => doneRef.current?.(), COUNTDOWN_FINAL_HOLD_MS);
      return () => window.clearTimeout(t);
    }
    const t = window.setInterval(() => {
      setTick((cur) => {
        if (cur <= 1) {
          window.clearInterval(t);
          window.setTimeout(() => doneRef.current?.(), COUNTDOWN_FINAL_HOLD_MS);
          return 0;
        }
        return cur - 1;
      });
    }, COUNTDOWN_TICK_MS);
    return () => window.clearInterval(t);
  }, [type, from]);

  useEffect(() => {
    if (type === 'countdown') return;
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

  if (type === 'countdown') {
    return (
      <div className="ui-moment ui-moment-countdown" data-perf={perf} style={style} role="status" aria-live="assertive">
        <div className="ui-moment-inner">
          {eyebrow ? <p className="ui-moment-eyebrow">{eyebrow}</p> : null}
          <p key={tick} className="ui-moment-countdown-num">{tick > 0 ? tick : title || 'VAI!'}</p>
        </div>
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
        {type === 'spotlight' && avatar ? (
          <div className="ui-moment-spotlight-avatar">
            <Avatar spec={avatar} size={120} />
          </div>
        ) : null}
        {eyebrow ? <p className="ui-moment-eyebrow">{eyebrow}</p> : null}
        <p className="ui-moment-title">{title}</p>
        {subtitle ? <p className="ui-moment-subtitle">{subtitle}</p> : null}
      </div>
    </div>
  );
}
