import { Vector3 } from 'three';
import { timeContext } from '../models/mechanism';
import type { TimeContext } from '../models/types';

/**
 * Analytic trail sampling on a fixed time grid. Samples are cached by grid index, so as time
 * advances only the newest few are computed while the trail stays perfectly smooth at any speed
 * and in reverse.
 */
export class TrailSampler {
  private readonly cache = new Map<number, Vector3>();
  private readonly endpoint = new Vector3();
  private key = '';

  constructor(
    readonly samples: number,
    private readonly compute: (t: TimeContext, out: Vector3) => Vector3,
  ) {}

  /** Drop cached samples (model, frame or span changed). */
  invalidate(): void {
    this.cache.clear();
  }

  /**
   * Fill `out` with `samples + 1` points: the oldest first, ending with `current` (the body's
   * position this frame). Returns the number of points written.
   */
  fill(jd: number, spanDays: number, current: Vector3, out: Float32Array, colors: Float32Array | null, rgb: [number, number, number]): number {
    // Copy first: sample callbacks may reuse scratch vectors that alias `current`.
    const endpoint = this.endpoint.copy(current);
    const n = this.samples;
    const step = spanDays / n;
    const key = `${step}`;
    if (key !== this.key) {
      this.cache.clear();
      this.key = key;
    }
    const k0 = Math.floor(jd / step);
    let written = 0;
    for (let i = n - 1; i >= 0; i--) {
      const k = k0 - i;
      let p = this.cache.get(k);
      if (!p) {
        p = this.compute(timeContext(k * step), new Vector3());
        this.cache.set(k, p);
      }
      out[written * 3] = p.x;
      out[written * 3 + 1] = p.y;
      out[written * 3 + 2] = p.z;
      if (colors) {
        const f = Math.pow(written / n, 1.6);
        colors[written * 3] = rgb[0] * f;
        colors[written * 3 + 1] = rgb[1] * f;
        colors[written * 3 + 2] = rgb[2] * f;
      }
      written++;
    }
    out[written * 3] = endpoint.x;
    out[written * 3 + 1] = endpoint.y;
    out[written * 3 + 2] = endpoint.z;
    if (colors) {
      colors[written * 3] = rgb[0];
      colors[written * 3 + 1] = rgb[1];
      colors[written * 3 + 2] = rgb[2];
    }
    written++;
    if (this.cache.size > n * 3) {
      for (const k of this.cache.keys()) {
        if (k < k0 - n - 2 || k > k0 + 2) this.cache.delete(k);
      }
    }
    return written;
  }
}
