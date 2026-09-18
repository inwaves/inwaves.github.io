import { Vector3 } from 'three';
import { calendarToJd, centuriesSinceJ2000 } from '../time';
import { precessToDate } from '../frames';
import { conicPosition, type CometElements } from './kepler';

/**
 * Historically significant comets, with orbital elements from the JPL Small-Body Database
 * (J2000 ecliptic). These are the comets Tycho, Newton and Halley reasoned about.
 */

export type CometId = 'c1577' | 'c1680' | 'halley';

/** Halley's 1682 perihelion, 1682 Sep 15.28 TT (Gregorian calendar). */
const HALLEY_1682_PERIHELION = calendarToJd(1682, 9, 15.28, true);

export interface CometSpec {
  id: CometId;
  name: string;
  elements: CometElements;
  /** Julian Dates (TT) between which the comet is drawn with a tail. */
  visibleFrom: number;
  visibleTo: number;
  note: string;
}

export const COMETS: readonly CometSpec[] = [
  {
    id: 'c1577',
    name: 'Great Comet of 1577',
    elements: { q: 0.1775, e: 1.0, i: 104.883, node: 31.237, argPeri: 255.673, tp: 2297356.948 },
    visibleFrom: 2297356.948 - 20,
    visibleTo: 2297356.948 + 90,
    note: 'Tycho measured no daily parallax: the comet lay far beyond the Moon, among the planets.',
  },
  {
    id: 'c1680',
    name: 'Great Comet of 1680 (Kirch)',
    elements: { q: 0.006222, e: 0.999986, i: 60.6784, node: 276.6339, argPeri: 350.6128, tp: 2335019.9876 },
    visibleFrom: 2335019.9876 - 45,
    visibleTo: 2335019.9876 + 110,
    note: 'Newton fitted its path with a parabola about the Sun in Principia, Book III.',
  },
  {
    id: 'halley',
    name: "Halley's Comet (1682 apparition)",
    // 1682 perihelion 1682 Sep 15 (TT); shape and orientation after the modern orbit.
    elements: { q: 0.5826, e: 0.9673, i: 162.26, node: 58.42, argPeri: 111.33, tp: HALLEY_1682_PERIHELION },
    visibleFrom: HALLEY_1682_PERIHELION - 60,
    visibleTo: HALLEY_1682_PERIHELION + 60,
    note: 'Halley showed the comets of 1531, 1607 and 1682 were one body and predicted its return in 1758.',
  },
];

export const COMETS_BY_ID: Record<CometId, CometSpec> = Object.fromEntries(COMETS.map((c) => [c.id, c])) as Record<
  CometId,
  CometSpec
>;

/** Heliocentric comet position (AU), ecliptic of date. */
export function cometOfDate(id: CometId, jdTT: number, out = new Vector3()): Vector3 {
  conicPosition(COMETS_BY_ID[id].elements, jdTT, out);
  return precessToDate(out, centuriesSinceJ2000(jdTT), out);
}
