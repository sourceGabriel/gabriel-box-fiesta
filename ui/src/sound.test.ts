import { describe, expect, it, vi } from 'vitest';
import { createSounds, registerCues, type SoundName } from './sound';

class FakeParam {
  value = 0;
  setValueAtTime() { return this; }
  linearRampToValueAtTime() { return this; }
  exponentialRampToValueAtTime() { return this; }
}

class FakeNode {
  type: OscillatorType = 'sine';
  frequency = new FakeParam();
  gain = new FakeParam();
  playbackRate = new FakeParam();
  buffer: unknown = null;
  connect(next: unknown) { return next; }
  disconnect() {}
  start() {}
  stop() {}
}

class FakeAudioContext {
  currentTime = 0;
  state: AudioContextState = 'running';
  destination = new FakeNode();
  createOscillator = vi.fn(() => new FakeNode());
  createGain = vi.fn(() => new FakeNode());
  createBufferSource = vi.fn(() => new FakeNode());
  decodeAudioData = vi.fn(() => Promise.resolve({} as AudioBuffer));
  resume = vi.fn(() => Promise.resolve());
  close = vi.fn(() => Promise.resolve());
}

const ALL: SoundName[] = ['cardPlay', 'draw', 'turn', 'special', 'uno', 'win', 'error', 'select'];

describe('createSounds', () => {
  it('every sound plays without throwing and builds oscillators', () => {
    const ctx = new FakeAudioContext();
    const sounds = createSounds(ctx as unknown as AudioContext);
    for (const name of ALL) {
      expect(() => sounds.play(name)).not.toThrow();
    }
    expect(ctx.createOscillator).toHaveBeenCalled();
  });

  it('produces no audio nodes while muted', () => {
    const ctx = new FakeAudioContext();
    const sounds = createSounds(ctx as unknown as AudioContext);
    sounds.setEnabled(false);
    const before = ctx.createOscillator.mock.calls.length;
    sounds.cardPlay();
    sounds.win();
    expect(ctx.createOscillator.mock.calls.length).toBe(before);
    expect(sounds.isEnabled()).toBe(false);
  });

  it('sample() and play({sample}) do not throw (synth + sampled share the API)', () => {
    const ctx = new FakeAudioContext();
    const sounds = createSounds(ctx as unknown as AudioContext);
    expect(() => sounds.sample('ui-click')).not.toThrow();
    expect(() => sounds.play({ sample: 'stinger-win', gain: 0.8 })).not.toThrow();
    sounds.setEnabled(false);
    expect(() => sounds.sample('card-play')).not.toThrow();
  });

  it('play({cue}) uses the fallback until a cue is registered, then fetches the clip', async () => {
    const ctx = new FakeAudioContext();
    const sounds = createSounds(ctx as unknown as AudioContext);
    const fetchMock = vi.fn(() => Promise.resolve({ arrayBuffer: () => Promise.resolve(new ArrayBuffer(8)) }));
    vi.stubGlobal('fetch', fetchMock);

    // no cue registered -> falls back to the bundled sample (no throw)
    expect(() => sounds.play({ cue: 'meme.test', fallback: { sample: 'stinger-lose' } })).not.toThrow();

    registerCues({ 'meme.test': '/sound-local/x.mp3' });
    sounds.play({ cue: 'meme.test', fallback: { sample: 'stinger-lose' } });
    await new Promise((r) => setTimeout(r, 0));
    expect(fetchMock).toHaveBeenCalledWith('/sound-local/x.mp3');

    registerCues({ 'meme.test': undefined });
    vi.unstubAllGlobals();
  });

  it('toggle flips and reports the new state', () => {
    const ctx = new FakeAudioContext();
    const sounds = createSounds(ctx as unknown as AudioContext);
    const first = sounds.toggle();
    expect(sounds.isEnabled()).toBe(first);
    expect(sounds.toggle()).toBe(!first);
  });
});
