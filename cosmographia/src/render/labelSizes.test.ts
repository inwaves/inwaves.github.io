import { describe, expect, it } from 'vitest';
import { LabelSizeCache } from './labelSizes';
import { anchoredBox, declutter } from './declutter';

describe('LabelSizeCache', () => {
  it('uses the estimate only until a real measurement exists, then keeps it while hidden', () => {
    const cache = new LabelSizeCache();
    const estimate = { width: 30, height: 20 };
    expect(cache.size('venus', 0, 0, estimate)).toEqual(estimate);
    expect(cache.size('venus', 64, 17, estimate)).toEqual({ width: 64, height: 17 });
    // display:none gives zero; the last real size is reused.
    expect(cache.size('venus', 0, 0, estimate)).toEqual({ width: 64, height: 17 });
    // Fonts finishing loading can change the width: the newest real measurement wins.
    expect(cache.size('venus', 70, 17, estimate)).toEqual({ width: 70, height: 17 });
  });

  it('keeps declutter decisions stable across frames when the estimate would fit but the real labels overlap', () => {
    const cache = new LabelSizeCache();
    const left = { x: 0, y: 1.4 };
    const estimate = { width: 20, height: 16 };
    const shownHistory: string[][] = [];
    const visible = new Set(['sun', 'mercury']);
    for (let frame = 0; frame < 6; frame++) {
      // Hidden labels measure as zero, visible ones at their real width of 90 px.
      const sun = cache.size('sun', visible.has('sun') ? 90 : 0, visible.has('sun') ? 16 : 0, estimate);
      const mercury = cache.size('mercury', visible.has('mercury') ? 90 : 0, visible.has('mercury') ? 16 : 0, estimate);
      const shown = declutter([
        anchoredBox('sun', 100, 100, sun.width, sun.height, left, 1),
        anchoredBox('mercury', 150, 100, mercury.width, mercury.height, left, 2),
      ]);
      shownHistory.push([...shown]);
      visible.clear();
      for (const id of shown) visible.add(id);
    }
    for (const shown of shownHistory) expect(shown).toEqual(['sun']);
  });
});
