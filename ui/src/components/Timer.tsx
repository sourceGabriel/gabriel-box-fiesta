/**
 * A labelled countdown chip. Turns red at or below `warnAt` seconds; `null` renders "—".
 * `active` adds an accent glow (e.g. "it's your turn").
 */
export function Timer({
  seconds,
  label = 'Tempo',
  warnAt = 8,
  active = false,
}: {
  seconds: number | null;
  label?: string;
  warnAt?: number;
  active?: boolean;
}) {
  const low = seconds !== null && seconds <= warnAt;
  return (
    <div className={`ui-timer ${low ? 'is-low' : ''} ${active ? 'is-active' : ''}`.replace(/\s+/g, ' ').trim()}>
      <span className="ui-timer-label">{label}</span>
      <strong>{seconds === null ? '—' : `${seconds}s`}</strong>
    </div>
  );
}
