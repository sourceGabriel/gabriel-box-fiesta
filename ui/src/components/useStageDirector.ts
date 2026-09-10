import { useCallback, useEffect, useRef, useState } from 'react';
import type { AvatarSpec } from '@party/shared';
import type { BroadcastItem, ResolvedBroadcast } from './Broadcast';
import type { HostScene } from './HostStage';
import { useMomentQueue, type QueuedMoment } from './useMomentQueue';

/**
 * The host "stage director": one hook that owns the `<Moment>` queue AND the
 * `<Broadcast>` lower-third stream, and the rules for how they yield to each
 * other.
 *
 * - Moments (full-screen beats) are enqueued explicitly from `publicState`
 *   transitions — they need rich data (the winning answer, the eliminated
 *   player) that isn't always in an event.
 * - Broadcasts (lower-thirds) come from the event stream via `broadcastFor`.
 * - Interruption table (spike → Phase 1):
 *     • while a moment is on screen, `ambient` broadcasts are dropped and
 *       `important` ones wait; `critical` still shows.
 *     • in a dramatic scene (`reveal` / `victory` / `score`), `ambient` is
 *       dropped.
 *     • `critical` replaces whatever lower-third is up.
 */

const DEFAULT_MS: Record<BroadcastItem['tier'], number> = { critical: 2600, important: 1800, ambient: 1400 };
const DRAMATIC: HostScene[] = ['reveal', 'victory', 'score'];

export interface StageDirectorOpts {
  events: { seq: number; event: unknown }[];
  scene: HostScene;
  broadcastFor: (event: unknown) => BroadcastItem | null;
  nameFor?: (id: string) => string;
  avatarFor?: (id: string) => AvatarSpec | undefined;
}

export interface StageDirector {
  moment: ReturnType<typeof useMomentQueue>['current'];
  momentId: string | null;
  broadcast: ResolvedBroadcast | null;
  enqueueMoment: (m: QueuedMoment) => void;
  clear: () => void;
}

export function useStageDirector({ events, scene, broadcastFor, nameFor, avatarFor }: StageDirectorOpts): StageDirector {
  const q = useMomentQueue();
  const [broadcast, setBroadcast] = useState<ResolvedBroadcast | null>(null);
  const pending = useRef<ResolvedBroadcast[]>([]);
  const seenSeq = useRef(0);
  const expiry = useRef<number | null>(null);

  const momentActive = q.current !== null;
  const dramatic = DRAMATIC.includes(scene);

  const pump = useCallback(() => {
    setBroadcast((cur) => {
      if (cur) return cur;
      const next = pending.current.shift() ?? null;
      if (next) {
        window.clearTimeout(expiry.current ?? undefined);
        expiry.current = window.setTimeout(() => {
          setBroadcast(null);
          window.setTimeout(pump, 0);
        }, next.durationMs ?? DEFAULT_MS[next.tier]);
      }
      return next;
    });
  }, []);

  // Feed broadcasts from fresh events.
  useEffect(() => {
    if (events.length === 0) {
      seenSeq.current = 0;
      pending.current = [];
      return;
    }
    const last = events[events.length - 1].seq;
    if (last <= seenSeq.current) return;
    const fresh = events.filter((e) => e.seq > seenSeq.current);
    seenSeq.current = last;

    for (const { seq, event } of fresh) {
      const item = broadcastFor(event);
      if (!item) continue;
      if (item.tier === 'ambient' && (momentActive || dramatic)) continue;

      const resolved: ResolvedBroadcast = {
        ...item,
        id: `b${seq}`,
        name: item.playerId ? nameFor?.(item.playerId) : undefined,
        avatar: item.playerId ? avatarFor?.(item.playerId) : undefined,
      };

      if (item.tier === 'critical') {
        window.clearTimeout(expiry.current ?? undefined);
        pending.current = pending.current.filter((p) => p.tier === 'critical');
        setBroadcast(resolved);
        expiry.current = window.setTimeout(() => {
          setBroadcast(null);
          window.setTimeout(pump, 0);
        }, resolved.durationMs ?? DEFAULT_MS.critical);
        continue;
      }
      pending.current.push(resolved);
    }
    if (!momentActive) pump();
  }, [events, momentActive, dramatic, broadcastFor, nameFor, avatarFor, pump]);

  useEffect(() => () => window.clearTimeout(expiry.current ?? undefined), []);

  const clear = useCallback(() => {
    pending.current = [];
    window.clearTimeout(expiry.current ?? undefined);
    setBroadcast(null);
    q.clear();
  }, [q]);

  return { moment: q.current, momentId: q.currentId, broadcast, enqueueMoment: q.enqueue, clear };
}
