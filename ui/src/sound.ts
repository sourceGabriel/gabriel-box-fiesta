/**
 * @party/ui — the app sound system: synthesized Web-Audio blips (a few
 * oscillators shaped by a gain envelope) plus a bundled CC0 sample pack
 * (`./sound-assets/`, loaded lazily). Both share one master gain + mute.
 *
 *   import { getSounds } from '@party/ui';
 *   getSounds().cardPlay();                 // synth
 *   getSounds().play({ sample: 'card-play' }); // sampled clip
 *
 * The AudioContext starts suspended until a user gesture; `getSounds()` installs
 * a one-time pointer/key listener that resumes it, and `unlock()` can force it.
 * Mute state persists in localStorage under `party:sound`.
 */

import type { SampleId } from './sound-assets';

export type { SampleId } from './sound-assets';

/**
 * The bundled clip pack is loaded lazily the first time a sample plays, so apps
 * that never call `sample()` (the mobile controller) don't ship the .ogg files.
 */
let samplesPromise: Promise<Record<string, string>> | undefined;
const sampleUrls = (): Promise<Record<string, string>> => {
  if (!samplesPromise) {
    samplesPromise = import('./sound-assets').then((m) => m.SOUND_SAMPLES).catch(() => ({}));
  }
  return samplesPromise;
};

export type SoundName =
  | 'cardPlay'
  | 'draw'
  | 'turn'
  | 'special'
  | 'uno'
  | 'win'
  | 'error'
  | 'select';

/**
 * How to play one sound:
 *  - a synth name (`'turn'`),
 *  - a bundled CC0 clip (`{ sample: 'card-play' }`),
 *  - a **local cue** (`{ cue: 'meme.loser', fallback: { sample: 'stinger-lose' } }`):
 *    a named slot the owner can fill with their own clip via the host's
 *    `sound-local/` drop-folder. If nothing is registered for the cue, `fallback`
 *    plays (so the committed pack still works with an empty drop-folder).
 */
export type SoundSpec =
  | SoundName
  | { sample: SampleId; gain?: number; rate?: number }
  | { cue: string; fallback?: SoundSpec; gain?: number; rate?: number };

export interface Sounds {
  cardPlay(): void;
  draw(): void;
  turn(): void;
  special(): void;
  uno(): void;
  win(): void;
  error(): void;
  select(): void;
  /** Play a synth sound by name, or a sampled clip via `{ sample: id }`. */
  play(spec: SoundSpec): void;
  /** Play a bundled CC0 clip (`ui/src/sound-assets/`), sharing the mute state. */
  sample(id: SampleId, opts?: { gain?: number; rate?: number }): void;
  /** Resume the AudioContext (call from a user-gesture handler if needed). */
  unlock(): void;
  isEnabled(): boolean;
  setEnabled(on: boolean): void;
  /** Flip mute and return the new state. */
  toggle(): boolean;
}

const STORAGE_KEY = 'party:sound';
type Wave = OscillatorType;

/**
 * Local-cue registry: `cue name -> clip URL`. Filled at runtime by the host from
 * its `sound-local/` drop-folder (see `registerCues`). Empty by default, so an
 * untouched checkout just falls back to the bundled pack.
 */
const cueUrls = new Map<string, string>();

/**
 * Register owner-supplied local clips for named cues (`{ 'meme.loser': '/sound-local/aura.mp3' }`).
 * Merges into whatever is already registered; a falsy URL clears that cue.
 */
export function registerCues(map: Record<string, string | undefined>): void {
  for (const [cue, url] of Object.entries(map)) {
    if (url) cueUrls.set(cue, url);
    else cueUrls.delete(cue);
  }
}

interface Blip {
  type?: Wave;
  /** start frequency (Hz) */
  freq: number;
  /** optional end frequency for a glide */
  to?: number;
  /** seconds */
  dur: number;
  /** peak gain 0..1 */
  gain?: number;
  /** start offset in seconds */
  at?: number;
}

const readEnabled = (): boolean => {
  try {
    return localStorage.getItem(STORAGE_KEY) !== 'off';
  } catch {
    return true;
  }
};

const writeEnabled = (on: boolean): void => {
  try {
    localStorage.setItem(STORAGE_KEY, on ? 'on' : 'off');
  } catch {
    // ignore storage errors
  }
};

/** A no-op instance for SSR / no-Web-Audio environments. */
const silent = (): Sounds => {
  let enabled = true;
  const noop = (): void => {};
  return {
    cardPlay: noop, draw: noop, turn: noop, special: noop, uno: noop, win: noop, error: noop, select: noop,
    play: noop, sample: noop, unlock: noop,
    isEnabled: () => enabled,
    setEnabled: (on) => { enabled = on; },
    toggle: () => { enabled = !enabled; return enabled; },
  };
};

/**
 * Build a Sounds instance. Pass a context (or a stub) for tests; otherwise a
 * shared AudioContext is created lazily on the first sound.
 */
export function createSounds(injectedCtx?: AudioContext): Sounds {
  const AudioCtor: typeof AudioContext | undefined =
    injectedCtx
      ? undefined
      : (typeof window !== 'undefined'
          ? (window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext)
          : undefined);

  if (!injectedCtx && !AudioCtor) {
    return silent();
  }

  let ctx: AudioContext | undefined = injectedCtx;
  let master: GainNode | undefined;
  let enabled = readEnabled();

  const ensure = (): AudioContext | undefined => {
    if (!ctx && AudioCtor) {
      ctx = new AudioCtor();
    }
    if (ctx && !master) {
      master = ctx.createGain();
      master.gain.value = 0.32;
      master.connect(ctx.destination);
    }
    return ctx;
  };

  const unlock = (): void => {
    const c = ensure();
    if (c && c.state === 'suspended') {
      void c.resume();
    }
  };

  // Resume on the first user gesture (browsers keep audio suspended until then).
  if (typeof window !== 'undefined' && !injectedCtx) {
    const kick = (): void => {
      unlock();
      window.removeEventListener('pointerdown', kick);
      window.removeEventListener('keydown', kick);
    };
    window.addEventListener('pointerdown', kick, { once: true });
    window.addEventListener('keydown', kick, { once: true });
  }

  const render = (blips: Blip[]): void => {
    if (!enabled) return;
    const c = ensure();
    if (!c) return;
    if (c.state === 'suspended') void c.resume();
    const now = c.currentTime;
    for (const b of blips) {
      const t0 = now + (b.at ?? 0);
      const osc = c.createOscillator();
      const g = c.createGain();
      osc.type = b.type ?? 'sine';
      osc.frequency.setValueAtTime(b.freq, t0);
      if (b.to !== undefined && b.to !== b.freq) {
        osc.frequency.exponentialRampToValueAtTime(Math.max(1, b.to), t0 + b.dur);
      }
      const peak = b.gain ?? 0.6;
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(peak, t0 + Math.min(0.015, b.dur * 0.3));
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + b.dur);
      osc.connect(g);
      if (master) g.connect(master);
      else g.connect(c.destination);
      osc.start(t0);
      osc.stop(t0 + b.dur + 0.05);
    }
  };

  // --- sampled clips (bundled CC0 ogg, decoded once, cached) ---
  const bufferCache = new Map<string, Promise<AudioBuffer | null>>();

  const loadUrl = (cacheKey: string, url: () => Promise<string | undefined>): Promise<AudioBuffer | null> => {
    let p = bufferCache.get(cacheKey);
    if (!p) {
      const c = ensure();
      p = !c
        ? Promise.resolve(null)
        : url()
            .then((u) => {
              if (!u) return null;
              return fetch(u)
                .then((r) => r.arrayBuffer())
                .then((buf) => c.decodeAudioData(buf));
            })
            .catch(() => null);
      bufferCache.set(cacheKey, p);
    }
    return p;
  };

  const loadSample = (id: SampleId): Promise<AudioBuffer | null> =>
    loadUrl(id, () => sampleUrls().then((urls) => urls[id]));

  const playBuffer = (
    load: Promise<AudioBuffer | null>,
    opts?: { gain?: number; rate?: number },
  ): void => {
    if (!enabled) return;
    const c = ensure();
    if (!c) return;
    if (c.state === 'suspended') void c.resume();
    void load.then((buf) => {
      if (!buf || !enabled) return;
      const src = c.createBufferSource();
      src.buffer = buf;
      src.playbackRate.value = opts?.rate ?? 1;
      const g = c.createGain();
      g.gain.value = opts?.gain ?? 0.9;
      src.connect(g);
      g.connect(master ?? c.destination);
      src.start();
    });
  };

  const sample = (id: SampleId, opts?: { gain?: number; rate?: number }): void => {
    playBuffer(loadSample(id), opts);
  };

  const sounds: Sounds = {
    cardPlay: () => render([{ type: 'triangle', freq: 520, to: 300, dur: 0.09, gain: 0.5 }]),
    draw: () => render([{ type: 'sine', freq: 240, to: 180, dur: 0.08, gain: 0.45 }]),
    turn: () => render([
      { type: 'sine', freq: 523, dur: 0.1, gain: 0.4 },
      { type: 'sine', freq: 784, dur: 0.14, gain: 0.4, at: 0.09 },
    ]),
    special: () => render([{ type: 'sawtooth', freq: 180, to: 720, dur: 0.16, gain: 0.28 }]),
    uno: () => render([
      { type: 'triangle', freq: 660, dur: 0.1, gain: 0.5 },
      { type: 'triangle', freq: 880, dur: 0.1, gain: 0.5, at: 0.08 },
      { type: 'triangle', freq: 1175, dur: 0.22, gain: 0.5, at: 0.16 },
    ]),
    win: () => render([
      { type: 'sine', freq: 523, dur: 0.12, gain: 0.45 },
      { type: 'sine', freq: 659, dur: 0.12, gain: 0.45, at: 0.11 },
      { type: 'sine', freq: 784, dur: 0.12, gain: 0.45, at: 0.22 },
      { type: 'sine', freq: 1047, dur: 0.34, gain: 0.5, at: 0.33 },
    ]),
    error: () => render([{ type: 'sawtooth', freq: 200, to: 120, dur: 0.22, gain: 0.3 }]),
    select: () => render([{ type: 'sine', freq: 1200, dur: 0.03, gain: 0.25 }]),
    sample,
    play: (spec) => {
      if (typeof spec === 'string') {
        sounds[spec]();
        return;
      }
      if ('cue' in spec) {
        const url = cueUrls.get(spec.cue);
        if (url) {
          playBuffer(loadUrl(`cue:${spec.cue}:${url}`, () => Promise.resolve(url)), spec);
        } else if (spec.fallback) {
          sounds.play(spec.fallback);
        }
        return;
      }
      sample(spec.sample, spec);
    },
    unlock,
    isEnabled: () => enabled,
    setEnabled: (on) => {
      enabled = on;
      writeEnabled(on);
      if (on) unlock();
    },
    toggle: () => {
      sounds.setEnabled(!enabled);
      return enabled;
    },
  };

  return sounds;
}

let shared: Sounds | undefined;

/** The app-wide Sounds instance (created on first use). */
export function getSounds(): Sounds {
  if (!shared) {
    shared = createSounds();
  }
  return shared;
}
