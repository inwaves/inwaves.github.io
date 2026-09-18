import { Matrix3, Matrix4, Vector3 } from 'three';
import { DEG } from './math';

/**
 * Reference frames.
 *
 * Model frame: ecliptic of date, X toward the vernal equinox, Z toward the north ecliptic pole.
 * three.js world: Y up. `toThree` maps (x, y, z)_ecl -> (x, z, -y).
 */

export const OBLIQUITY_J2000_DEG = 23.4392911;

/** Mean obliquity of the ecliptic in degrees (Meeus 22.2). T in Julian centuries from J2000. */
export function obliquityDeg(T: number): number {
  return 23.439291111 + (-46.815 * T - 0.00059 * T * T + 0.001813 * T * T * T) / 3600;
}

/** Mean general precession in longitude since J2000, degrees (Meeus 21.6 with T0 = 0). */
export function precessionInLongitudeDeg(T: number): number {
  return (5029.0966 * T + 1.11113 * T * T - 0.000006 * T * T * T) / 3600;
}

/**
 * Rotation taking J2000 mean ecliptic coordinates to the mean ecliptic and equinox of date
 * (Meeus 21.7, rigorous ecliptic precession): R = Rz(p + Π) · Rx(-η) · Rz(-Π).
 */
export function precessionMatrix(T: number, out = new Matrix3()): Matrix3 {
  const arcsec = DEG / 3600;
  const eta = (47.0029 * T - 0.03302 * T * T + 0.00006 * T * T * T) * arcsec;
  const Pi = 174.876384 * DEG + (-869.8089 * T + 0.03536 * T * T) * arcsec;
  const p = (5029.0966 * T + 1.11113 * T * T - 0.000006 * T * T * T) * arcsec;
  const a = p + Pi;
  const ca = Math.cos(a);
  const sa = Math.sin(a);
  const ce = Math.cos(eta);
  const se = Math.sin(eta);
  const cp = Math.cos(Pi);
  const sp = Math.sin(Pi);
  // Rx(-eta) · Rz(-Pi)
  // Rz(-Pi) = [[cp, sp, 0], [-sp, cp, 0], [0, 0, 1]]
  // Rx(-eta) = [[1, 0, 0], [0, ce, se], [0, -se, ce]]
  const m = [
    [cp, sp, 0],
    [-ce * sp, ce * cp, se],
    [se * sp, -se * cp, ce],
  ];
  // Rz(a) = [[ca, -sa, 0], [sa, ca, 0], [0, 0, 1]]
  const r = [
    [ca * m[0][0] - sa * m[1][0], ca * m[0][1] - sa * m[1][1], ca * m[0][2] - sa * m[1][2]],
    [sa * m[0][0] + ca * m[1][0], sa * m[0][1] + ca * m[1][1], sa * m[0][2] + ca * m[1][2]],
    [m[2][0], m[2][1], m[2][2]],
  ];
  return out.set(r[0][0], r[0][1], r[0][2], r[1][0], r[1][1], r[1][2], r[2][0], r[2][1], r[2][2]);
}

const tmpMatrix = new Matrix3();

/** Precess a J2000 ecliptic vector to the ecliptic of date (in place allowed). */
export function precessToDate(v: Vector3, T: number, out = new Vector3()): Vector3 {
  return out.copy(v).applyMatrix3(precessionMatrix(T, tmpMatrix));
}

/** Ecliptic -> equatorial (same epoch), obliquity in degrees. */
export function eclipticToEquatorial(v: Vector3, obliquity: number, out = new Vector3()): Vector3 {
  const e = obliquity * DEG;
  const c = Math.cos(e);
  const s = Math.sin(e);
  const { x, y, z } = v;
  return out.set(x, y * c - z * s, y * s + z * c);
}

/** Equatorial -> ecliptic (same epoch), obliquity in degrees. */
export function equatorialToEcliptic(v: Vector3, obliquity: number, out = new Vector3()): Vector3 {
  const e = obliquity * DEG;
  const c = Math.cos(e);
  const s = Math.sin(e);
  const { x, y, z } = v;
  return out.set(x, y * c + z * s, -y * s + z * c);
}

/** Unit vector of J2000 right ascension / declination (degrees), in the J2000 *ecliptic* frame. */
export function raDecToEclipticJ2000(raDeg: number, decDeg: number, out = new Vector3()): Vector3 {
  const ra = raDeg * DEG;
  const dec = decDeg * DEG;
  const cd = Math.cos(dec);
  out.set(cd * Math.cos(ra), cd * Math.sin(ra), Math.sin(dec));
  return equatorialToEcliptic(out, OBLIQUITY_J2000_DEG, out);
}

/** Map an ecliptic-frame vector to three.js world coordinates (Y up). */
export function toThree(v: { x: number; y: number; z: number }, out = new Vector3()): Vector3 {
  return out.set(v.x, v.z, -v.y);
}

/** Inverse of `toThree`. */
export function fromThree(v: { x: number; y: number; z: number }, out = new Vector3()): Vector3 {
  return out.set(v.x, -v.z, v.y);
}

/** Matrix4 equivalent of `toThree` (for composing with other frame rotations). */
export const ECLIPTIC_TO_THREE = new Matrix4().set(1, 0, 0, 0, 0, 0, 1, 0, 0, -1, 0, 0, 0, 0, 0, 1);

/**
 * Matrix taking ecliptic-of-date vectors to a three.js *horizon* frame for an observer:
 * +X = east, +Y = zenith, -Z = north.
 */
export function eclipticToHorizonMatrix(obliquity: number, lst: number, latitude: number, out = new Matrix4()): Matrix4 {
  const e = obliquity * DEG;
  const ce = Math.cos(e);
  const se = Math.sin(e);
  // ecliptic -> equatorial
  const eq = new Matrix4().set(1, 0, 0, 0, 0, ce, -se, 0, 0, se, ce, 0, 0, 0, 0, 1);
  // equatorial -> hour-angle frame (x toward meridian, y toward east on the equator)
  const t = lst * DEG;
  const ct = Math.cos(t);
  const st = Math.sin(t);
  const ha = new Matrix4().set(ct, st, 0, 0, -st, ct, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1);
  // hour-angle frame -> (east, zenith, south)
  const f = latitude * DEG;
  const cf = Math.cos(f);
  const sf = Math.sin(f);
  // north = (-sin f, 0, cos f), east = (0, 1, 0), zenith = (cos f, 0, sin f)
  const hz = new Matrix4().set(0, 1, 0, 0, cf, 0, sf, 0, sf, 0, -cf, 0, 0, 0, 0, 1);
  return out.copy(hz).multiply(ha).multiply(eq);
}

/** Altitude and azimuth (degrees, azimuth from north through east) of a horizon-frame vector. */
export function altAzOfHorizonVector(v: Vector3): { alt: number; az: number } {
  const r = v.length();
  const alt = Math.asin(Math.max(-1, Math.min(1, v.y / r))) / DEG;
  let az = Math.atan2(v.x, -v.z) / DEG;
  if (az < 0) az += 360;
  return { alt, az };
}
