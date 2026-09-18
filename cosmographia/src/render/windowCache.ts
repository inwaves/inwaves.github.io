/**
 * A cache of computed samples keyed by integer grid index, trimmed to a sliding window.
 * Used for time-quantised samples that are revisited while time runs forward or backward.
 */
export class WindowCache<T> {
  private readonly map = new Map<number, T>();

  get size(): number {
    return this.map.size;
  }

  /** Return the cached sample at `index`, computing it on a miss. */
  get(index: number, compute: (index: number) => T): T {
    let value = this.map.get(index);
    if (value === undefined) {
      value = compute(index);
      this.map.set(index, value);
    }
    return value;
  }

  /** Drop every sample whose index lies outside [lo, hi]. */
  retain(lo: number, hi: number): void {
    for (const key of this.map.keys()) {
      if (key < lo || key > hi) this.map.delete(key);
    }
  }

  clear(): void {
    this.map.clear();
  }
}
