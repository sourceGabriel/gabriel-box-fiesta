import type { ReactNode } from 'react';

/** Sticky top bar shown on every screen: room code + a "reconnecting" pill.
 * `children` is an optional right-side slot (the game view drops its turn timer here). */
export function MobileHeader({
  roomCode,
  connected,
  children,
}: {
  roomCode: string;
  connected: boolean;
  children?: ReactNode;
}) {
  return (
    <header className="mobile-header">
      <div className="header-room">
        <span className="eyebrow">Sala</span>
        <strong className="room-code-inline">{roomCode || '—'}</strong>
        {!connected ? <span className="conn-pill">reconectando…</span> : null}
      </div>
      {children}
    </header>
  );
}
