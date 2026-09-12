import { useState } from 'react';
import type { PerformanceMode } from '@party/shared';
import type { Send } from './messages';
import './host-controls.css';

const PERF_OPTIONS: { mode: PerformanceMode; label: string }[] = [
  { mode: 'high', label: 'Alta' },
  { mode: 'balanced', label: 'Padrão' },
  { mode: 'safe', label: 'Leve' },
];

/**
 * The owner's mid-game controls, on their phone — so the TV stays a clean stage.
 * Shown only to the room owner while a game is running. Pause / resume / end +
 * the TV's rendering budget (`performanceMode` — drop to "Leve" on a weak/mirrored TV).
 * "Nova partida" and "Próxima rodada" stay on the TV's end-of-phase screens.
 *
 * `paused` is read generically from the game's public state: every game uses the
 * phase value `"paused"` when the host has paused it.
 */
export function HostControlsBar({
  paused,
  performanceMode,
  send,
}: {
  paused: boolean;
  performanceMode: PerformanceMode;
  send: Send;
}) {
  const [confirmEnd, setConfirmEnd] = useState(false);
  const [showPerf, setShowPerf] = useState(false);

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
      <button
        type="button"
        className="host-bar-btn"
        aria-expanded={showPerf}
        onClick={() => setShowPerf((v) => !v)}
      >
        🖥️ TV: {PERF_OPTIONS.find((o) => o.mode === performanceMode)?.label ?? performanceMode}
      </button>
      {showPerf ? (
        <div className="host-bar-perf">
          {PERF_OPTIONS.map((o) => (
            <button
              key={o.mode}
              type="button"
              className={`host-bar-perf-btn ${o.mode === performanceMode ? 'is-active' : ''}`}
              onClick={() => {
                send('SET_PERFORMANCE_MODE', { mode: o.mode });
                setShowPerf(false);
              }}
            >
              {o.label}
            </button>
          ))}
        </div>
      ) : null}
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
