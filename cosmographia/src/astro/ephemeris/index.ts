import { Vector3 } from 'three';
import { lonLatOf } from '../math';
import { heliocentricOfDate, type PlanetId } from './planets';
import { moonGeocentricOfDate } from './moon';

/**
 * The modern sky: where bodies really were, as seen from the centre of the Earth.
 * All vectors are in AU in the ecliptic of date.
 */

export type TruthBodyId = 'sun' | 'moon' | 'mercury' | 'venus' | 'mars' | 'jupiter' | 'saturn';
export const TRUTH_BODIES: readonly TruthBodyId[] = ['sun', 'moon', 'mercury', 'venus', 'mars', 'jupiter', 'saturn'];

const earthTmp = new Vector3();

/** Heliocentric position of the Earth–Moon barycentre (AU, ecliptic of date). */
export function earthHeliocentric(jdTT: number, out = new Vector3()): Vector3 {
  return heliocentricOfDate('emb', jdTT, out);
}

/** Geocentric position (AU, ecliptic of date). Light-time is neglected (< 0.01° for the planets). */
export function geocentric(body: TruthBodyId, jdTT: number, out = new Vector3()): Vector3 {
  if (body === 'moon') return moonGeocentricOfDate(jdTT, out);
  earthHeliocentric(jdTT, earthTmp);
  if (body === 'sun') return out.copy(earthTmp).negate();
  heliocentricOfDate(body as PlanetId, jdTT, out);
  return out.sub(earthTmp);
}

/** Geocentric ecliptic longitude/latitude (degrees) and distance (AU). */
export function geocentricLonLat(body: TruthBodyId, jdTT: number): { lon: number; lat: number; r: number } {
  return lonLatOf(geocentric(body, jdTT, new Vector3()));
}

export { heliocentricOfDate, meanElementsOfDate, type PlanetId } from './planets';
export { moonPosition, lunarArguments } from './moon';
export { satelliteOfDate, SATELLITES, SATELLITES_BY_ID, type SatelliteId } from './satellites';
export { cometOfDate, COMETS, COMETS_BY_ID, type CometId } from './comets';
