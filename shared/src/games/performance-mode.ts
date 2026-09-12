/**
 * Host-TV rendering budget for the host-stage "show" framework
 * (`@party/ui` `<HostStage>`/`<Moment>`). The room owner sets it from their
 * phone (`<HostControlsBar>`); the host reads it live off `ROOM_STATE`.
 * `high` = full ambient/blur/choreography. `balanced` = the default.
 * `safe` = drops ambient motion + blur for a weak/mirrored TV.
 * `prefers-reduced-motion` still collapses everything further, on top of this.
 */
export type PerformanceMode = 'high' | 'balanced' | 'safe';

export const PERFORMANCE_MODES: readonly PerformanceMode[] = ['high', 'balanced', 'safe'];

export const DEFAULT_PERFORMANCE_MODE: PerformanceMode = 'balanced';
