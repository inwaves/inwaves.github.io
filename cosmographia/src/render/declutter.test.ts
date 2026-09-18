import { describe, expect, it } from 'vitest';
import { anchoredBox, declutter } from './declutter';

describe('label declutter', () => {
  it('keeps the higher-priority label when two overlap', () => {
    const shown = declutter([
      { id: 'mercury', x: 100, y: 100, width: 50, height: 16, priority: 1 },
      { id: 'sun', x: 110, y: 104, width: 30, height: 16, priority: 0 },
    ]);
    expect([...shown]).toEqual(['sun']);
  });

  it('keeps labels that do not touch', () => {
    const shown = declutter([
      { id: 'io', x: 0, y: 0, width: 20, height: 14, priority: 3 },
      { id: 'jupiter', x: 200, y: 0, width: 50, height: 14, priority: 1 },
      { id: 'europa', x: 0, y: 40, width: 40, height: 14, priority: 3 },
    ]);
    expect(shown).toEqual(new Set(['io', 'jupiter', 'europa']));
  });

  it('is stable for equal priorities', () => {
    const boxes = [
      { id: 'b', x: 0, y: 0, width: 40, height: 14, priority: 2 },
      { id: 'a', x: 5, y: 2, width: 40, height: 14, priority: 2 },
    ];
    expect([...declutter(boxes)]).toEqual(['a']);
    expect([...declutter([...boxes].reverse())]).toEqual(['a']);
  });

  it('uses the label’s real anchor: left-anchored labels of unequal width collide as drawn', () => {
    const left = { x: 0, y: 1.4 };
    // A 100 px label anchored at x = 0 spans [0, 100]; a 20 px label at x = 70 spans [70, 90].
    const wide = anchoredBox('mercury', 0, 200, 100, 16, left, 1);
    const narrow = anchoredBox('io', 70, 200, 20, 16, left, 2);
    expect(wide.x).toBe(50);
    expect(narrow.x).toBe(80);
    expect([...declutter([wide, narrow])]).toEqual(['mercury']);
    // Centre-anchored boxes at the same anchors would have (wrongly) kept both.
    const centred = { x: 0.5, y: 0.5 };
    expect(declutter([anchoredBox('a', 0, 200, 100, 16, centred, 1), anchoredBox('b', 70, 200, 20, 16, centred, 2)]).size).toBe(2);
  });

  it('places boxes above a label anchored with center.y > 1', () => {
    const box = anchoredBox('sun', 300, 400, 40, 20, { x: 0, y: 1.4 }, 0);
    expect(box.y).toBeCloseTo(400 - 0.9 * 20, 9);
  });
});
