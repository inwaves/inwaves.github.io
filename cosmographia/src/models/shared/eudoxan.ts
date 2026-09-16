import { Quaternion, Vector3 } from 'three';
import { DEG, norm180 } from '../../astro/math';
import type { BodyDef, ConstructDef, NodeDef, TimeContext } from '../types';
import { memoByTime } from '../mechanism';
import { moonAppearance, PLANET_NAMES, planetAppearance, sunAppearance } from './appearance';
import { MEAN_MOTION, moonMean, planetMean, sunMean, type ClassicalPlanet } from './phases';

/**
 * Homocentric spheres (Eudoxus, Callippus, Aristotle). Every sphere shares the Earth's centre;
 * each turns uniformly about an axis fixed in the sphere that encloses it. A pair of spheres
 * turning in opposite senses about slightly inclined axes carries a point along a figure-eight,
 * the hippopede; added to steady zodiacal motion it gives stations and retrograde arcs.
 */

const Y = new Vector3(0, 1, 0);
const Z = new Vector3(0, 0, 1);

/** Eudoxus's figures as reported by Simplicius, with Schiaparelli's hippopede inclinations. */
export const EUDOXUS = {
  saturn: { zodiacalYears: 30, synodicDays: 13 * 30, inclination: 6 },
  jupiter: { zodiacalYears: 12, synodicDays: 13 * 30, inclination: 13 },
  mars: { zodiacalYears: 2, synodicDays: 8 * 30 + 20, inclination: 34 },
  venus: { zodiacalYears: 1, synodicDays: 19 * 30, inclination: 46 },
  mercury: { zodiacalYears: 1, synodicDays: 110, inclination: 23 },
} as const satisfies Record<ClassicalPlanet, { zodiacalYears: number; synodicDays: number; inclination: number }>;

/**
 * The instant nearest `jd` at which a planet is in the middle of its retrograde arc in the real
 * sky: opposition for superior planets, inferior conjunction for Mercury and Venus.
 */
export function retrogradeCentre(id: ClassicalPlanet, jd: number): number {
  const earth = planetMean('emb', jd).L;
  const planet = planetMean(id, jd).L;
  const rate = MEAN_MOTION[id] - MEAN_MOTION.sun;
  return jd - norm180(planet - earth) / rate;
}

export interface HippopedeParams {
  prefix: string;
  parent: string;
  radius: number;
  /** inclination of the fourth sphere's axis to the third's, degrees */
  inclination: number;
  /** rotation angle of the pair, degrees */
  phase: (t: TimeContext) => number;
  focusBody: string;
  draw: boolean;
}

/** The third and fourth spheres: a hippopede generator. Returns the node carrying the point. */
export function buildHippopede(p: HippopedeParams): { nodes: NodeDef[]; tip: string } {
  const i = p.inclination * DEG;
  const axis4 = new Vector3(0, Math.cos(i), Math.sin(i));
  const s3 = `${p.prefix}.sphere3`;
  const s4 = `${p.prefix}.sphere4`;
  const sphere = (radius: number, direction: [number, number, number], label?: string): ConstructDef[] =>
    p.draw
      ? [
          { kind: 'sphere', radius, style: 'crystal', layer: 'spheres', focusBody: p.focusBody, label },
          { kind: 'axis', length: radius * 1.12, direction, style: 'axis', layer: 'mechanism', focusBody: p.focusBody },
        ]
      : [];
  return {
    tip: s4,
    nodes: [
      {
        id: s3,
        parent: p.parent,
        update: (t, _pos, rot) => {
          rot.setFromAxisAngle(Y, p.phase(t) * DEG);
        },
        constructs: sphere(p.radius * 0.965, [0, 1, 0]),
      },
      {
        id: s4,
        parent: s3,
        update: (t, _pos, rot) => {
          rot.setFromAxisAngle(axis4, -p.phase(t) * DEG);
        },
        constructs: sphere(p.radius * 0.93, [0, Math.cos(i), Math.sin(i)]),
      },
    ],
  };
}

export interface EudoxanPlanetParams {
  id: ClassicalPlanet;
  radius: number;
  epochJd: number;
  bodyRadius: number;
  role: string;
  /** Aristotle: draw the counteracting (unrolling) spheres beneath this planet's set */
  counterSpheres?: number;
  /** Callippus: one more sphere for Mars, Venus and Mercury (drawn; its function is not recorded) */
  callippanSphere?: boolean;
}

export function buildEudoxanPlanet(p: EudoxanPlanetParams): { nodes: NodeDef[]; body: BodyDef } {
  const id = p.id;
  const spec = EUDOXUS[id];
  const inferior = id === 'mercury' || id === 'venus';
  const lambda0 = inferior ? sunMean(p.epochJd).L : planetMean(id, p.epochJd).L;
  const zodiacalRate = 360 / (spec.zodiacalYears * 365.25);
  const tRetro = retrogradeCentre(id, p.epochJd);
  const nodes: NodeDef[] = [
    {
      id: `${id}.zodiacal`,
      parent: 'earth',
      update: (t, _pos, rot) => {
        rot.setFromAxisAngle(Z, (lambda0 + zodiacalRate * (t.ut - p.epochJd)) * DEG);
      },
      constructs: [
        { kind: 'sphere', radius: p.radius, style: 'crystal', layer: 'spheres', focusBody: id },
        { kind: 'axis', length: p.radius * 1.12, style: 'axis', layer: 'mechanism', focusBody: id },
      ],
    },
  ];
  const hippo = buildHippopede({
    prefix: id,
    parent: `${id}.zodiacal`,
    radius: p.radius,
    inclination: spec.inclination,
    phase: (t) => (360 * (t.ut - tRetro)) / spec.synodicDays,
    focusBody: id,
    draw: true,
  });
  nodes.push(...hippo.nodes);
  nodes.push({ id: `${id}.planet`, parent: hippo.tip, update: (_t, pos) => void pos.set(p.radius * 0.93, 0, 0) });
  const extras: ConstructDef[] = [];
  if (p.callippanSphere) extras.push({ kind: 'sphere', radius: p.radius * 1.03, style: 'crystal', layer: 'spheres', focusBody: id });
  for (let k = 0; k < (p.counterSpheres ?? 0); k++) {
    extras.push({ kind: 'sphere', radius: p.radius * (0.9 - 0.035 * k), style: 'counter', layer: 'spheres', focusBody: id, label: k === 0 ? 'unrolling spheres' : undefined });
  }
  if (extras.length) nodes.push({ id: `${id}.extras`, parent: 'earth', constructs: extras });
  return {
    nodes,
    body: {
      id,
      name: PLANET_NAMES[id],
      kind: 'planet',
      node: `${id}.planet`,
      appearance: planetAppearance(id, p.bodyRadius),
      truth: id,
      trailDays: { mercury: 116, venus: 584, mars: 780, jupiter: 399, saturn: 378 }[id],
      role: p.role,
    },
  };
}

/** The Sun on its spheres. With `callippus`, a hippopede pair supplies the unequal seasons. */
export function buildEudoxanSun(o: { radius: number; bodyRadius: number; role: string; callippus: boolean }): { nodes: NodeDef[]; body: BodyDef } {
  const nodes: NodeDef[] = [
    {
      id: 'sun.zodiacal',
      parent: 'earth',
      update: (t, _pos, rot) => {
        rot.setFromAxisAngle(Z, sunMean(t.jd).L * DEG);
      },
      constructs: [
        { kind: 'sphere', radius: o.radius, style: 'crystal', layer: 'spheres', focusBody: 'sun' },
        { kind: 'axis', length: o.radius * 1.12, style: 'axis', layer: 'mechanism', focusBody: 'sun' },
      ],
    },
    // Eudoxus's third solar sphere, for a supposed wandering in latitude of unrecorded size.
    { id: 'sun.latitude', parent: 'sun.zodiacal', constructs: [{ kind: 'sphere', radius: o.radius * 0.98, style: 'crystal', layer: 'spheres', focusBody: 'sun' }] },
  ];
  let tip = 'sun.latitude';
  if (o.callippus) {
    const hippo = buildHippopede({
      prefix: 'sun',
      parent: tip,
      radius: o.radius,
      inclination: 1.915,
      phase: (t) => moonMean(t.jd).M + 180,
      focusBody: 'sun',
      draw: true,
    });
    nodes.push(...hippo.nodes);
    tip = hippo.tip;
  }
  nodes.push({ id: 'sun.body', parent: tip, update: (_t, pos) => void pos.set(o.radius * 0.93, 0, 0) });
  return {
    nodes,
    body: { id: 'sun', name: 'Sun', kind: 'sun', node: 'sun.body', appearance: sunAppearance(o.bodyRadius), truth: 'sun', trailDays: 365, role: o.role },
  };
}

/** The Moon: a sphere turning backward about the ecliptic poles (the nodes) and one carrying the Moon monthly. */
export function buildEudoxanMoon(o: { radius: number; bodyRadius: number; role: string; callippus: boolean }): { nodes: NodeDef[]; body: BodyDef } {
  const args = memoByTime((t) => moonMean(t.jd));
  const tilt = new Quaternion();
  const nodes: NodeDef[] = [
    {
      id: 'moon.nodal',
      parent: 'earth',
      update: (t, _pos, rot) => {
        rot.setFromAxisAngle(Z, args(t).node * DEG);
      },
      constructs: [
        { kind: 'sphere', radius: o.radius, style: 'crystal', layer: 'spheres', focusBody: 'moon' },
        { kind: 'axis', length: o.radius * 1.12, style: 'axis', layer: 'mechanism', focusBody: 'moon' },
      ],
    },
    {
      id: 'moon.monthly',
      parent: 'moon.nodal',
      update: (t, _pos, rot) => {
        tilt.setFromAxisAngle(new Vector3(1, 0, 0), 5.15 * DEG);
        rot.copy(tilt).multiply(new Quaternion().setFromAxisAngle(Z, args(t).F * DEG));
      },
      constructs: [
        { kind: 'sphere', radius: o.radius * 0.97, style: 'crystal', layer: 'spheres', focusBody: 'moon' },
        { kind: 'axis', length: o.radius * 1.1, style: 'axis', layer: 'mechanism', focusBody: 'moon' },
      ],
    },
  ];
  let tip = 'moon.monthly';
  if (o.callippus) {
    const hippo = buildHippopede({
      prefix: 'moon',
      parent: tip,
      radius: o.radius,
      inclination: 6.289,
      phase: (t) => args(t).Mp + 180,
      focusBody: 'moon',
      draw: true,
    });
    nodes.push(...hippo.nodes);
    tip = hippo.tip;
  }
  nodes.push({ id: 'moon.body', parent: tip, update: (_t, pos) => void pos.set(o.radius * 0.93, 0, 0) });
  return {
    nodes,
    body: { id: 'moon', name: 'Moon', kind: 'moon', node: 'moon.body', appearance: moonAppearance(o.bodyRadius), truth: 'moon', trailDays: 27.3, role: o.role },
  };
}
