import { Vector3 } from 'three';
import { AU_KM, DEG } from '../math';
import { centuriesSinceJ2000, J2000 } from '../time';
import { precessToDate } from '../frames';

/**
 * Planetary satellites on circular orbits.
 *
 * Each orbit plane and starting direction come from the JPL Horizons state vector at J2000
 * (ecliptic J2000, planet-centred); the satellite then advances at its mean sidereal rate.
 * This keeps the configuration seen by Galileo on 7 January 1610 within a few degrees while
 * costing a few multiplications per frame.
 */

export type SatelliteId = 'io' | 'europa' | 'ganymede' | 'callisto' | 'tethys' | 'dione' | 'rhea' | 'titan' | 'iapetus';

export interface SatelliteSpec {
  id: SatelliteId;
  name: string;
  planet: 'jupiter' | 'saturn';
  /** Mean distance from planet, km. */
  aKm: number;
  /** Mean sidereal motion, degrees per day (JPL satellite mean elements). */
  meanMotion: number;
  /** Horizons J2000 state: position (AU) and velocity (AU/day). */
  r0: readonly [number, number, number];
  v0: readonly [number, number, number];
  /** Year of discovery (knowledge gating) and discoverer. */
  discovered: number;
  discoverer: string;
  radiusKm: number;
}

export const SATELLITES: readonly SatelliteSpec[] = [
  {
    id: 'io',
    name: 'Io',
    planet: 'jupiter',
    aKm: 421_800,
    meanMotion: 203.4889538,
    r0: [0.00267192463675603, 0.0008640941902565209, 0.00007127946422889783],
    v0: [-0.003117075517599444, 0.00954942781832761, 0.0002919129194587252],
    discovered: 1610,
    discoverer: 'Galileo',
    radiusKm: 1822,
  },
  {
    id: 'europa',
    name: 'Europa',
    planet: 'jupiter',
    aKm: 671_100,
    meanMotion: 101.3747235,
    r0: [-0.003751687581655737, -0.002379800306952886, -0.000120015729870802],
    v0: [0.004309835907317153, -0.006750674023818595, -0.0001254944565302782],
    discovered: 1610,
    discoverer: 'Galileo',
    radiusKm: 1561,
  },
  {
    id: 'ganymede',
    name: 'Ganymede',
    planet: 'jupiter',
    aKm: 1_070_400,
    meanMotion: 50.3176081,
    r0: [-0.00549035284404152, -0.004581541308862496, -0.0002310042060535515],
    v0: [0.004035698118549232, -0.004815331512350181, -0.0001330359870228107],
    discovered: 1610,
    discoverer: 'Galileo',
    radiusKm: 2634,
  },
  {
    id: 'callisto',
    name: 'Callisto',
    planet: 'jupiter',
    aKm: 1_882_700,
    meanMotion: 21.5710715,
    r0: [0.002173023781100756, 0.01238159356837502, 0.0004328588775702288],
    v0: [-0.004662531633544506, 0.0008551926236558492, -0.00003374943156696009],
    discovered: 1610,
    discoverer: 'Galileo',
    radiusKm: 2410,
  },
  {
    id: 'tethys',
    name: 'Tethys',
    planet: 'saturn',
    aKm: 294_660,
    meanMotion: 190.6979332,
    r0: [0.001450781086998183, -0.001246281685398815, 0.0004718716752208925],
    v0: [0.004389820538512494, 0.004144494000568325, -0.002554838908586973],
    discovered: 1684,
    discoverer: 'Cassini',
    radiusKm: 531,
  },
  {
    id: 'dione',
    name: 'Dione',
    planet: 'saturn',
    aKm: 377_400,
    meanMotion: 131.5349316,
    r0: [0.001527753252968396, -0.001830343881580233, 0.0008097825440539256],
    v0: [0.004581005843661787, 0.002953186262146787, -0.0019923905295443],
    discovered: 1684,
    discoverer: 'Cassini',
    radiusKm: 561,
  },
  {
    id: 'rhea',
    name: 'Rhea',
    planet: 'saturn',
    aKm: 527_040,
    meanMotion: 79.6900478,
    r0: [-0.003507819832358609, -0.000009923158138335858, 0.0003652530595521135],
    v0: [0.0002493731782622324, -0.00433520000415072, 0.00226005141287519],
    discovered: 1672,
    discoverer: 'Cassini',
    radiusKm: 764,
  },
  {
    id: 'titan',
    name: 'Titan',
    planet: 'saturn',
    aKm: 1_221_870,
    meanMotion: 22.5769768,
    r0: [-0.006328986729681305, 0.005126196169184979, -0.002025162432185849],
    v0: [-0.002056847992773138, -0.002009305842158725, 0.00123894389911331],
    discovered: 1655,
    discoverer: 'Huygens',
    radiusKm: 2575,
  },
  {
    id: 'iapetus',
    name: 'Iapetus',
    planet: 'saturn',
    aKm: 3_560_840,
    meanMotion: 4.5379572,
    r0: [-0.01907629584177159, -0.01350238682593522, 0.007023876130131857],
    v0: [0.001109341729521197, -0.001460855008031275, 0.0001229895592266993],
    discovered: 1671,
    discoverer: 'Cassini',
    radiusKm: 735,
  },
];

export const SATELLITES_BY_ID: Record<SatelliteId, SatelliteSpec> = Object.fromEntries(
  SATELLITES.map((s) => [s.id, s]),
) as Record<SatelliteId, SatelliteSpec>;

interface Basis {
  e1: Vector3;
  e2: Vector3;
  aAu: number;
}

const bases = new Map<SatelliteId, Basis>();

function basisOf(spec: SatelliteSpec): Basis {
  let basis = bases.get(spec.id);
  if (!basis) {
    const r = new Vector3(...spec.r0);
    const v = new Vector3(...spec.v0);
    const normal = new Vector3().crossVectors(r, v).normalize();
    const e1 = r.clone().normalize();
    const e2 = new Vector3().crossVectors(normal, e1).normalize();
    basis = { e1, e2, aAu: spec.aKm / AU_KM };
    bases.set(spec.id, basis);
  }
  return basis;
}

/** Planet-centred satellite position (AU) in the J2000 ecliptic frame. */
export function satelliteJ2000(id: SatelliteId, jdTT: number, out = new Vector3()): Vector3 {
  const spec = SATELLITES_BY_ID[id];
  const b = basisOf(spec);
  const theta = (jdTT - J2000) * spec.meanMotion * DEG;
  const c = Math.cos(theta) * b.aAu;
  const s = Math.sin(theta) * b.aAu;
  return out.set(b.e1.x * c + b.e2.x * s, b.e1.y * c + b.e2.y * s, b.e1.z * c + b.e2.z * s);
}

/** Planet-centred satellite position (AU) in the ecliptic of date. */
export function satelliteOfDate(id: SatelliteId, jdTT: number, out = new Vector3()): Vector3 {
  satelliteJ2000(id, jdTT, out);
  return precessToDate(out, centuriesSinceJ2000(jdTT), out);
}

/** Unit normal of a satellite's orbit plane (J2000 ecliptic) — used to orient rings and planet axes. */
export function satelliteOrbitNormalJ2000(id: SatelliteId, out = new Vector3()): Vector3 {
  const spec = SATELLITES_BY_ID[id];
  return out.crossVectors(new Vector3(...spec.r0), new Vector3(...spec.v0)).normalize();
}
