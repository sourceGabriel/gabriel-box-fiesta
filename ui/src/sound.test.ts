import { describe, expect, it, vi } from 'vitest';
import { createSounds, type SoundName } from './sound';

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

  it('toggle flips and reports the new state', () => {
    const ctx = new FakeAudioContext();
    const sounds = createSounds(ctx as unknown as AudioContext);
    const first = sounds.toggle();
    expect(sounds.isEnabled()).toBe(first);
    expect(sounds.toggle()).toBe(!first);
  });
});
