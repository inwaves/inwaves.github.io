import { describe, expect, it } from 'vitest';
import { labelVisibleAt } from './labelVisibility';

describe('sky label visibility', () => {
  it('hides a label below the horizon and restores it when it rises', () => {
    let y = -300;
    expect(labelVisibleAt(true, true, y)).toBe(false);
    y = 250;
    expect(labelVisibleAt(true, true, y)).toBe(true);
  });

  it('restores below-horizon labels when leaving horizon mode', () => {
    expect(labelVisibleAt(true, true, -500)).toBe(false);
    expect(labelVisibleAt(true, false, -500)).toBe(true);
  });

  it('never shows a label whose base visibility is off', () => {
    expect(labelVisibleAt(false, false, 900)).toBe(false);
    expect(labelVisibleAt(false, true, 900)).toBe(false);
  });
});
