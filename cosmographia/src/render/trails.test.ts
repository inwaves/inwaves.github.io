import { describe, expect, it } from 'vitest';
import { Vector3 } from 'three';
import { TrailSampler } from './trails';

describe('TrailSampler', () => {
  it('ends with the current position even when sample callbacks overwrite an aliased vector', () => {
    const scratch = new Vector3();
    const sampler = new TrailSampler(10, (t, out) => {
      scratch.set(-1, -1, -1); // simulates a callback reusing the caller's scratch vector
      return out.set(t.jd, 0, 0);
    });
    const out = new Float32Array(11 * 3);
    const current = scratch.set(7, 8, 9);
    const count = sampler.fill(2451545.3, 10, current, out, null, [1, 1, 1]);
    expect(count).toBe(11);
    expect(Array.from(out.slice(30, 33))).toEqual([7, 8, 9]);
  });

  it('samples a fixed grid ending at or before the current instant, oldest first', () => {
    const sampler = new TrailSampler(4, (t, out) => out.set(t.jd, 0, 0));
    const out = new Float32Array(5 * 3);
    const colors = new Float32Array(5 * 3);
    sampler.fill(100.5, 4, new Vector3(100.5, 0, 0), out, colors, [1, 0.5, 0.25]);
    expect([out[0], out[3], out[6], out[9], out[12]]).toEqual([97, 98, 99, 100, 100.5]);
    // colours fade from dark (oldest) to full (current)
    expect(colors[0]).toBe(0);
    expect(colors[12]).toBe(1);
  });

  it('reuses cached samples as time advances', () => {
    let calls = 0;
    const sampler = new TrailSampler(8, (t, out) => {
      calls++;
      return out.set(t.jd, 0, 0);
    });
    const out = new Float32Array(9 * 3);
    sampler.fill(1000, 8, new Vector3(), out, null, [1, 1, 1]);
    const first = calls;
    sampler.fill(1001, 8, new Vector3(), out, null, [1, 1, 1]);
    expect(first).toBe(8);
    expect(calls - first).toBe(1);
  });
});
