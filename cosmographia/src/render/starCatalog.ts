import { BufferAttribute, BufferGeometry, Vector3 } from 'three';
import sky from '../data/sky.json';
import { raDecToEclipticJ2000 } from '../astro/frames';
import type { ConstellationSet } from '../models/era';

/**
 * The star catalogue (d3-celestial, magnitude ≤ 6) as GPU-ready arrays in the J2000 *ecliptic*
 * frame. Callers precess to the date with a group matrix.
 */

interface SkyData {
  stars: number[];
  names: { ra: number; dec: number; mag: number; name: string }[];
  constellations: { id: string; name: string; ra: number; dec: number; lines: number[][] }[];
}

const data = sky as SkyData;

/** Ptolemy's 48 constellations of the Almagest (Argo Navis drawn as its modern parts). */
export const PTOLEMAIC_CONSTELLATIONS = new Set([
  'And', 'Aqr', 'Aql', 'Ara', 'Car', 'Pup', 'Vel', 'Ari', 'Aur', 'Boo', 'Cnc', 'CMa', 'CMi', 'Cap', 'Cas', 'Cen',
  'Cep', 'Cet', 'CrA', 'CrB', 'Crv', 'Crt', 'Cyg', 'Del', 'Dra', 'Equ', 'Eri', 'Gem', 'Her', 'Hya', 'Leo', 'Lep',
  'Lib', 'Lup', 'Lyr', 'Oph', 'Ori', 'Peg', 'Per', 'Psc', 'PsA', 'Sge', 'Sgr', 'Sco', 'Ser', 'Tau', 'Tri', 'UMa',
  'UMi', 'Vir',
]);

/** Plancius, Bayer (Uranometria, 1603) and Bartsch additions. */
export const EARLY_MODERN_CONSTELLATIONS = new Set([
  'Aps', 'Cha', 'Dor', 'Gru', 'Hyi', 'Ind', 'Mus', 'Pav', 'Phe', 'TrA', 'Tuc', 'Vol', 'Com', 'Col', 'Mon', 'Cam', 'Cru',
]);

/** Hevelius's constellations (Firmamentum Sobiescianum, completed 1687). */
export const HEVELIUS_CONSTELLATIONS = new Set(['CVn', 'Lac', 'LMi', 'Lyn', 'Sct', 'Sex', 'Vul']);

export function constellationAllowed(id: string, set: ConstellationSet): boolean {
  if (PTOLEMAIC_CONSTELLATIONS.has(id)) return true;
  if (set === 'ptolemaic') return false;
  if (EARLY_MODERN_CONSTELLATIONS.has(id)) return true;
  return set === 'hevelius' && HEVELIUS_CONSTELLATIONS.has(id);
}

/** Approximate sRGB colour of a star from its B−V colour index. */
export function bvToRgb(bv: number): [number, number, number] {
  const table: [number, [number, number, number]][] = [
    [-0.4, [0.62, 0.72, 1.0]],
    [0.0, [0.8, 0.86, 1.0]],
    [0.4, [1.0, 0.98, 0.94]],
    [0.8, [1.0, 0.92, 0.78]],
    [1.2, [1.0, 0.82, 0.6]],
    [1.6, [1.0, 0.72, 0.46]],
    [2.0, [1.0, 0.62, 0.36]],
  ];
  const x = Math.max(-0.4, Math.min(2.0, bv));
  for (let i = 1; i < table.length; i++) {
    if (x <= table[i][0]) {
      const [x0, c0] = table[i - 1];
      const [x1, c1] = table[i];
      const f = (x - x0) / (x1 - x0);
      return [c0[0] + (c1[0] - c0[0]) * f, c0[1] + (c1[1] - c0[1]) * f, c0[2] + (c1[2] - c0[2]) * f];
    }
  }
  return table[table.length - 1][1];
}

/** Point size (CSS px) and intensity from visual magnitude. */
export function magnitudeToSize(mag: number): { size: number; intensity: number } {
  const size = Math.max(1.6, Math.min(11, 7.4 - 1.05 * mag));
  const intensity = Math.max(0.28, Math.min(1.25, 1.3 - 0.16 * mag));
  return { size, intensity };
}

export const STAR_COUNT = data.stars.length / 4;

export interface StarGeometryOptions {
  radius: number;
  /** Scatter stars in depth between radius and radius · depthFactor (Newton's infinite universe). */
  depthFactor?: number;
  sizeScale?: number;
  seed?: number;
}

/** Build a Points geometry of the whole catalogue. */
export function createStarGeometry(options: StarGeometryOptions): BufferGeometry {
  const n = STAR_COUNT;
  const positions = new Float32Array(n * 3);
  const colors = new Float32Array(n * 3);
  const sizes = new Float32Array(n);
  const v = new Vector3();
  let s = options.seed ?? 1;
  const rand = () => {
    s = (s * 16807) % 2147483647;
    return s / 2147483647;
  };
  for (let i = 0; i < n; i++) {
    const ra = data.stars[i * 4];
    const dec = data.stars[i * 4 + 1];
    const mag = data.stars[i * 4 + 2];
    const bv = data.stars[i * 4 + 3];
    raDecToEclipticJ2000(ra, dec, v);
    const r = options.depthFactor ? options.radius * (1 + (options.depthFactor - 1) * rand()) : options.radius;
    positions[i * 3] = v.x * r;
    positions[i * 3 + 1] = v.y * r;
    positions[i * 3 + 2] = v.z * r;
    const { size, intensity } = magnitudeToSize(mag);
    const [cr, cg, cb] = bvToRgb(bv);
    colors[i * 3] = cr * intensity;
    colors[i * 3 + 1] = cg * intensity;
    colors[i * 3 + 2] = cb * intensity;
    sizes[i] = size * (options.sizeScale ?? 1);
  }
  const g = new BufferGeometry();
  g.setAttribute('position', new BufferAttribute(positions, 3));
  g.setAttribute('color', new BufferAttribute(colors, 3));
  g.setAttribute('size', new BufferAttribute(sizes, 1));
  g.computeBoundingSphere();
  return g;
}

/** Constellation stick figures as segment pairs (J2000 ecliptic, on a sphere of `radius`). */
export function constellationSegments(set: ConstellationSet, radius: number): Float32Array {
  const out: number[] = [];
  const a = new Vector3();
  const b = new Vector3();
  for (const c of data.constellations) {
    if (!constellationAllowed(c.id, set)) continue;
    for (const line of c.lines) {
      for (let i = 0; i + 3 < line.length; i += 2) {
        raDecToEclipticJ2000(line[i], line[i + 1], a).multiplyScalar(radius);
        raDecToEclipticJ2000(line[i + 2], line[i + 3], b).multiplyScalar(radius);
        out.push(a.x, a.y, a.z, b.x, b.y, b.z);
      }
    }
  }
  return new Float32Array(out);
}

/** Constellation label anchors (J2000 ecliptic unit vectors). */
export function constellationLabels(set: ConstellationSet): { id: string; name: string; dir: Vector3 }[] {
  return data.constellations
    .filter((c) => constellationAllowed(c.id, set))
    .filter((c, i, arr) => arr.findIndex((d) => d.id === c.id) === i)
    .map((c) => ({ id: c.id, name: c.name, dir: raDecToEclipticJ2000(c.ra, c.dec) }));
}

/** Named bright stars (J2000 ecliptic unit vectors). */
export function namedStars(): { name: string; mag: number; dir: Vector3 }[] {
  const seen = new Set<string>();
  return data.names
    .filter((n) => (seen.has(n.name) ? false : (seen.add(n.name), true)))
    .map((n) => ({ name: n.name, mag: n.mag, dir: raDecToEclipticJ2000(n.ra, n.dec) }));
}
