import { describe, expect, it } from 'vitest';
import { boxesOverlap, labelBox, resolveOverlaps } from '../src/render/labels.js';

/** A box `w` wide and 16 tall whose left edge is at x, centred on y. */
const box = (x, y, w = 40) => [x, y - 8, x + w, y + 8];

describe('boxesOverlap', () => {
  it('detects shared area', () => {
    expect(boxesOverlap(box(0, 0), box(20, 4))).toBe(true);
  });

  it('is false for boxes apart horizontally or vertically', () => {
    expect(boxesOverlap(box(0, 0), box(60, 0))).toBe(false);
    expect(boxesOverlap(box(0, 0), box(0, 30))).toBe(false);
  });

  it('does not count boxes that merely touch', () => {
    expect(boxesOverlap(box(0, 0, 40), box(40, 0, 40))).toBe(false);
    expect(boxesOverlap([0, 0, 10, 10], [0, 10, 10, 20])).toBe(false);
  });

  it('is symmetric, and true for containment', () => {
    const outer = [0, 0, 100, 100];
    const inner = [40, 40, 50, 50];
    expect(boxesOverlap(outer, inner)).toBe(true);
    expect(boxesOverlap(inner, outer)).toBe(true);
  });
});

describe('labelBox', () => {
  it('places the text to the right of its anchor, centred on it vertically', () => {
    // The centre of a 1920 by 1080 viewport.
    expect(labelBox(0, 0, 1920, 1080, 10, 4, 7, 8)).toEqual([970, 532, 998, 548]);
  });

  it('maps normalised device coordinates with y pointing up', () => {
    const top = labelBox(0, 1, 1000, 800, 0, 1, 10, 5);
    const bottom = labelBox(0, -1, 1000, 800, 0, 1, 10, 5);
    expect(top[1]).toBeLessThan(bottom[1]);
    expect(labelBox(-1, 0, 1000, 800, 0, 1, 10, 5)[0]).toBe(0);
    expect(labelBox(1, 0, 1000, 800, 0, 1, 10, 5)[0]).toBe(1000);
  });

  it('moves the text outward as the body it names grows on screen', () => {
    const small = labelBox(0, 0, 1920, 1080, 11, 5, 7, 8);
    const drumCloseUp = labelBox(0, 0, 1920, 1080, 206, 5, 7, 8);
    expect(drumCloseUp[0] - small[0]).toBe(195);
  });

  it('is wider for longer text', () => {
    const short = labelBox(0, 0, 1000, 800, 0, 3, 7, 8);
    const long = labelBox(0, 0, 1000, 800, 0, 13, 7, 8);
    expect(long[2] - long[0]).toBeGreaterThan(short[2] - short[0]);
  });
});

describe('resolveOverlaps', () => {
  it('hides nothing when nothing collides', () => {
    expect(resolveOverlaps([{ rank: 0, box: box(0, 0) }, { rank: 1, box: box(100, 0) }, { rank: 2, box: box(0, 50) }])).toEqual([]);
  });

  it('hides the less important of two colliding labels, whatever order they arrive in', () => {
    expect(resolveOverlaps([{ rank: 5, box: box(0, 0) }, { rank: 1, box: box(10, 0) }])).toEqual([0]);
    expect(resolveOverlaps([{ rank: 1, box: box(10, 0) }, { rank: 5, box: box(0, 0) }])).toEqual([1]);
  });

  it('lets a body name beat a guide caption: "empty focus" must not print across "Sun"', () => {
    // The regression this module exists for. Mars's empty focus lies a dozen
    // pixels from the Sun when the whole system is in view.
    const sun = { rank: 0, box: labelBox(0, 0, 1920, 1080, 15, 3, 7, 8) };
    const emptyFocus = { rank: 100, box: labelBox(-0.012, 0.006, 1920, 1080, 8, 11, 6, 7) };
    expect(boxesOverlap(sun.box, emptyFocus.box)).toBe(true);
    expect(resolveOverlaps([emptyFocus, sun])).toEqual([0]);
  });

  it('lets the selected body beat even the Sun', () => {
    const sun = { rank: 0, box: box(0, 0) };
    const selectedMercury = { rank: -1, box: box(12, 2) };
    expect(resolveOverlaps([sun, selectedMercury])).toEqual([0]);
  });

  it('gives a hidden label no claim on space, so it cannot push out a third', () => {
    // A overlaps B, and B overlaps C, but A and C are clear of each other.
    // B loses to A. C then competes only with A, not with the hidden B.
    const a = { rank: 0, box: box(0, 0, 40) };
    const b = { rank: 1, box: box(30, 0, 40) };
    const c = { rank: 2, box: box(60, 0, 40) };
    expect(boxesOverlap(a.box, b.box) && boxesOverlap(b.box, c.box)).toBe(true);
    expect(boxesOverlap(a.box, c.box)).toBe(false);
    expect(resolveOverlaps([a, b, c])).toEqual([1]);
  });

  it('thins a crowded cluster to its most important member', () => {
    // The Sun, Mercury, Venus and the Moon piled up at the centre of Ptolemy's cosmos.
    const cluster = [3, 0, 2, 1].map((rank, i) => ({ rank, box: box(i * 4, i * 2) }));
    const hidden = resolveOverlaps(cluster);
    expect(hidden).toHaveLength(3);
    expect(hidden).not.toContain(1); // rank 0 survives
  });

  it('keeps the earlier of two equally ranked labels', () => {
    expect(resolveOverlaps([{ rank: 100, box: box(0, 0) }, { rank: 100, box: box(5, 0) }])).toEqual([1]);
  });

  it('handles no labels at all', () => {
    expect(resolveOverlaps([])).toEqual([]);
  });
});
