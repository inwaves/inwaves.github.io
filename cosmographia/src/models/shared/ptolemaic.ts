import { DEG } from '../../astro/math';
import type { BodyDef, LinkDef, NodeDef, TimeContext } from '../types';
import { memoByTime } from '../mechanism';
import { onCircle, tiltAboutNodeLine } from './geometry';
import { moonAppearance, PLANET_NAMES, planetAppearance, sunAppearance } from './appearance';
import type { ClassicalPlanet } from './phases';

/**
 * Builders for geocentric models in the tradition of Apollonius, Hipparchus and Ptolemy.
 * Geometry is in "parts" (deferent radius 60) scaled to Earth radii by `erPerPart`.
 */

export type PtolemaicVariant = 'concentric' | 'equant' | 'shatir';

export interface PtolemaicPlanetParams {
  id: ClassicalPlanet;
  variant: PtolemaicVariant;
  /** Eccentricity of the deferent centre, parts (equant at 2e; Mercury's crank uses e for both). */
  e: number;
  /** Epicycle radius, parts. */
  r: number;
  /** Longitude of the apogee of date, degrees. */
  apogee: (t: TimeContext) => number;
  /** Mean longitude of the epicycle centre, degrees. */
  meanLongitude: (t: TimeContext) => number;
  /** Mean anomaly on the epicycle from its mean apogee, degrees. */
  anomaly: (t: TimeContext) => number;
  /** Latitude geometry (modern inclination and node, of date). */
  inclination: number;
  node: (t: TimeContext) => number;
  erPerPart: number;
  displayScale: number;
  bodyRadius: number;
  role: string;
}

/** Epicycle centre distance along the ray from `eq` at longitude `lambda`, for a circle of radius R about `c`. */
export function rayCircleDistance(eqX: number, eqY: number, cX: number, cY: number, R: number, lambdaDeg: number): number {
  const ux = Math.cos(lambdaDeg * DEG);
  const uy = Math.sin(lambdaDeg * DEG);
  const dx = eqX - cX;
  const dy = eqY - cY;
  const b = dx * ux + dy * uy;
  const c = dx * dx + dy * dy - R * R;
  return -b + Math.sqrt(b * b - c);
}

interface Point2 {
  x: number;
  y: number;
}

export interface PtolemaicState {
  apogee: number;
  lambda: number;
  alpha: number;
  /** deferent centre (parts) */
  center: Point2;
  /** equant point (parts) */
  equant: Point2;
  /** epicycle centre (parts) */
  epicycle: Point2;
  /** Mercury's crank: centre of the small circle carrying the deferent centre */
  crank?: Point2;
  /** Ibn al-Shatir: centres of the two epicyclets */
  epicyclet1?: Point2;
  epicyclet2?: Point2;
  planet: Point2;
}

/** Pure geometry of a Ptolemaic planet in the plane of its deferent (parts). */
export function ptolemaicPlanetState(p: PtolemaicPlanetParams, t: TimeContext): PtolemaicState {
  const A = p.apogee(t);
  const lambda = p.meanLongitude(t);
  const alpha = p.anomaly(t);
  const ca = Math.cos(A * DEG);
  const sa = Math.sin(A * DEG);
  const R = 60;
  let center: Point2 = { x: 0, y: 0 };
  let equant: Point2 = { x: 0, y: 0 };
  let epicycle: Point2;
  let crank: Point2 | undefined;
  let epicyclet1: Point2 | undefined;
  let epicyclet2: Point2 | undefined;

  if (p.variant === 'concentric') {
    epicycle = { x: R * Math.cos(lambda * DEG), y: R * Math.sin(lambda * DEG) };
  } else if (p.variant === 'shatir') {
    // Concentric deferent; the first epicyclet (3e/2) stays parallel to the apsidal line and the
    // second (e/2) turns at twice the mean motion — the equant's effect from uniform circles only.
    const d = { x: R * Math.cos(lambda * DEG), y: R * Math.sin(lambda * DEG) };
    const M = lambda - A;
    epicyclet1 = { x: d.x, y: d.y };
    epicyclet2 = { x: d.x + 1.5 * p.e * ca, y: d.y + 1.5 * p.e * sa };
    const back = (A + 2 * M + 180) * DEG;
    epicycle = { x: epicyclet2.x + 0.5 * p.e * Math.cos(back), y: epicyclet2.y + 0.5 * p.e * Math.sin(back) };
  } else if (p.id === 'mercury') {
    equant = { x: p.e * ca, y: p.e * sa };
    crank = { x: 2 * p.e * ca, y: 2 * p.e * sa };
    const phi = (2 * A - lambda) * DEG;
    center = { x: crank.x + p.e * Math.cos(phi), y: crank.y + p.e * Math.sin(phi) };
    const rho = rayCircleDistance(equant.x, equant.y, center.x, center.y, R, lambda);
    epicycle = { x: equant.x + rho * Math.cos(lambda * DEG), y: equant.y + rho * Math.sin(lambda * DEG) };
  } else {
    center = { x: p.e * ca, y: p.e * sa };
    equant = { x: 2 * p.e * ca, y: 2 * p.e * sa };
    const rho = rayCircleDistance(equant.x, equant.y, center.x, center.y, R, lambda);
    epicycle = { x: equant.x + rho * Math.cos(lambda * DEG), y: equant.y + rho * Math.sin(lambda * DEG) };
  }
  // The epicycle's mean apogee lies on the line from the equant (from the Earth, for uniform variants).
  const apo = p.variant === 'equant' ? Math.atan2(epicycle.y - equant.y, epicycle.x - equant.x) / DEG : lambda;
  const th = (apo + alpha) * DEG;
  const planet = { x: epicycle.x + p.r * Math.cos(th), y: epicycle.y + p.r * Math.sin(th) };
  return { apogee: A, lambda, alpha, center, equant, epicycle, crank, epicyclet1, epicyclet2, planet };
}

/**
 * Nodes for one Ptolemaic planet. The deferent plane is tilted by the planet's inclination for
 * the superior planets; for Venus and Mercury the epicycle carries the tilt, mirroring how the
 * epicycle stands for the planet's own orbit around the Sun.
 */
export function buildPtolemaicPlanet(p: PtolemaicPlanetParams): { nodes: NodeDef[]; body: BodyDef; links: LinkDef[] } {
  const id = p.id;
  const k = p.erPerPart;
  const inferior = id === 'mercury' || id === 'venus';
  const state = memoByTime((t) => ptolemaicPlanetState(p, t));
  const g = `${id}.group`;
  const focusBody = id;
  const nodes: NodeDef[] = [
    {
      id: g,
      parent: 'earth',
      displayScale: p.displayScale,
      update: (t, _pos, rot) => {
        if (!inferior) tiltAboutNodeLine(rot, p.node(t), p.inclination);
      },
    },
  ];
  const pointNode = (nodeId: string, pick: (s: PtolemaicState) => Point2 | undefined, constructs: NodeDef['constructs']) => {
    nodes.push({
      id: nodeId,
      parent: g,
      update: (t, pos) => {
        const pt = pick(state(t));
        if (pt) pos.set(pt.x * k, pt.y * k, 0);
      },
      constructs,
    });
  };

  const deferentCircle = { kind: 'circle' as const, radius: 60 * k, style: 'deferent' as const, layer: 'mechanism' as const, label: 'deferent' };
  if (p.variant === 'concentric' || p.variant === 'shatir') {
    nodes.push({ id: `${id}.deferent`, parent: g, constructs: [deferentCircle] });
  } else {
    pointNode(`${id}.center`, (s) => s.center, [
      deferentCircle,
      { kind: 'marker', shape: 'cross', size: 2 * k, style: 'guide', layer: 'mechanism', focusBody },
    ]);
    pointNode(`${id}.equant`, (s) => s.equant, [
      { kind: 'marker', shape: 'ring', size: 2.2 * k, style: 'accent', layer: 'mechanism', label: 'equant', focusBody },
    ]);
    if (id === 'mercury') {
      pointNode(`${id}.crank`, (s) => s.crank, [{ kind: 'circle', radius: p.e * k, style: 'epicyclet', layer: 'mechanism', focusBody }]);
    }
  }
  if (p.variant === 'shatir') {
    pointNode(`${id}.epicyclet1`, (s) => s.epicyclet1, [
      { kind: 'circle', radius: 1.5 * p.e * k, style: 'epicyclet', layer: 'mechanism', focusBody },
    ]);
    pointNode(`${id}.epicyclet2`, (s) => s.epicyclet2, [
      { kind: 'circle', radius: 0.5 * p.e * k, style: 'epicyclet', layer: 'mechanism', focusBody },
    ]);
  }
  pointNode(`${id}.epicycle`, (s) => s.epicycle, undefined);
  nodes.push({
    id: `${id}.epicycle.plane`,
    parent: `${id}.epicycle`,
    update: (t, _pos, rot) => {
      // Inferior: the epicycle is the tilted one. Superior: undo the deferent's tilt so the
      // epicycle stays parallel to the ecliptic.
      tiltAboutNodeLine(rot, p.node(t), inferior ? p.inclination : -p.inclination);
    },
    constructs: [{ kind: 'circle', radius: p.r * k, style: 'epicycle', layer: 'mechanism', label: 'epicycle' }],
  });
  nodes.push({
    id: `${id}.planet`,
    parent: `${id}.epicycle.plane`,
    update: (t, pos) => {
      const s = state(t);
      onCircle(pos, p.r * k, Math.atan2(s.planet.y - s.epicycle.y, s.planet.x - s.epicycle.x) / DEG);
    },
  });
  const links: LinkDef[] = [{ from: `${id}.epicycle`, to: `${id}.planet`, layer: 'mechanism', style: 'epicycle' }];
  if (p.variant === 'equant') {
    links.push({ from: `${id}.equant`, to: `${id}.epicycle`, layer: 'mechanism', style: 'guide', dashed: true, focusBody });
  }
  const body: BodyDef = {
    id,
    name: PLANET_NAMES[id],
    kind: 'planet',
    node: `${id}.planet`,
    appearance: planetAppearance(id, p.bodyRadius),
    truth: id,
    trailDays: { mercury: 116, venus: 584, mars: 780, jupiter: 399, saturn: 378 }[id],
    role: p.role,
  };
  return { nodes, body, links };
}

export interface EccentricSunParams {
  /** eccentricity, parts of R = 60 */
  e: number;
  apogee: (t: TimeContext) => number;
  meanLongitude: (t: TimeContext) => number;
  erPerPart: number;
  displayScale: number;
  bodyRadius: number;
  role: string;
}

/** Hipparchus's solar theory: uniform motion on a circle whose centre is displaced toward the apogee. */
export function buildEccentricSun(p: EccentricSunParams): { nodes: NodeDef[]; body: BodyDef } {
  const k = p.erPerPart;
  const nodes: NodeDef[] = [
    { id: 'sun.group', parent: 'earth', displayScale: p.displayScale },
    {
      id: 'sun.center',
      parent: 'sun.group',
      update: (t, pos) => {
        onCircle(pos, p.e * k, p.apogee(t));
      },
      constructs: [
        { kind: 'circle', radius: 60 * k, style: 'deferent', layer: 'mechanism', label: 'eccentric' },
        { kind: 'marker', shape: 'cross', size: 2 * k, style: 'guide', layer: 'mechanism', focusBody: 'sun' },
      ],
    },
    {
      id: 'sun.body',
      parent: 'sun.center',
      update: (t, pos) => {
        onCircle(pos, 60 * k, p.meanLongitude(t));
      },
    },
  ];
  const body: BodyDef = {
    id: 'sun',
    name: 'Sun',
    kind: 'sun',
    node: 'sun.body',
    appearance: sunAppearance(p.bodyRadius),
    truth: 'sun',
    trailDays: 365,
    role: p.role,
  };
  return { nodes, body };
}

export interface PtolemaicMoonArgs {
  /** mean longitude λ̄ */
  lambda: number;
  /** mean elongation from the mean Sun η */
  eta: number;
  /** mean anomaly from the epicycle's apogee α */
  alpha: number;
  /** argument of latitude counted from the northern limit ω */
  omega: number;
  sunMean: number;
}

export interface PtolemaicMoonParams {
  variant: 'simple' | 'crank';
  args: (t: TimeContext) => PtolemaicMoonArgs;
  erPerPart: number;
  displayScale: number;
  bodyRadius: number;
  role: string;
}

export interface PtolemaicMoonState {
  deferentCenter: Point2;
  prosneusis: Point2;
  epicycle: Point2;
  /** Moon in the plane of the lunar orbit (parts) */
  moon: Point2;
  /** longitude of the ascending node of the lunar orbit */
  node: number;
}

export const LUNAR_INCLINATION = 5;

/** Ptolemy's lunar models (Almagest IV–V), geometry in parts within the plane of the lunar orbit. */
export function ptolemaicMoonState(p: PtolemaicMoonParams, t: TimeContext): PtolemaicMoonState {
  const a = p.args(t);
  const r = 5.25;
  let deferentCenter: Point2 = { x: 0, y: 0 };
  let prosneusis: Point2 = { x: 0, y: 0 };
  let epicycle: Point2;
  let apogeeDirection: number;
  if (p.variant === 'simple') {
    epicycle = { x: 60 * Math.cos(a.lambda * DEG), y: 60 * Math.sin(a.lambda * DEG) };
    apogeeDirection = a.lambda;
  } else {
    const e = 10 + 19 / 60;
    const Rd = 49 + 41 / 60;
    const dc = a.sunMean - a.eta;
    deferentCenter = { x: e * Math.cos(dc * DEG), y: e * Math.sin(dc * DEG) };
    prosneusis = { x: -deferentCenter.x, y: -deferentCenter.y };
    const twoEta = 2 * a.eta * DEG;
    const rho = e * Math.cos(twoEta) + Math.sqrt(Rd * Rd - e * e * Math.sin(twoEta) * Math.sin(twoEta));
    epicycle = { x: rho * Math.cos(a.lambda * DEG), y: rho * Math.sin(a.lambda * DEG) };
    apogeeDirection = Math.atan2(epicycle.y - prosneusis.y, epicycle.x - prosneusis.x) / DEG;
  }
  // At the epicycle's apogee the Moon moves westward, so anomaly is counted clockwise.
  const th = (apogeeDirection - a.alpha) * DEG;
  const moon = { x: epicycle.x + r * Math.cos(th), y: epicycle.y + r * Math.sin(th) };
  // Latitude 5°·cos(ω) with ω from the northern limit puts the ascending node at λ̄ − ω − 90°.
  const node = a.lambda - a.omega - 90;
  return { deferentCenter, prosneusis, epicycle, moon, node };
}

/** The lunar mechanism, inclined 5° to the ecliptic about the regressing line of nodes. */
export function buildPtolemaicMoon(p: PtolemaicMoonParams): { nodes: NodeDef[]; body: BodyDef; links: LinkDef[] } {
  const k = p.erPerPart;
  const state = memoByTime((t) => ptolemaicMoonState(p, t));
  const nodes: NodeDef[] = [
    {
      id: 'moon.group',
      parent: 'earth',
      displayScale: p.displayScale,
      update: (t, _pos, rot) => {
        tiltAboutNodeLine(rot, state(t).node, LUNAR_INCLINATION);
      },
    },
  ];
  const pointNode = (nodeId: string, pick: (s: PtolemaicMoonState) => Point2, constructs: NodeDef['constructs']) => {
    nodes.push({
      id: nodeId,
      parent: 'moon.group',
      update: (t, pos) => {
        const pt = pick(state(t));
        pos.set(pt.x * k, pt.y * k, 0);
      },
      constructs,
    });
  };
  if (p.variant === 'crank') {
    pointNode((`moon.deferentCenter`), (s) => s.deferentCenter, [
      { kind: 'circle', radius: (49 + 41 / 60) * k, style: 'deferent', layer: 'mechanism', label: 'lunar deferent' },
    ]);
    nodes.push({
      id: 'moon.crank',
      parent: 'moon.group',
      constructs: [{ kind: 'circle', radius: (10 + 19 / 60) * k, style: 'guide', layer: 'mechanism', focusBody: 'moon', dashed: true }],
    });
    pointNode('moon.prosneusis', (s) => s.prosneusis, [
      { kind: 'marker', shape: 'ring', size: 1.5 * k, style: 'accent', layer: 'mechanism', focusBody: 'moon', label: 'prosneusis point' },
    ]);
  } else {
    nodes.push({
      id: 'moon.deferent',
      parent: 'moon.group',
      constructs: [{ kind: 'circle', radius: 60 * k, style: 'deferent', layer: 'mechanism', label: 'lunar deferent' }],
    });
  }
  pointNode('moon.epicycle', (s) => s.epicycle, [{ kind: 'circle', radius: 5.25 * k, style: 'epicycle', layer: 'mechanism' }]);
  pointNode('moon.body', (s) => s.moon, undefined);
  const links: LinkDef[] = [{ from: 'moon.epicycle', to: 'moon.body', layer: 'mechanism', style: 'epicycle' }];
  if (p.variant === 'crank') {
    links.push({ from: 'moon.prosneusis', to: 'moon.epicycle', layer: 'mechanism', style: 'guide', dashed: true, focusBody: 'moon' });
  }
  const body: BodyDef = {
    id: 'moon',
    name: 'Moon',
    kind: 'moon',
    node: 'moon.body',
    appearance: moonAppearance(p.bodyRadius),
    truth: 'moon',
    trailDays: 27.3,
    role: p.role,
  };
  return { nodes, body, links };
}
