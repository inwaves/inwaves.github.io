import { describe, expect, it } from 'vitest';
import { createLineMaterial, DynamicPolyline } from './lines';

interface DistanceAttribute {
  data: { array: Float32Array };
  count: number;
  getX(i: number): number;
}

function distances(poly: DynamicPolyline): { start: number[]; end: number[] } {
  const g = poly.line.geometry;
  const s = g.getAttribute('instanceDistanceStart') as unknown as DistanceAttribute;
  const e = g.getAttribute('instanceDistanceEnd') as unknown as DistanceAttribute;
  const start: number[] = [];
  const end: number[] = [];
  for (let i = 0; i < s.count; i++) {
    start.push(s.getX(i));
    end.push(e.getX(i));
  }
  return { start, end };
}

describe('DynamicPolyline', () => {
  it('initialises and refreshes dash distances when vertices change', () => {
    const material = createLineMaterial({ color: '#ffffff', width: 1, opacity: 1, dashed: true });
    const poly = new DynamicPolyline(2, material, false);

    poly.update(new Float32Array([0, 0, 0, 3, 4, 0]), 2);
    let d = distances(poly);
    expect(d.start[0]).toBeCloseTo(0, 9);
    expect(d.end[0]).toBeCloseTo(5, 9);

    poly.update(new Float32Array([1, 1, 1, 1, 1, 13]), 2);
    d = distances(poly);
    expect(d.end[0]).toBeCloseTo(12, 9);
    poly.dispose();
  });

  it('collapses unused capacity onto the last point', () => {
    const material = createLineMaterial({ color: '#ffffff', width: 1, opacity: 1 });
    const poly = new DynamicPolyline(4, material, false);
    poly.update(new Float32Array([0, 0, 0, 1, 0, 0, 9, 9, 9, 9, 9, 9]), 2);
    const start = poly.line.geometry.getAttribute('instanceStart') as unknown as DistanceAttribute;
    const seg = start.data.array;
    // second and third segments are degenerate at (1, 0, 0)
    expect(Array.from(seg.slice(6, 12))).toEqual([1, 0, 0, 1, 0, 0]);
    expect(Array.from(seg.slice(12, 18))).toEqual([1, 0, 0, 1, 0, 0]);
    expect(poly.line.visible).toBe(true);
    poly.update(new Float32Array(12), 1);
    expect(poly.line.visible).toBe(false);
  });
});
