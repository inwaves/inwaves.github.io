import { Vector3 } from 'three';
import { AU_KM, DEG, fromLonLat, norm360 } from '../math';
import { centuriesSinceJ2000 } from '../time';

/**
 * Geocentric Moon from the principal periodic terms of Meeus, *Astronomical Algorithms*, ch. 47
 * (ELP-2000/82 truncated). Longitude is referred to the mean equinox of date.
 * Accuracy is a few arcminutes near the present and degrades slowly for ancient dates.
 */

export interface LunarArguments {
  /** Mean longitude L' */
  L: number;
  /** Mean elongation D */
  D: number;
  /** Sun's mean anomaly M */
  M: number;
  /** Moon's mean anomaly M' */
  Mp: number;
  /** Argument of latitude F */
  F: number;
  /** Longitude of the mean ascending node Ω */
  node: number;
}

/** Mean lunar arguments in degrees (of date). */
export function lunarArguments(T: number): LunarArguments {
  const T2 = T * T;
  const T3 = T2 * T;
  const T4 = T3 * T;
  return {
    L: 218.3164477 + 481267.88123421 * T - 0.0015786 * T2 + T3 / 538841 - T4 / 65194000,
    D: 297.8501921 + 445267.1114034 * T - 0.0018819 * T2 + T3 / 545868 - T4 / 113065000,
    M: 357.5291092 + 35999.0502909 * T - 0.0001536 * T2 + T3 / 24490000,
    Mp: 134.9633964 + 477198.8675055 * T + 0.0087414 * T2 + T3 / 69699 - T4 / 14712000,
    F: 93.272095 + 483202.0175233 * T - 0.0036539 * T2 - T3 / 3526000 + T4 / 863310000,
    node: 125.04452 - 1934.136261 * T + 0.0020708 * T2 + T3 / 450000,
  };
}

// [D, M, M', F, coefficient] for longitude (1e-6 deg) and distance (1e-3 km)
const LR_TERMS: readonly (readonly [number, number, number, number, number, number])[] = [
  [0, 0, 1, 0, 6288774, -20905355],
  [2, 0, -1, 0, 1274027, -3699111],
  [2, 0, 0, 0, 658314, -2955968],
  [0, 0, 2, 0, 213618, -569925],
  [0, 1, 0, 0, -185116, 48888],
  [0, 0, 0, 2, -114332, -3149],
  [2, 0, -2, 0, 58793, 246158],
  [2, -1, -1, 0, 57066, -152138],
  [2, 0, 1, 0, 53322, -170733],
  [2, -1, 0, 0, 45758, -204586],
  [0, 1, -1, 0, -40923, -129620],
  [1, 0, 0, 0, -34720, 108743],
  [0, 1, 1, 0, -30383, 104755],
  [2, 0, 0, -2, 15327, 10321],
  [0, 0, 1, 2, -12528, 0],
  [0, 0, 1, -2, 10980, 79661],
  [4, 0, -1, 0, 10675, -34782],
  [0, 0, 3, 0, 10034, -23210],
  [4, 0, -2, 0, 8548, -21636],
  [2, 1, -1, 0, -7888, 24208],
  [2, 1, 0, 0, -6766, 30824],
  [1, 0, -1, 0, -5163, -8379],
  [1, 1, 0, 0, 4987, -16675],
  [2, -1, 1, 0, 4036, -12831],
  [2, 0, 2, 0, 3994, -10445],
  [4, 0, 0, 0, 3861, -11650],
  [2, 0, -3, 0, 3665, 14403],
  [0, 1, -2, 0, -2689, -7003],
  [2, 0, -1, 2, -2602, 0],
  [2, -1, -2, 0, 2390, 10056],
  [1, 0, 1, 0, -2348, 6322],
  [2, -2, 0, 0, 2236, -9884],
];

// [D, M, M', F, coefficient] for latitude (1e-6 deg)
const B_TERMS: readonly (readonly [number, number, number, number, number])[] = [
  [0, 0, 0, 1, 5128122],
  [0, 0, 1, 1, 280602],
  [0, 0, 1, -1, 277693],
  [2, 0, 0, -1, 173237],
  [2, 0, -1, 1, 55413],
  [2, 0, -1, -1, 46271],
  [2, 0, 0, 1, 32573],
  [0, 0, 2, 1, 17198],
  [2, 0, 1, -1, 9266],
  [0, 0, 2, -1, 8822],
  [2, -1, 0, -1, 8216],
  [2, 0, -2, -1, 4324],
  [2, 0, 1, 1, 4200],
  [2, 1, 0, -1, -3359],
  [2, -1, -1, 1, 2463],
  [2, -1, 0, 1, 2211],
  [2, -1, -1, -1, 2065],
];

export interface MoonPosition {
  lon: number;
  lat: number;
  distanceKm: number;
}

/** Geocentric ecliptic longitude/latitude (degrees, equinox of date) and distance (km). */
export function moonPosition(jdTT: number): MoonPosition {
  const T = centuriesSinceJ2000(jdTT);
  const a = lunarArguments(T);
  const E = 1 - 0.002516 * T - 0.0000074 * T * T;
  const D = a.D * DEG;
  const M = a.M * DEG;
  const Mp = a.Mp * DEG;
  const F = a.F * DEG;
  let sl = 0;
  let sr = 0;
  for (const [d, m, mp, f, cl, cr] of LR_TERMS) {
    const arg = d * D + m * M + mp * Mp + f * F;
    const e = Math.abs(m) === 1 ? E : Math.abs(m) === 2 ? E * E : 1;
    sl += cl * e * Math.sin(arg);
    sr += cr * e * Math.cos(arg);
  }
  let sb = 0;
  for (const [d, m, mp, f, cb] of B_TERMS) {
    const arg = d * D + m * M + mp * Mp + f * F;
    const e = Math.abs(m) === 1 ? E : Math.abs(m) === 2 ? E * E : 1;
    sb += cb * e * Math.sin(arg);
  }
  const A1 = (119.75 + 131.849 * T) * DEG;
  const A2 = (53.09 + 479264.29 * T) * DEG;
  const A3 = (313.45 + 481266.484 * T) * DEG;
  const Lp = a.L * DEG;
  sl += 3958 * Math.sin(A1) + 1962 * Math.sin(Lp - F) + 318 * Math.sin(A2);
  sb += -2235 * Math.sin(Lp) + 382 * Math.sin(A3) + 175 * Math.sin(A1 - F) + 175 * Math.sin(A1 + F);
  sb += 127 * Math.sin(Lp - Mp) - 115 * Math.sin(Lp + Mp);
  return {
    lon: norm360(a.L + sl / 1e6),
    lat: sb / 1e6,
    distanceKm: 385000.56 + sr / 1000,
  };
}

/** Geocentric Moon vector in AU, ecliptic of date. */
export function moonGeocentricOfDate(jdTT: number, out = new Vector3()): Vector3 {
  const p = moonPosition(jdTT);
  return fromLonLat(p.lon, p.lat, p.distanceKm / AU_KM, out);
}
