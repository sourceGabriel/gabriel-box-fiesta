import { useEffect } from 'react';
import { BrandMark } from '@party/ui';

interface AttractScreenProps {
  roomCode: string;
  connected: boolean;
  onlineCount: number;
  /** Advance to the game catalog (any key / any click / tap). */
  onStart: () => void;
  platformName?: string;
}

export function AttractScreen({
  roomCode,
  connected,
  onlineCount,
  onStart,
  platformName = 'Box Fiesta',
}: AttractScreenProps) {
  useEffect(() => {
    const advance = (): void => onStart();
    window.addEventListener('keydown', advance);
    return () => window.removeEventListener('keydown', advance);
  }, [onStart]);

  return (
    <main className="host-shell attract-screen" onClick={onStart} role="button" tabIndex={0}>
      <div className="attract-body">
        <BrandMark text={platformName} variant="platform" size="lg" />
        <p className="attract-tag">Festa de jogos na sua TV</p>

        <div className="attract-room">
          <span className="attract-room-label">Sala</span>
          <strong className="attract-room-code">{roomCode || '····'}</strong>
        </div>

        <p className="attract-online">
          {connected
            ? `${onlineCount} ${onlineCount === 1 ? 'celular conectado' : 'celulares conectados'}`
            : 'conectando…'}
        </p>

        <p className="attract-hint">Pressione qualquer tecla ou toque para começar</p>
      </div>
    </main>
  );
}
