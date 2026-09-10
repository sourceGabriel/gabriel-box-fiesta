import { useCallback, useRef, useState } from 'react';
import type { MomentProps } from './Moment';

/**
 * The host "stage director" — a tiny priority queue that feeds one `<Moment>` at
 * a time. Events arrive from the server in bursts; without this they'd all try to
 * render at once.
 *
 * Spike scope: FIFO + integer priority (higher jumps the line) + de-dup by `id`
 * + a `>= 100` priority preempts whatever is on screen. The full contract
 * (coalescence, expiry, per-scene interruption table) lands in Phase 1.
 */

export interface QueuedMoment {
  /** Stable id — a second enqueue with the same id is ignored. Also the React key. */
  id: string;
  /** Higher shows sooner; `>= 100` preempts the current moment. */
  priority?: number;
  moment: MomentProps;
}

export interface MomentQueue {
  /** The moment to render now (spread onto `<Moment>`), or null. */
  current: MomentProps | null;
  /** React key for `current` — changes as the queue advances. */
  currentId: string | null;
  enqueue: (item: QueuedMoment) => void;
  clear: () => void;
}

export function useMomentQueue(): MomentQueue {
  const [active, setActive] = useState<QueuedMoment | null>(null);
  const pending = useRef<QueuedMoment[]>([]);
  const seen = useRef<Set<string>>(new Set());

  const pump = useCallback(() => {
    setActive((cur) => cur ?? pending.current.shift() ?? null);
  }, []);

  const enqueue = useCallback(
    (item: QueuedMoment) => {
      if (seen.current.has(item.id)) return;
      seen.current.add(item.id);

      if ((item.priority ?? 0) >= 100) {
        setActive((cur) => {
          if (cur && cur.id !== item.id) pending.current.unshift(cur);
          return item;
        });
        return;
      }

      const at = pending.current.findIndex((m) => (m.priority ?? 0) < (item.priority ?? 0));
      if (at === -1) pending.current.push(item);
      else pending.current.splice(at, 0, item);
      pump();
    },
    [pump],
  );

  const clear = useCallback(() => {
    pending.current = [];
    seen.current.clear();
    setActive(null);
  }, []);

  const current: MomentProps | null = active
    ? {
        ...active.moment,
        onDone: () => {
          active.moment.onDone?.();
          setActive(null);
          window.setTimeout(pump, 0); // let the exit animation finish
        },
      }
    : null;

  return { current, currentId: active?.id ?? null, enqueue, clear };
}
