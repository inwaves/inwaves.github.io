import { Vector3 } from 'three';
import { RAD } from '../astro/math';
import { SATURN_POLE_J2000 } from '../models/shared/keplerian';
import type { EraDefinition } from '../models/era';
import type { Mechanism } from '../models/mechanism';

/** What a small telescope would show of the selected body, according to the worldview's geometry. */
export interface TelescopeReadout {
  bodyId: string;
  name: string;
  kind: string;
  surface: string;
  /** illuminated fraction 0..1 */
  illuminated: number;
  /** position angle of the bright limb on the sky (degrees, 0 = north, 90 = east) */
  brightLimbAngle: number;
  /** satellites in units of the planet's radius: east (+) and north (+) offsets */
  satellites: { name: string; east: number; north: number; behind: boolean }[];
  rings?: 'rings' | 'ears';
  /** Saturn's ring opening: sine of the angle between the line of sight and the ring plane */
  ringOpening: number;
  /** position angle of the ring's major axis, degrees */
  ringAngle: number;
  /** sign of (line of sight · ring pole): which half of the ring passes in front of the planet */
  ringTiltSign: number;
  /** eras before Galileo: the view is a prediction, not an observation */
  telescopeExists: boolean;
  /** show lunar craters and sunspots (after Galileo) */
  surfaceDetail: boolean;
}

const PLANET_RADIUS_KM: Record<string, number> = { jupiter: 71492, saturn: 60268 };
const AU_KM = 149597870.7;
const ER_KM = 6378.137;

/** Sky-plane basis at a direction: east toward increasing longitude, north toward the ecliptic pole. */
function skyBasis(direction: Vector3): { east: Vector3; north: Vector3 } {
  const east = new Vector3(0, 0, 1).cross(direction);
  if (east.lengthSq() < 1e-12) east.set(0, 1, 0);
  east.normalize();
  const north = new Vector3().crossVectors(direction, east).normalize();
  return { east, north };
}

/** Model units per kilometre, inferred from the model's own description of its units. */
function unitsPerKm(unitLabel: string): number {
  if (/Earth radii/i.test(unitLabel)) return 1 / ER_KM;
  return 1 / AU_KM;
}

export function telescopeReadout(m: Mechanism, era: EraDefinition, bodyId: string): TelescopeReadout | null {
  const model = m.model;
  const def = model.bodies.find((b) => b.id === bodyId);
  if (!def || def.id === model.earthBody || def.kind === 'fire' || def.kind === 'counter-earth') return null;
  const observer = m.node(model.observerNode).worldPos;
  const body = m.node(def.node).worldPos;
  const d = new Vector3().copy(body).sub(observer).normalize();
  const { east, north } = skyBasis(d);

  let illuminated = 1;
  let brightLimbAngle = 90;
  if (model.sunNode && def.kind !== 'sun') {
    const sun = m.node(model.sunNode).worldPos;
    const toSun = new Vector3().copy(sun).sub(body);
    const toObserver = new Vector3().copy(observer).sub(body);
    illuminated = (1 + Math.cos(toSun.angleTo(toObserver))) / 2;
    brightLimbAngle = Math.atan2(toSun.dot(east), toSun.dot(north)) * RAD;
  }

  const satellites: TelescopeReadout['satellites'] = [];
  const radiusKm = PLANET_RADIUS_KM[def.id];
  if (radiusKm) {
    const radius = radiusKm * unitsPerKm(model.unitLabel);
    for (const sat of model.bodies.filter((b) => b.kind === 'satellite' && b.node.startsWith(`${b.id}.`))) {
      const planetFrame = m.node(sat.node).parent?.parent;
      if (!planetFrame || !planetFrame.def.id.startsWith(def.id)) continue;
      const v = new Vector3().copy(m.node(sat.node).worldPos).sub(body);
      satellites.push({ name: sat.name, east: v.dot(east) / radius, north: v.dot(north) / radius, behind: v.dot(d) > 0 });
    }
  }

  let ringOpening = 0;
  let ringAngle = 0;
  let ringTiltSign = 1;
  if (def.appearance.rings) {
    const along = SATURN_POLE_J2000.dot(d);
    ringOpening = Math.abs(along);
    ringTiltSign = along >= 0 ? 1 : -1;
    // The ring's major axis is perpendicular to the projected pole.
    ringAngle = Math.atan2(SATURN_POLE_J2000.dot(east), SATURN_POLE_J2000.dot(north)) * RAD + 90;
  }

  return {
    bodyId: def.id,
    name: def.name,
    kind: def.kind,
    surface: def.appearance.surface,
    illuminated,
    brightLimbAngle,
    satellites,
    rings: def.appearance.rings,
    ringOpening,
    ringAngle,
    ringTiltSign,
    telescopeExists: era.knowledgeYear >= 1609,
    surfaceDetail: era.knowledgeYear >= 1610,
  };
}
