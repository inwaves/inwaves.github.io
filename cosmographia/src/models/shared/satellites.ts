import { Quaternion, Vector3 } from 'three';
import { AU_KM } from '../../astro/math';
import { centuriesSinceJ2000 } from '../../astro/time';
import { precessToDate } from '../../astro/frames';
import { SATELLITES, satelliteOfDate, satelliteOrbitNormalJ2000, type SatelliteSpec } from '../../astro/ephemeris/satellites';
import type { BodyDef, NodeDef } from '../types';
import { BODY_COLORS } from './appearance';

const ROLES: Record<string, string> = {
  io: 'Innermost of the four “Medicean Stars” Galileo found in January 1610, circling Jupiter in under two days.',
  europa: 'Second of Galileo’s moons of Jupiter. A world visibly going around something other than the Earth.',
  ganymede: 'The largest of Galileo’s moons, taking a week to circle Jupiter.',
  callisto: 'Outermost of Galileo’s moons, a sixteen-day orbit. Jupiter holds its moons as the Earth holds its one.',
  titan: 'Discovered by Christiaan Huygens in 1655, the first moon of Saturn.',
  iapetus: 'Found by Giovanni Domenico Cassini in 1671; it vanished and reappeared on opposite sides of Saturn.',
  rhea: 'Found by Cassini in 1672.',
  tethys: 'Found by Cassini in 1684.',
  dione: 'Found by Cassini in 1684.',
};

const DISPLAY_RADIUS: Record<string, number> = {
  io: 1.5,
  europa: 2.0,
  ganymede: 2.6,
  callisto: 3.4,
  tethys: 2.0,
  dione: 2.4,
  rhea: 2.8,
  titan: 3.5,
  iapetus: 4.6,
};

/** The satellites of a planet known by `knowledgeYear`. */
export function knownSatellites(planet: 'jupiter' | 'saturn', knowledgeYear: number): SatelliteSpec[] {
  return SATELLITES.filter((s) => s.planet === planet && s.discovered <= knowledgeYear);
}

/**
 * Nodes and bodies for a planet's known satellites. Each orbit is enlarged individually so the
 * system is legible next to an exaggerated planet; directions from the planet are preserved.
 * @param planetNode node at the planet's centre whose frame is aligned with the ecliptic
 * @param parentScale display units per model unit at `planetNode`
 * @param unitsPerAu model units per astronomical unit (1 for AU models, 23455 for Earth radii)
 */
export function buildSatellites(
  planet: 'jupiter' | 'saturn',
  planetNode: string,
  knowledgeYear: number,
  parentScale: number,
  unitsPerAu: number,
  epochJd: number,
  sizeScale = 1,
): { nodes: NodeDef[]; bodies: BodyDef[] } {
  const nodes: NodeDef[] = [];
  const bodies: BodyDef[] = [];
  const normal = new Vector3();
  for (const spec of knownSatellites(planet, knowledgeYear)) {
    const a = (spec.aKm / AU_KM) * unitsPerAu;
    satelliteOrbitNormalJ2000(spec.id, normal);
    precessToDate(normal, centuriesSinceJ2000(epochJd), normal);
    const planeRotation = new Quaternion().setFromUnitVectors(new Vector3(0, 0, 1), normal.clone().normalize());
    const group = `${spec.id}.system`;
    nodes.push({
      id: group,
      parent: planetNode,
      displayScale: (DISPLAY_RADIUS[spec.id] * sizeScale) / (a * parentScale),
    });
    nodes.push({
      id: `${spec.id}.plane`,
      parent: group,
      update: (_t, _pos, rot) => {
        rot.copy(planeRotation);
      },
      constructs: [{ kind: 'circle', radius: a, style: 'orbit-faint', layer: 'orbits', focusBody: spec.id }],
    });
    nodes.push({
      id: `${spec.id}.body`,
      parent: group,
      update: (t, pos) => {
        satelliteOfDate(spec.id, t.jd, pos).multiplyScalar(unitsPerAu);
      },
    });
    bodies.push({
      id: spec.id,
      name: spec.name,
      kind: 'satellite',
      node: `${spec.id}.body`,
      appearance: { color: BODY_COLORS.satellite, radius: 0.09 * sizeScale, surface: 'satellite', phases: true },
      inSky: false,
      trailDays: Math.min(20, 360 / spec.meanMotion),
      role: ROLES[spec.id] ?? `${spec.name}, discovered by ${spec.discoverer} in ${spec.discovered}.`,
    });
  }
  return { nodes, bodies };
}
