import type { CSSProperties } from 'react';
import type { UnoGameEvent } from '@party/shared';

export type Point = { x: number; y: number };
export type ActiveAnim = { seq: number; event: UnoGameEvent; from?: Point; to?: Point };

/** Which events get a queued board animation, and how long the queue holds for each (ms). */
export const ANIMATION_MS: Partial<Record<UnoGameEvent['type'], number>> = {
  card_played: 620,
  card_drawn: 620,
  color_changed: 820,
  direction_changed: 700,
  player_skipped: 720,
  uno_called: 1100,
  uno_penalty_applied: 950,
};

export const REDUCED_MOTION =
  typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
    : false;

export const isAnimated = (event: UnoGameEvent): boolean => ANIMATION_MS[event.type] !== undefined;

export const flyStyle = (from: Point, to: Point, extra?: CSSProperties): CSSProperties => ({
  ['--x0' as string]: `${from.x}px`,
  ['--y0' as string]: `${from.y}px`,
  ['--x1' as string]: `${to.x}px`,
  ['--y1' as string]: `${to.y}px`,
  ...extra,
});

export const centre = (el: Element | null | undefined): Point | undefined => {
  const rect = el?.getBoundingClientRect();
  return rect ? { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 } : undefined;
};
