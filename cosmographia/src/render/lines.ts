import { AdditiveBlending, Color, Vector2 } from 'three';
import { Line2 } from 'three/addons/lines/Line2.js';
import { LineGeometry } from 'three/addons/lines/LineGeometry.js';
import { LineMaterial } from 'three/addons/lines/LineMaterial.js';
import { LineSegments2 } from 'three/addons/lines/LineSegments2.js';
import { LineSegmentsGeometry } from 'three/addons/lines/LineSegmentsGeometry.js';
import type { LineStyle } from './palette';

/**
 * Fat lines with pixel widths. Every LineMaterial must know the viewport resolution, so all
 * materials created here are registered and resized together.
 */

const materials = new Set<LineMaterial>();
const resolution = new Vector2(1, 1);

export function setLineResolution(width: number, height: number): void {
  resolution.set(width, height);
  for (const m of materials) m.resolution.copy(resolution);
}

export function createLineMaterial(style: LineStyle, options: { vertexColors?: boolean; additive?: boolean } = {}): LineMaterial {
  const m = new LineMaterial({
    color: options.vertexColors ? 0xffffff : new Color(style.color).getHex(),
    linewidth: style.width,
    transparent: true,
    opacity: style.opacity,
    dashed: !!style.dashed,
    dashSize: 1,
    gapSize: 0.8,
    vertexColors: !!options.vertexColors,
    depthWrite: false,
    worldUnits: false,
  });
  if (options.additive) m.blending = AdditiveBlending;
  m.resolution.copy(resolution);
  materials.add(m);
  return m;
}

export function disposeLineMaterial(m: LineMaterial): void {
  materials.delete(m);
  m.dispose();
}

/** Closed circle of radius r in the XY plane. */
export function circlePoints(radius: number, segments = 160): Float32Array {
  const pts = new Float32Array((segments + 1) * 3);
  for (let i = 0; i <= segments; i++) {
    const a = (i / segments) * Math.PI * 2;
    pts[i * 3] = radius * Math.cos(a);
    pts[i * 3 + 1] = radius * Math.sin(a);
  }
  return pts;
}

/** Ellipse with a focus at the origin and perihelion along +X. */
export function ellipsePoints(a: number, e: number, segments = 256): Float32Array {
  const b = a * Math.sqrt(1 - e * e);
  const pts = new Float32Array((segments + 1) * 3);
  for (let i = 0; i <= segments; i++) {
    const E = (i / segments) * Math.PI * 2;
    pts[i * 3] = a * (Math.cos(E) - e);
    pts[i * 3 + 1] = b * Math.sin(E);
  }
  return pts;
}

export function createPolyline(points: Float32Array, material: LineMaterial): Line2 {
  const g = new LineGeometry();
  g.setPositions(points);
  const line = new Line2(g, material);
  line.computeLineDistances();
  return line;
}

/** A dynamic polyline of fixed capacity whose vertices can be rewritten in place each frame. */
export class DynamicPolyline {
  readonly line: Line2;
  private readonly capacity: number;
  private readonly positions: Float32Array;
  private readonly colors: Float32Array | null;

  constructor(capacity: number, material: LineMaterial, withColors: boolean) {
    this.capacity = capacity;
    const g = new LineGeometry();
    this.positions = new Float32Array(capacity * 3);
    g.setPositions(this.positions);
    this.colors = withColors ? new Float32Array(capacity * 3) : null;
    if (this.colors) g.setColors(this.colors);
    this.line = new Line2(g, material);
    this.line.frustumCulled = false;
  }

  /**
   * Write `count` points (xyz triples) and optional colours. Points beyond `count` collapse onto
   * the last point so they draw nothing.
   */
  update(points: Float32Array, count: number, colors?: Float32Array): void {
    const g = this.line.geometry as LineGeometry;
    const start = g.attributes.instanceStart as unknown as { data: { array: Float32Array; needsUpdate: boolean } };
    const seg = start.data.array;
    const n = Math.max(0, Math.min(count, this.capacity));
    for (let i = 0; i < this.capacity - 1; i++) {
      const a = Math.min(i, Math.max(n - 1, 0));
      const b = Math.min(i + 1, Math.max(n - 1, 0));
      seg[i * 6] = points[a * 3];
      seg[i * 6 + 1] = points[a * 3 + 1];
      seg[i * 6 + 2] = points[a * 3 + 2];
      seg[i * 6 + 3] = points[b * 3];
      seg[i * 6 + 4] = points[b * 3 + 1];
      seg[i * 6 + 5] = points[b * 3 + 2];
    }
    start.data.needsUpdate = true;
    if (colors && this.colors) {
      const cstart = g.attributes.instanceColorStart as unknown as { data: { array: Float32Array; needsUpdate: boolean } };
      const carr = cstart.data.array;
      for (let i = 0; i < this.capacity - 1; i++) {
        const a = Math.min(i, Math.max(n - 1, 0));
        const b = Math.min(i + 1, Math.max(n - 1, 0));
        carr[i * 6] = colors[a * 3];
        carr[i * 6 + 1] = colors[a * 3 + 1];
        carr[i * 6 + 2] = colors[a * 3 + 2];
        carr[i * 6 + 3] = colors[b * 3];
        carr[i * 6 + 4] = colors[b * 3 + 1];
        carr[i * 6 + 5] = colors[b * 3 + 2];
      }
      cstart.data.needsUpdate = true;
    }
    this.line.visible = n > 1;
    // Dashed materials read per-instance distances, which depend on the vertices just written.
    if ((this.line.material as LineMaterial).dashed && n > 1) this.line.computeLineDistances();
  }

  dispose(): void {
    this.line.geometry.dispose();
  }
}

/** Static line segments (pairs of points). */
export function createSegments(points: Float32Array, material: LineMaterial): LineSegments2 {
  const g = new LineSegmentsGeometry();
  g.setPositions(points);
  const s = new LineSegments2(g, material);
  s.computeLineDistances();
  return s;
}
