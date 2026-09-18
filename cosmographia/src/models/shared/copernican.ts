import { Vector3 } from 'three';
import type { BodyDef, LinkDef, NodeDef, TimeContext } from '../types';
import { memoByTime } from '../mechanism';
import { onCircle, tiltAboutNodeLine } from './geometry';
import { moonAppearance, PLANET_NAMES, planetAppearance } from './appearance';
import { moonMean, planetMean, type ClassicalPlanet } from './phases';

/**
 * Copernicus's heliostatic geometry (De revolutionibus, 1543, after Swerdlow & Neugebauer).
 *
 * Planetary orbits are referred to the centre of the Earth's orbit (the "mean Sun"), which is
 * displaced from the Sun. Each superior planet moves on a deferent whose centre lies 3e/2 from
 * that point, carrying an epicyclet of radius e/2 that turns at the same rate as the deferent:
 * uniform circles only, reproducing Ptolemy's equant without the equant.
 */

export const COPERNICUS = {
  /** Displacement of the great orb's centre from the Sun, in units of its radius. */
  earthEccentricity: 0.0323,
  planets: {
    mercury: { R: 0.3763, E1: 1.5 * 0.2056, E2: 0.5 * 0.2056 },
    venus: { R: 0.7193, E1: 0.0104 / 0.7193, E2: 0 },
    mars: { R: 1.52, E1: 0.146, E2: 0.05 },
    jupiter: { R: 5.219, E1: 0.0687, E2: 0.0229 },
    saturn: { R: 9.174, E1: 0.0854, E2: 0.0285 },
  } satisfies Record<ClassicalPlanet, { R: number; E1: number; E2: number }>,
  moon: { deferentEr: 60 + 18 / 60, r1: 0.1097, r2: 0.0237 },
} as const;

/** Earth radii per astronomical unit (modern). */
export const ER_PER_AU = 23454.8;

/** Centre of the great orb relative to the Sun (units of the Earth's orbital radius). */
export function greatOrbCenter(t: TimeContext, out: Vector3): Vector3 {
  const emb = planetMean('emb', t.jd);
  return onCircle(out, COPERNICUS.earthEccentricity, emb.varpi + 180);
}

/** The Earth relative to the Sun: uniform motion on the great orb. */
export function earthFromSun(t: TimeContext, out: Vector3): Vector3 {
  greatOrbCenter(t, out);
  const emb = planetMean('emb', t.jd);
  return out.add(onCircle(new Vector3(), 1, emb.L));
}

export interface CopernicanBuildOptions {
  /** node carrying the Sun (the planets' reference point hangs from it) */
  sunNode: string;
  /** model units per astronomical unit */
  unit: number;
  orbitStyle: 'deferent' | 'orbit';
  showEpicyclets: boolean;
  /** node id for the Earth; omitted when the Earth is the root (Tycho) */
  earthParent?: string;
  bodyRadii: Record<ClassicalPlanet, number>;
  roles: Record<ClassicalPlanet, string>;
  saturnRings?: 'rings' | 'ears';
}

/** The planets' mechanisms, attached to the centre of the great orb. */
export function buildCopernicanPlanets(o: CopernicanBuildOptions): { nodes: NodeDef[]; bodies: BodyDef[]; links: LinkDef[] } {
  const nodes: NodeDef[] = [];
  const bodies: BodyDef[] = [];
  const links: LinkDef[] = [];
  const u = o.unit;
  nodes.push({
    id: 'greatOrb',
    parent: o.sunNode,
    update: (t, pos) => {
      greatOrbCenter(t, pos).multiplyScalar(u);
    },
    constructs: o.showEpicyclets
      ? [{ kind: 'marker', shape: 'cross', size: 0.06 * u, style: 'guide', layer: 'mechanism', label: 'centre of the great orb' }]
      : [],
  });
  for (const id of ['mercury', 'venus', 'mars', 'jupiter', 'saturn'] as const) {
    const p = COPERNICUS.planets[id];
    const R = p.R * u;
    const mean = memoByTime((t) => planetMean(id, t.jd));
    const aphelion = (t: TimeContext) => mean(t).varpi + 180;
    nodes.push({
      id: `${id}.group`,
      parent: 'greatOrb',
      update: (t, _pos, rot) => {
        const m = mean(t);
        tiltAboutNodeLine(rot, m.node, m.I);
      },
    });
    nodes.push({
      id: `${id}.center`,
      parent: `${id}.group`,
      update: (t, pos) => {
        onCircle(pos, p.E1 * R, aphelion(t));
      },
      constructs: [
        { kind: 'circle', radius: R, style: o.orbitStyle, layer: o.orbitStyle === 'orbit' ? 'orbits' : 'mechanism', label: o.orbitStyle === 'deferent' ? 'orbit (deferent)' : undefined },
        ...(o.showEpicyclets ? [{ kind: 'marker' as const, shape: 'cross' as const, size: 0.05 * u, style: 'guide' as const, layer: 'mechanism' as const, focusBody: id }] : []),
      ],
    });
    nodes.push({
      id: `${id}.epicyclet`,
      parent: `${id}.center`,
      update: (t, pos) => {
        onCircle(pos, R, mean(t).L);
      },
      constructs:
        o.showEpicyclets && p.E2 > 0 ? [{ kind: 'circle', radius: p.E2 * R, style: 'epicyclet', layer: 'mechanism', focusBody: id }] : [],
    });
    nodes.push({
      id: `${id}.planet`,
      parent: `${id}.epicyclet`,
      update: (t, pos) => {
        if (p.E2 === 0) return;
        onCircle(pos, p.E2 * R, 2 * mean(t).L - aphelion(t) + 180);
      },
    });
    // Undo the orbital tilt so satellite systems hang in the ecliptic frame.
    nodes.push({
      id: `${id}.frame`,
      parent: `${id}.planet`,
      update: (t, _pos, rot) => {
        const m = mean(t);
        tiltAboutNodeLine(rot, m.node, -m.I);
      },
    });
    if (o.showEpicyclets && p.E2 > 0) {
      links.push({ from: `${id}.epicyclet`, to: `${id}.planet`, layer: 'mechanism', style: 'epicyclet', focusBody: id });
    }
    bodies.push({
      id,
      name: PLANET_NAMES[id],
      kind: 'planet',
      node: `${id}.planet`,
      appearance: planetAppearance(id, o.bodyRadii[id], id === 'saturn' ? o.saturnRings : undefined),
      truth: id,
      trailDays: { mercury: 116, venus: 584, mars: 780, jupiter: 399, saturn: 378 }[id],
      role: o.roles[id],
    });
  }
  return { nodes, bodies, links };
}

/**
 * Copernicus's lunar theory (De revolutionibus IV): a concentric deferent carrying two epicycles,
 * the second turning at twice the elongation. It keeps Ptolemy's longitudes without Ptolemy's
 * absurd variation in the Moon's distance.
 */
export function buildCopernicanMoon(opts: { earthNode: string; unit: number; displayScale: number; bodyRadius: number; role: string }): {
  nodes: NodeDef[];
  body: BodyDef;
  links: LinkDef[];
} {
  const d = COPERNICUS.moon.deferentEr * (opts.unit / ER_PER_AU);
  const r1 = COPERNICUS.moon.r1 * d;
  const r2 = COPERNICUS.moon.r2 * d;
  const args = memoByTime((t) => {
    const m = moonMean(t.jd);
    return { L: m.L, alpha: m.Mp + 180, D: m.D, node: m.L - m.F };
  });
  const nodes: NodeDef[] = [
    {
      id: 'moon.group',
      parent: opts.earthNode,
      displayScale: opts.displayScale,
      update: (t, _pos, rot) => {
        tiltAboutNodeLine(rot, args(t).node, 5.15);
      },
      constructs: [{ kind: 'circle', radius: d, style: 'deferent', layer: 'mechanism', label: 'lunar deferent' }],
    },
    {
      id: 'moon.epicycle1',
      parent: 'moon.group',
      update: (t, pos) => {
        onCircle(pos, d, args(t).L);
      },
      constructs: [{ kind: 'circle', radius: r1, style: 'epicycle', layer: 'mechanism', focusBody: 'moon' }],
    },
    {
      id: 'moon.epicycle2',
      parent: 'moon.epicycle1',
      update: (t, pos) => {
        const a = args(t);
        onCircle(pos, r1, a.L - a.alpha);
      },
      constructs: [{ kind: 'circle', radius: r2, style: 'epicyclet', layer: 'mechanism', focusBody: 'moon' }],
    },
    {
      id: 'moon.body',
      parent: 'moon.epicycle2',
      update: (t, pos) => {
        const a = args(t);
        onCircle(pos, r2, a.L - a.alpha + 180 + 2 * a.D);
      },
    },
  ];
  const links: LinkDef[] = [
    { from: 'moon.epicycle1', to: 'moon.epicycle2', layer: 'mechanism', style: 'epicycle', focusBody: 'moon' },
    { from: 'moon.epicycle2', to: 'moon.body', layer: 'mechanism', style: 'epicyclet', focusBody: 'moon' },
  ];
  return {
    nodes,
    links,
    body: {
      id: 'moon',
      name: 'Moon',
      kind: 'moon',
      node: 'moon.body',
      appearance: moonAppearance(opts.bodyRadius),
      truth: 'moon',
      trailDays: 27.3,
      role: opts.role,
    },
  };
}
