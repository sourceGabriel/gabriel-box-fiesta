import { useState } from 'react';
import type { Send } from './messages';
import './host-controls.css';

/**
 * The owner's mid-game controls, on their phone — so the TV stays a clean stage.
 * Shown only to the room owner while a game is running. Pause / resume / end.
 * "Nova partida" and "Próxima rodada" stay on the TV's end-of-phase screens.
 *
 * `paused` is read generically from the game's public state: every game uses the
 * phase value `"paused"` when the host has paused it.
 */
export function HostControlsBar({ paused, send }: { paused: boolean; send: Send }) {
  const [confirmEnd, setConfirmEnd] = useState(false);

  return (
    <div className="host-bar" role="region" aria-label="Controles do anfitrião">
      <span className="host-bar-tag">🎛️ Anfitrião</span>
      <button
        type="button"
        className="host-bar-btn"
        onClick={() => send(paused ? 'RESUME_GAME' : 'PAUSE_GAME', {})}
      >
        {paused ? '▶ Retomar' : '⏸ Pausar'}
      </button>
      {confirmEnd ? (
        <>
          <button type="button" className="host-bar-btn is-danger" onClick={() => send('END_GAME', {})}>
            Confirmar
          </button>
          <button type="button" className="host-bar-btn" onClick={() => setConfirmEnd(false)}>
            Cancelar
          </button>
        </>
      ) : (
        <button type="button" className="host-bar-btn is-danger" onClick={() => setConfirmEnd(true)}>
          ⏹ Encerrar
        </button>
      )}
    </div>
  );
}
