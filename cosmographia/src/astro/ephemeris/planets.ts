import { Vector3 } from 'three';
import { DEG, norm180 } from '../math';
import { centuriesSinceJ2000 } from '../time';
import { precessionInLongitudeDeg, precessToDate } from '../frames';
import { orbitalPlaneToEcliptic, solveKepler } from './kepler';

/**
 * Approximate planetary positions from JPL's Keplerian elements (Standish & Williams),
 * Table 2a/2b, valid 3000 BC – 3000 AD, mean ecliptic and equinox of J2000.
 * https://ssd.jpl.nasa.gov/planets/approx_pos.html
 */

export type PlanetId = 'mercury' | 'venus' | 'emb' | 'mars' | 'jupiter' | 'saturn';
export const PLANET_IDS: readonly PlanetId[] = ['mercury', 'venus', 'emb', 'mars', 'jupiter', 'saturn'];

interface ElementRow {
  /** a [AU], e, I [deg], L [deg], long. peri [deg], long. node [deg] */
  el: readonly [number, number, number, number, number, number];
  /** rates per Julian century */
  rate: readonly [number, number, number, number, number, number];
  /** b, c, s, f additional mean-anomaly terms (Table 2b) */
  extra?: readonly [number, number, number, number];
}

const TABLE: Record<PlanetId, ElementRow> = {
  mercury: {
    el: [0.38709843, 0.20563661, 7.00559432, 252.25166724, 77.45771895, 48.33961819],
    rate: [0.0, 0.00002123, -0.00590158, 149472.67486623, 0.15940013, -0.12214182],
  },
  venus: {
    el: [0.72332102, 0.00676399, 3.39777545, 181.9797085, 131.76755713, 76.67261496],
    rate: [-0.00000026, -0.00005107, 0.00043494, 58517.8156026, 0.05679648, -0.27274174],
  },
  emb: {
    el: [1.00000018, 0.01673163, -0.00054346, 100.46691572, 102.93005885, -5.11260389],
    rate: [-0.00000003, -0.00003661, -0.01337178, 35999.37306329, 0.3179526, -0.24123856],
  },
  mars: {
    el: [1.52371243, 0.09336511, 1.85181869, -4.56813164, -23.91744784, 49.71320984],
    rate: [0.00000097, 0.00009149, -0.00724757, 19140.29934243, 0.45223625, -0.26852431],
  },
  jupiter: {
    el: [5.20248019, 0.0485359, 1.29861416, 34.33479152, 14.27495244, 100.29282654],
    rate: [-0.00002864, 0.00018026, -0.00322699, 3034.90371757, 0.18199196, 0.13024619],
    extra: [-0.00012452, 0.0606406, -0.35635438, 38.35125],
  },
  saturn: {
    el: [9.54149883, 0.05550825, 2.49424102, 50.07571329, 92.86136063, 113.63998702],
    rate: [-0.00003065, -0.00032044, 0.00451969, 1222.11494724, 0.54179478, -0.25015002],
    extra: [0.00025899, -0.13434469, 0.87320147, 38.35125],
  },
};

export interface MeanElements {
  a: number;
  e: number;
  /** inclination, degrees */
  I: number;
  /** mean longitude, degrees */
  L: number;
  /** longitude of perihelion, degrees */
  varpi: number;
  /** longitude of ascending node, degrees */
  node: number;
  /** mean anomaly including Table 2b terms, degrees in [-180, 180) */
  M: number;
}

/** Osculating-style mean elements in the J2000 frame at T centuries from J2000. */
export function meanElementsJ2000(id: PlanetId, T: number): MeanElements {
  const row = TABLE[id];
  const [a0, e0, I0, L0, w0, O0] = row.el;
  const [a1, e1, I1, L1, w1, O1] = row.rate;
  const a = a0 + a1 * T;
  const e = e0 + e1 * T;
  const I = I0 + I1 * T;
  const L = L0 + L1 * T;
  const varpi = w0 + w1 * T;
  const node = O0 + O1 * T;
  let M = L - varpi;
  if (row.extra) {
    const [b, c, s, f] = row.extra;
    M += b * T * T + c * Math.cos(f * T * DEG) + s * Math.sin(f * T * DEG);
  }
  return { a, e, I, L, varpi, node, M: norm180(M) };
}

/**
 * Mean elements referred to the equinox of date: longitudes shifted by general precession.
 * Used by the historical models to phase their uniform motions to the real sky.
 */
export function meanElementsOfDate(id: PlanetId, jdTT: number): MeanElements {
  const T = centuriesSinceJ2000(jdTT);
  const m = meanElementsJ2000(id, T);
  const p = precessionInLongitudeDeg(T);
  return { ...m, L: m.L + p, varpi: m.varpi + p, node: m.node + p };
}

/** Heliocentric position (AU) in the J2000 ecliptic frame. */
export function heliocentricJ2000(id: PlanetId, jdTT: number, out = new Vector3()): Vector3 {
  const T = centuriesSinceJ2000(jdTT);
  const m = meanElementsJ2000(id, T);
  const E = solveKepler(m.M * DEG, m.e);
  const xp = m.a * (Math.cos(E) - m.e);
  const yp = m.a * Math.sqrt(1 - m.e * m.e) * Math.sin(E);
  return orbitalPlaneToEcliptic(xp, yp, m.varpi - m.node, m.I, m.node, out);
}

/** Heliocentric position (AU) in the ecliptic of date. */
export function heliocentricOfDate(id: PlanetId, jdTT: number, out = new Vector3()): Vector3 {
  heliocentricJ2000(id, jdTT, out);
  return precessToDate(out, centuriesSinceJ2000(jdTT), out);
}
