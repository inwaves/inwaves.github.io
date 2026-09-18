import { centuriesSinceJ2000 } from '../../astro/time';
import { precessionInLongitudeDeg } from '../../astro/frames';
import { lunarArguments } from '../../astro/ephemeris/moon';
import { meanElementsOfDate, type PlanetId } from '../../astro/ephemeris/planets';

/**
 * Mean motions of the real sky, of date. Historical models whose own tables are not preserved
 * (or were fitted to their own era) are phased with these so their uniform circles start where
 * the planets actually were, and then run on their own mechanism.
 */

export type ClassicalPlanet = 'mercury' | 'venus' | 'mars' | 'jupiter' | 'saturn';
export const CLASSICAL_PLANETS: readonly ClassicalPlanet[] = ['mercury', 'venus', 'mars', 'jupiter', 'saturn'];

/** Tropical mean motions, degrees/day (J2000 rates plus general precession). */
export const MEAN_MOTION = {
  sun: 35999.37306329 / 36525 + 50.29 / 3600 / 365.25,
  mercury: 149472.67486623 / 36525 + 50.29 / 3600 / 365.25,
  venus: 58517.8156026 / 36525 + 50.29 / 3600 / 365.25,
  mars: 19140.29934243 / 36525 + 50.29 / 3600 / 365.25,
  jupiter: 3034.90371757 / 36525 + 50.29 / 3600 / 365.25,
  saturn: 1222.11494724 / 36525 + 50.29 / 3600 / 365.25,
} as const;

/** Sidereal periods in days. */
export const SIDEREAL_PERIOD = {
  mercury: 87.969,
  venus: 224.701,
  earth: 365.25636,
  mars: 686.98,
  jupiter: 4332.59,
  saturn: 10759.22,
  moon: 27.321662,
} as const;

export interface PlanetMean {
  /** heliocentric mean longitude of date */
  L: number;
  /** longitude of perihelion of date */
  varpi: number;
  node: number;
  I: number;
  e: number;
  a: number;
}

export function planetMean(id: PlanetId, jdTT: number): PlanetMean {
  const m = meanElementsOfDate(id, jdTT);
  return { L: m.L, varpi: m.varpi, node: m.node, I: m.I, e: m.e, a: m.a };
}

/** The Sun's geocentric mean elements, of date. */
export function sunMean(jdTT: number): { L: number; perigee: number; apogee: number; e: number } {
  const emb = meanElementsOfDate('emb', jdTT);
  return { L: emb.L + 180, perigee: emb.varpi + 180, apogee: emb.varpi, e: emb.e };
}

/** Mean lunar arguments of date (degrees). */
export function moonMean(jdTT: number) {
  return lunarArguments(centuriesSinceJ2000(jdTT));
}

/** General precession since J2000 in degrees for a TT Julian Date. */
export function precessionSinceJ2000(jdTT: number): number {
  return precessionInLongitudeDeg(centuriesSinceJ2000(jdTT));
}
