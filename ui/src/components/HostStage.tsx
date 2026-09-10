import type { CSSProperties, ReactNode } from 'react';

/**
 * The host TV as a *stage*, not a dashboard: one full-bleed surface with a
 * themed ambient backdrop, a HUD that recedes as the drama rises, the scene
 * content (which cross-fades on `scene` change), and an optional bottom
 * contestant strip.
 *
 * Spike scope: the container + HUD/strip recede rules + the scene cross-fade.
 * The per-game `HostTheme` (display font, texture, motion personality) and the
 * `<Broadcast>` lower-third layer land in Phase 1.
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

export interface HostStageProps {
  scene: HostScene;
  /** Game accent (hex) — tints the ambient glow. */
  accent: string;
  /** HUD row: game name · round · timer. Shrinks at `high`, hidden at `climax`. */
  hud?: ReactNode;
  /** Bottom contestant strip. Hidden at `climax`. */
  strip?: ReactNode;
  intensity?: HostIntensity;
  children: ReactNode;
}

export function HostStage({ scene, accent, hud, strip, intensity = 'normal', children }: HostStageProps) {
  const style = { ['--stage-accent' as string]: accent } as CSSProperties;
  return (
    <div className="ui-stage" data-scene={scene} data-intensity={intensity} style={style}>
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
