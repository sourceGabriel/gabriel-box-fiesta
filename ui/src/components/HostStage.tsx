import { createContext, useContext, type CSSProperties, type ReactNode } from 'react';

/**
 * The host TV as a *stage*, not a dashboard: one full-bleed surface with a
 * themed ambient backdrop, a HUD that recedes as the drama rises, the scene
 * content (which cross-fades on `scene` change), and an optional bottom
 * contestant strip.
 *
 * Games opt in by rendering their per-phase content inside `<HostStage>` and
 * declaring a `HostTheme`. Everything else (`<Moment>`, `<Broadcast>`,
 * `useStageDirector`) layers on top.
 */

export type HostScene =
  | 'thinking'
  | 'collecting'
  | 'reveal'
  | 'reaction'
  | 'score'
  | 'victory'
  // games may register their own (e.g. Sintonia 'dial', Dilema 'trolley')
  | (string & {});

export type HostIntensity = 'ambient' | 'normal' | 'high' | 'climax';

/** How a game's TV world feels in motion. Drives easing + overshoot, not layout. */
export type MotionStyle = 'punchy' | 'tense' | 'playful' | 'tactile' | 'ceremonial';

export interface MotionSpec {
  enterMs: number;
  exitMs: number;
  /** CSS easing for entrances. */
  easing: string;
  /** CSS easing for the "impact" beats (callout pop, stamp). */
  impact: string;
}

export const MOTION: Record<MotionStyle, MotionSpec> = {
  punchy: { enterMs: 420, exitMs: 240, easing: 'cubic-bezier(0.22, 1, 0.36, 1)', impact: 'cubic-bezier(0.34, 1.56, 0.64, 1)' },
  tense: { enterMs: 620, exitMs: 300, easing: 'cubic-bezier(0.16, 1, 0.3, 1)', impact: 'cubic-bezier(0.16, 1, 0.3, 1)' },
  playful: { enterMs: 380, exitMs: 220, easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)', impact: 'cubic-bezier(0.34, 1.8, 0.64, 1)' },
  tactile: { enterMs: 340, exitMs: 220, easing: 'cubic-bezier(0.2, 0.9, 0.3, 1)', impact: 'cubic-bezier(0.3, 1.4, 0.5, 1)' },
  ceremonial: { enterMs: 900, exitMs: 420, easing: 'cubic-bezier(0.16, 1, 0.3, 1)', impact: 'cubic-bezier(0.16, 1, 0.3, 1)' },
};

export interface HostTheme {
  /** Primary accent (hex) — ambient glow, moment rules, leader highlight. */
  accent: string;
  /** Optional secondary accent for gradients / contrast bits. */
  accentSecondary?: string;
  /** CSS font-family for headlines. Falls back to `--font-display` (Anton). */
  displayFont?: string;
  /** Backdrop treatment. */
  background?: 'midnight' | 'ember' | 'noir' | 'table';
  texture?: 'grain' | 'none';
  motion: MotionStyle;
}

// ── performance mode ──

export type PerformanceMode = 'high' | 'balanced' | 'safe';

const PerfContext = createContext<PerformanceMode>('balanced');

export function PerformanceModeProvider({ mode, children }: { mode: PerformanceMode; children: ReactNode }) {
  return <PerfContext.Provider value={mode}>{children}</PerfContext.Provider>;
}

export function usePerformanceMode(): PerformanceMode {
  return useContext(PerfContext);
}

// ── the stage ──

export interface HostStageProps {
  scene: HostScene;
  /** Full theme (preferred), or just an accent hex for a quick start. */
  theme?: HostTheme;
  accent?: string;
  /** HUD row: game name · round · timer. Shrinks at `high`, hidden at `climax`. */
  hud?: ReactNode;
  /** Bottom contestant strip. Hidden at `climax`. */
  strip?: ReactNode;
  intensity?: HostIntensity;
  children: ReactNode;
}

export function HostStage({ scene, theme, accent, hud, strip, intensity = 'normal', children }: HostStageProps) {
  const perf = usePerformanceMode();
  const acc = theme?.accent ?? accent ?? 'var(--accent)';
  const style = {
    ['--stage-accent' as string]: acc,
    ['--stage-accent-2' as string]: theme?.accentSecondary ?? acc,
    ['--stage-font' as string]: theme?.displayFont ?? 'var(--font-display)',
    ['--stage-enter-ms' as string]: `${MOTION[theme?.motion ?? 'punchy'].enterMs}ms`,
    ['--stage-ease' as string]: MOTION[theme?.motion ?? 'punchy'].easing,
  } as CSSProperties;

  return (
    <div
      className="ui-stage"
      data-scene={scene}
      data-intensity={intensity}
      data-bg={theme?.background ?? 'midnight'}
      data-texture={perf === 'safe' ? 'none' : theme?.texture ?? 'grain'}
      data-motion={theme?.motion ?? 'punchy'}
      data-perf={perf}
      style={style}
    >
      <div className="ui-stage-ambient" aria-hidden="true" />
      {hud ? (
        <header className="ui-stage-hud" data-hidden={intensity === 'climax' ? 'true' : undefined}>
          {hud}
        </header>
      ) : null}
      {/* keyed on scene so React remounts + the cross-fade keyframe replays */}
      <main className="ui-stage-scene" key={scene}>
        {children}
      </main>
      {strip ? (
        <footer className="ui-stage-strip" data-hidden={intensity === 'climax' ? 'true' : undefined}>
          {strip}
        </footer>
      ) : null}
    </div>
  );
}
