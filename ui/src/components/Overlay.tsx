import type { ReactNode } from 'react';

/** Full-screen modal: dimmed backdrop + a centred card. Content is the caller's. */
export function Overlay({ children, label }: { children: ReactNode; label?: string }) {
  return (
    <div className="ui-overlay" role="dialog" aria-modal="true" aria-label={label} aria-live="polite">
      <div className="ui-overlay-card">{children}</div>
    </div>
  );
}
