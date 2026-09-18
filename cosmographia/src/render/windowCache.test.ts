import { describe, expect, it } from 'vitest';
import { WindowCache } from './windowCache';

/** Simulates the area-law renderer: each frame reads a window of `width` indices ending at k0. */
function frame(cache: WindowCache<number>, k0: number, width: number, calls: { n: number }) {
  for (let i = k0 - width; i <= k0; i++) cache.get(i, (x) => (calls.n++, x * 2));
  cache.retain(k0 - width, k0);
}

describe('WindowCache', () => {
  it('stays bounded and reuses samples during forward playback', () => {
    const cache = new WindowCache<number>();
    const calls = { n: 0 };
    for (let k = 1000; k < 1500; k++) frame(cache, k, 50, calls);
    expect(cache.size).toBe(51);
    expect(calls.n).toBe(51 + 499);
  });

  it('stays bounded during reverse playback', () => {
    const cache = new WindowCache<number>();
    const calls = { n: 0 };
    for (let k = 1500; k > 1000; k--) frame(cache, k, 50, calls);
    expect(cache.size).toBe(51);
    expect(calls.n).toBe(51 + 499);
  });

  it('discards the old window on date jumps in either direction', () => {
    const cache = new WindowCache<number>();
    const calls = { n: 0 };
    frame(cache, 5000, 20, calls);
    frame(cache, -3000, 20, calls);
    expect(cache.size).toBe(21);
    frame(cache, 90000, 20, calls);
    expect(cache.size).toBe(21);
    expect(cache.get(90000, () => -1)).toBe(180000);
  });
});
