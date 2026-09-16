import { Quaternion, Vector3 } from 'three';
import { DEG } from '../../astro/math';
import { centuriesSinceJ2000, J2000 } from '../../astro/time';
import { precessionInLongitudeDeg, precessToDate } from '../../astro/frames';
import { meanElementsJ2000, type PlanetId } from '../../astro/ephemeris/planets';
import { conicPosition, solveKepler, type CometElements } from '../../astro/ephemeris/kepler';
import { moonGeocentricOfDate } from '../../astro/ephemeris/moon';
import type { BodyDef, LinkDef, NodeDef, TimeContext } from '../types';
import { memoByTime } from '../mechanism';
import { tiltAboutNodeLine } from './geometry';
import { BODY_COLORS, earthAppearance, moonAppearance, PLANET_NAMES, planetAppearance } from './appearance';
import { moonMean } from './phases';

/**
 * Keplerian orbits: ellipses with the Sun at one focus, swept at a rate that keeps equal areas in
 * equal times, with periods by the third law. Elements are JPL's, so this is also the modern sky.
 */

export interface KeplerState {
  a: number;
  e: number;
  /** rotation from the orbital plane (x toward perihelion) to the ecliptic of date */
  rotation: Quaternion;
  /** position in the orbital plane */
  x: number;
  y: number;
}

const zAxis = new Vector3(0, 0, 1);
const xAxis = new Vector3(1, 0, 0);

export function keplerState(id: PlanetId, t: TimeContext): KeplerState {
  const m = meanElementsJ2000(id, t.T);
  const p = precessionInLongitudeDeg(t.T);
  const node = m.node + p;
  const argPeri = m.varpi - m.node;
  const rotation = new Quaternion()
    .setFromAxisAngle(zAxis, node * DEG)
    .multiply(new Quaternion().setFromAxisAngle(xAxis, m.I * DEG))
    .multiply(new Quaternion().setFromAxisAngle(zAxis, argPeri * DEG));
  const E = solveKepler(m.M * DEG, m.e);
  return { a: m.a, e: m.e, rotation, x: m.a * (Math.cos(E) - m.e), y: m.a * Math.sqrt(1 - m.e * m.e) * Math.sin(E) };
}

export interface KeplerPlanetOptions {
  id: PlanetId;
  parent: string;
  unit: number;
  epochJd: number;
  bodyRadius: number;
  role: string;
  showFoci: boolean;
  saturnRings?: 'rings' | 'ears';
  gravityLink?: boolean;
}

/** One planet on its ellipse. The ellipse's shape is taken at the era's epoch; orientation follows the date. */
export function buildKeplerPlanet(o: KeplerPlanetOptions): { nodes: NodeDef[]; body: BodyDef | null; links: LinkDef[] } {
  const id = o.id;
  const key = id === 'emb' ? 'earth' : id;
  const state = memoByTime((t) => keplerState(id, t));
  const epochElements = meanElementsJ2000(id, centuriesSinceJ2000(o.epochJd));
  const a = epochElements.a * o.unit;
  const e = epochElements.e;
  const nodes: NodeDef[] = [
    {
      id: `${key}.orbit`,
      parent: o.parent,
      update: (t, _pos, rot) => {
        rot.copy(state(t).rotation);
      },
      constructs: [{ kind: 'ellipse', a, e, style: 'orbit', layer: 'orbits' }],
    },
    {
      id: `${key}.planet`,
      parent: `${key}.orbit`,
      update: (t, pos) => {
        const s = state(t);
        pos.set(s.x * o.unit, s.y * o.unit, 0);
      },
    },
    // Ecliptic-aligned frame at the planet, for satellites (and the Earth's Moon).
    {
      id: `${key}.frame`,
      parent: `${key}.planet`,
      update: (t, _pos, rot) => {
        rot.copy(state(t).rotation).invert();
      },
    },
  ];
  if (o.showFoci) {
    nodes.push(
      {
        id: `${key}.emptyFocus`,
        parent: `${key}.orbit`,
        update: (_t, pos) => {
          pos.set(-2 * a * e, 0, 0);
        },
        constructs: [{ kind: 'marker', shape: 'ring', size: 0.09 * o.unit, style: 'accent', layer: 'mechanism', focusBody: key, label: 'empty focus' }],
      },
      {
        id: `${key}.perihelion`,
        parent: `${key}.orbit`,
        update: (_t, pos) => {
          pos.set(a * (1 - e), 0, 0);
        },
        constructs: [{ kind: 'marker', shape: 'cross', size: 0.05 * o.unit, style: 'guide', layer: 'mechanism', focusBody: key, label: 'perihelion' }],
      },
      {
        id: `${key}.aphelion`,
        parent: `${key}.orbit`,
        update: (_t, pos) => {
          pos.set(-a * (1 + e), 0, 0);
        },
        constructs: [{ kind: 'marker', shape: 'cross', size: 0.05 * o.unit, style: 'guide', layer: 'mechanism', focusBody: key, label: 'aphelion' }],
      },
    );
  }
  const links: LinkDef[] = [];
  if (o.gravityLink) links.push({ from: `${key}.planet`, to: o.parent, layer: 'mechanism', style: 'guide', dashed: true, focusBody: key });
  if (id === 'emb') return { nodes, body: null, links };
  const pid = id as 'mercury' | 'venus' | 'mars' | 'jupiter' | 'saturn';
  return {
    nodes,
    links,
    body: {
      id: pid,
      name: PLANET_NAMES[pid],
      kind: 'planet',
      node: `${pid}.planet`,
      appearance: planetAppearance(pid, o.bodyRadius, pid === 'saturn' ? o.saturnRings : undefined),
      truth: pid,
      trailDays: { mercury: 116, venus: 584, mars: 780, jupiter: 399, saturn: 378 }[pid],
      role: o.role,
    },
  };
}

/** The Earth on its ellipse, with the Moon from the modern lunar theory. */
export function buildKeplerEarthAndMoon(o: {
  parent: string;
  unit: number;
  epochJd: number;
  earthRadius: number;
  moonRadius: number;
  moonDisplayScale: number;
  earthRole: string;
  moonRole: string;
  showFoci: boolean;
  gravityLink?: boolean;
}): { nodes: NodeDef[]; bodies: BodyDef[]; links: LinkDef[] } {
  const built = buildKeplerPlanet({
    id: 'emb',
    parent: o.parent,
    unit: o.unit,
    epochJd: o.epochJd,
    bodyRadius: o.earthRadius,
    role: o.earthRole,
    showFoci: o.showFoci,
    gravityLink: o.gravityLink,
  });
  const nodes = built.nodes;
  // The observer's node: the Earth's centre with an ecliptic-aligned frame.
  nodes.push({ id: 'earth', parent: 'earth.frame' });
  const lunarNode = memoByTime((t) => {
    const m = moonMean(t.jd);
    return m.L - m.F;
  });
  nodes.push(
    { id: 'moon.group', parent: 'earth', displayScale: o.moonDisplayScale },
    {
      id: 'moon.orbit',
      parent: 'moon.group',
      update: (t, _pos, rot) => {
        tiltAboutNodeLine(rot, lunarNode(t), 5.15);
      },
      constructs: [{ kind: 'circle', radius: (384400 / 149597870.7) * o.unit, style: 'orbit-faint', layer: 'orbits' }],
    },
    {
      id: 'moon.body',
      parent: 'moon.group',
      update: (t, pos) => {
        moonGeocentricOfDate(t.jd, pos).multiplyScalar(o.unit);
      },
    },
  );
  const bodies: BodyDef[] = [
    { id: 'earth', name: 'Earth', kind: 'earth', node: 'earth', appearance: earthAppearance(o.earthRadius), inSky: false, role: o.earthRole },
    {
      id: 'moon',
      name: 'Moon',
      kind: 'moon',
      node: 'moon.body',
      appearance: moonAppearance(o.moonRadius),
      truth: 'moon',
      trailDays: 27.3,
      role: o.moonRole,
    },
  ];
  return { nodes, bodies, links: built.links };
}

/** A comet on its conic, heliocentric (elements referred to the J2000 ecliptic, precessed to date). */
export function buildComet(o: {
  id: string;
  name: string;
  parent: string;
  unit: number;
  elements: CometElements;
  visibleFrom: number;
  visibleTo: number;
  role: string;
  bodyRadius: number;
}): { nodes: NodeDef[]; body: BodyDef } {
  return {
    nodes: [
      {
        id: `${o.id}.body`,
        parent: o.parent,
        update: (t, pos) => {
          conicPosition(o.elements, t.jd, pos);
          precessToDate(pos, t.T, pos).multiplyScalar(o.unit);
        },
      },
    ],
    body: {
      id: o.id,
      name: o.name,
      kind: 'comet',
      node: `${o.id}.body`,
      appearance: { color: BODY_COLORS.comet, radius: o.bodyRadius, surface: 'plain', glow: '#bfe6ff' },
      visibleFrom: o.visibleFrom,
      visibleTo: o.visibleTo,
      trailDays: 90,
      role: o.role,
    },
  };
}

/** Saturn's north pole (IAU, J2000: RA 40.589°, Dec 83.537°) as a J2000 ecliptic unit vector. */
export const SATURN_POLE_J2000 = (() => {
  const ra = 40.589 * DEG;
  const dec = 83.537 * DEG;
  const e = 23.4392911 * DEG;
  const x = Math.cos(dec) * Math.cos(ra);
  const y = Math.cos(dec) * Math.sin(ra);
  const z = Math.sin(dec);
  return new Vector3(x, y * Math.cos(e) + z * Math.sin(e), -y * Math.sin(e) + z * Math.cos(e));
})();

export { J2000 };
