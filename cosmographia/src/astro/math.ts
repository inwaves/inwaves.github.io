import { Vector3 } from 'three';

export const DEG = Math.PI / 180;
export const RAD = 180 / Math.PI;
export const TAU = 2 * Math.PI;

export const AU_KM = 149_597_870.7;
export const EARTH_RADIUS_KM = 6378.137;
/** Gaussian gravitational constant (AU^1.5 / day). */
export const GAUSS_K = 0.01720209895;

/** Normalise degrees to [0, 360). */
export function norm360(deg: number): number {
  const r = deg % 360;
  return r < 0 ? r + 360 : r;
}

/** Normalise degrees to [-180, 180). */
export function norm180(deg: number): number {
  const r = norm360(deg);
  return r >= 180 ? r - 360 : r;
}

export function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}

/**
 * Sexagesimal digits to a decimal number, as Ptolemy wrote them:
 * `sex(12, 11, 26, 41)` = 12;11,26,41 = 12 + 11/60 + 26/3600 + 41/216000.
 */
export function sex(...digits: number[]): number {
  let value = 0;
  let factor = 1;
  for (const d of digits) {
    value += d / factor;
    factor *= 60;
  }
  return value;
}

/** Ecliptic longitude/latitude (degrees) and radius of a vector in an ecliptic frame. */
export function lonLatOf(v: { x: number; y: number; z: number }): { lon: number; lat: number; r: number } {
  const r = Math.hypot(v.x, v.y, v.z);
  if (r === 0) return { lon: 0, lat: 0, r: 0 };
  return {
    lon: norm360(Math.atan2(v.y, v.x) * RAD),
    lat: Math.asin(clamp(v.z / r, -1, 1)) * RAD,
    r,
  };
}

/** Vector from longitude/latitude (degrees) and radius. */
export function fromLonLat(lonDeg: number, latDeg: number, r = 1, out = new Vector3()): Vector3 {
  const l = lonDeg * DEG;
  const b = latDeg * DEG;
  const cb = Math.cos(b);
  return out.set(r * cb * Math.cos(l), r * cb * Math.sin(l), r * Math.sin(b));
}

/** Angular separation of two direction vectors in degrees. */
export function separationDeg(a: Vector3, b: Vector3): number {
  return a.angleTo(b) * RAD;
}

export const ZODIAC_SIGNS = [
  // U+FE0E requests the text (not emoji) presentation of each sign.
  { name: 'Aries', glyph: '\u2648\uFE0E' },
  { name: 'Taurus', glyph: '\u2649\uFE0E' },
  { name: 'Gemini', glyph: '\u264A\uFE0E' },
  { name: 'Cancer', glyph: '\u264B\uFE0E' },
  { name: 'Leo', glyph: '\u264C\uFE0E' },
  { name: 'Virgo', glyph: '\u264D\uFE0E' },
  { name: 'Libra', glyph: '\u264E\uFE0E' },
  { name: 'Scorpio', glyph: '\u264F\uFE0E' },
  { name: 'Sagittarius', glyph: '\u2650\uFE0E' },
  { name: 'Capricorn', glyph: '\u2651\uFE0E' },
  { name: 'Aquarius', glyph: '\u2652\uFE0E' },
  { name: 'Pisces', glyph: '\u2653\uFE0E' },
] as const;

/** Longitude written the way ancient and medieval astronomers did: sign, degrees, minutes. */
export function formatZodiacal(lonDeg: number): string {
  const totalMinutes = Math.round(norm360(lonDeg) * 60) % 21600;
  const sign = Math.floor(totalMinutes / 1800);
  const within = totalMinutes - sign * 1800;
  const deg = Math.floor(within / 60);
  const min = within - deg * 60;
  return `${ZODIAC_SIGNS[sign].glyph} ${ZODIAC_SIGNS[sign].name} ${deg}\u00B0${String(min).padStart(2, '0')}\u2032`;
}

/** Signed angle in degrees and arcminutes, e.g. "-3°07′". */
export function formatDegMin(deg: number): string {
  const sign = deg < 0 ? '-' : '';
  const totalMinutes = Math.round(Math.abs(deg) * 60);
  const d = Math.floor(totalMinutes / 60);
  const m = totalMinutes - d * 60;
  return `${sign}${d}\u00B0${String(m).padStart(2, '0')}\u2032`;
}

/** Deterministic pseudo-random generator (mulberry32) for reproducible procedural content. */
export function seededRandom(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
