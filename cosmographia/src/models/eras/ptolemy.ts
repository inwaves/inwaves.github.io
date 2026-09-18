import { CALENDAR_REFORM } from '../../astro/time';
import type { EraDefinition, EraOptionValues } from '../era';
import type { BodyDef, LinkDef, ModelDefinition, NodeDef, TimeContext } from '../types';
import { earthAppearance } from '../shared/appearance';
import {
  ALMAGEST,
  nabonassarDays,
  PLANETARY_HYPOTHESES,
  PTOLEMAIC_PRECESSION_PER_DAY,
} from '../shared/almagest';
import { buildEccentricSun, buildPtolemaicMoon, buildPtolemaicPlanet, type PtolemaicVariant } from '../shared/ptolemaic';
import { planetMean, type ClassicalPlanet } from '../shared/phases';

/** Deferent radii (display units) for the schematic layout, in Ptolemy's order outward. */
export const SCHEMATIC_DEFERENT = {
  moon: 7,
  mercury: 13,
  venus: 19,
  sun: 25,
  mars: 32,
  jupiter: 40,
  saturn: 48,
  stars: 62,
} as const;

/** Display units per Earth radius for the Planetary Hypotheses layout. */
export const PROPORTIONAL_SCALE = 1 / 300;

const ROLES: Record<ClassicalPlanet | 'sun' | 'moon', string> = {
  sun: 'Moves uniformly on an eccentric circle whose centre lies toward Gemini 5½°, which is why spring and summer last longer than autumn and winter.',
  moon: 'Rides a small epicycle carried by a deferent whose centre swings around the Earth — the "crank" that doubles the second lunar inequality at the quarters.',
  mercury: 'The most intricate device of the Almagest: the deferent’s centre itself turns on a small circle, giving Mercury two perigees.',
  venus: 'Its epicycle centre stays in line with the mean Sun and moves uniformly as seen from the equant, never from the Earth.',
  mars: 'The largest epicycle: its loop is what makes Mars’s retrograde arcs so wide. Uniform motion is measured about the equant.',
  jupiter: 'A modest epicycle turning once a year; uniform motion about the equant, twice as far from Earth as the deferent’s centre.',
  saturn: 'The slowest wanderer, outermost of the planetary shells, just below the sphere of the fixed stars.',
};

/** The Almagest's planetary mechanisms, shared by Ptolemy and the medieval tradition. */
export function almagestPlanets(
  variant: PtolemaicVariant,
  scaleMode: string,
  meanTables: {
    sunMean: (t: TimeContext) => number;
    lambda: (id: 'mars' | 'jupiter' | 'saturn', t: TimeContext) => number;
    alpha: (id: ClassicalPlanet, t: TimeContext) => number;
    apogee: (id: ClassicalPlanet, t: TimeContext) => number;
  },
  roles: Partial<Record<ClassicalPlanet, string>> = {},
): { nodes: NodeDef[]; bodies: BodyDef[]; links: LinkDef[] } {
  const nodes: NodeDef[] = [];
  const bodies: BodyDef[] = [];
  const links: LinkDef[] = [];
  const proportional = scaleMode === 'proportional';
  const radii = { mercury: 0.45, venus: 0.7, mars: 0.6, jupiter: 1.05, saturn: 0.95 };
  for (const id of ['mercury', 'venus', 'mars', 'jupiter', 'saturn'] as const) {
    const k = PLANETARY_HYPOTHESES[id];
    const params = ALMAGEST[id];
    const inferior = id === 'mercury' || id === 'venus';
    const built = buildPtolemaicPlanet({
      id,
      variant,
      e: params.e,
      r: params.r,
      apogee: (t) => meanTables.apogee(id, t),
      meanLongitude: inferior ? meanTables.sunMean : (t) => meanTables.lambda(id as 'mars' | 'jupiter' | 'saturn', t),
      anomaly: (t) => meanTables.alpha(id, t),
      inclination: planetMean(id, 2451545).I,
      node: (t) => planetMean(id, t.jd).node,
      erPerPart: k,
      displayScale: proportional ? PROPORTIONAL_SCALE : SCHEMATIC_DEFERENT[id] / (60 * k),
      bodyRadius: proportional ? radii[id] * 0.5 : radii[id],
      role: roles[id] ?? ROLES[id],
    });
    nodes.push(...built.nodes);
    bodies.push(built.body);
    links.push(...built.links);
  }
  return { nodes, bodies, links };
}

/** Almagest mean motions from the Nabonassar epoch. */
export const ALMAGEST_TABLES = {
  sunMean: (t: TimeContext) => ALMAGEST.sun.lambda0 + ALMAGEST.sun.rate * nabonassarDays(t),
  lambda: (id: 'mars' | 'jupiter' | 'saturn', t: TimeContext) => ALMAGEST[id].lambda0 + ALMAGEST[id].rate * nabonassarDays(t),
  alpha: (id: ClassicalPlanet, t: TimeContext) => ALMAGEST[id].alpha0 + ALMAGEST[id].alphaRate * nabonassarDays(t),
  apogee: (id: ClassicalPlanet, t: TimeContext) => ALMAGEST[id].apogee0 + PTOLEMAIC_PRECESSION_PER_DAY * nabonassarDays(t),
};

export function almagestMoonArgs(t: TimeContext) {
  const d = nabonassarDays(t);
  const m = ALMAGEST.moon;
  return {
    lambda: m.lambda0 + m.rate * d,
    eta: m.eta0 + m.etaRate * d,
    alpha: m.alpha0 + m.alphaRate * d,
    omega: m.omega0 + m.omegaRate * d,
    sunMean: ALMAGEST_TABLES.sunMean(t),
  };
}

function buildPtolemy(options: EraOptionValues): ModelDefinition {
  const proportional = options.scale === 'proportional';
  const nodes: NodeDef[] = [{ id: 'earth', parent: null }];
  const bodies: BodyDef[] = [
    {
      id: 'earth',
      name: 'Earth',
      kind: 'earth',
      node: 'earth',
      appearance: earthAppearance(proportional ? 0.06 : 1.3),
      inSky: false,
      role: 'Motionless at the centre of the cosmos. Ptolemy argues that if it moved, loose objects and birds would be left behind.',
    },
  ];
  const links: LinkDef[] = [];

  const sun = buildEccentricSun({
    e: ALMAGEST.sun.e,
    apogee: () => ALMAGEST.sun.apogee,
    meanLongitude: ALMAGEST_TABLES.sunMean,
    erPerPart: PLANETARY_HYPOTHESES.sun,
    displayScale: proportional ? PROPORTIONAL_SCALE : SCHEMATIC_DEFERENT.sun / (60 * PLANETARY_HYPOTHESES.sun),
    bodyRadius: proportional ? 0.9 : 1.7,
    role: ROLES.sun,
  });
  nodes.push(...sun.nodes);
  bodies.push(sun.body);

  const moon = buildPtolemaicMoon({
    variant: 'crank',
    args: almagestMoonArgs,
    erPerPart: PLANETARY_HYPOTHESES.moon,
    displayScale: proportional ? PROPORTIONAL_SCALE : SCHEMATIC_DEFERENT.moon / (60 * PLANETARY_HYPOTHESES.moon),
    bodyRadius: proportional ? 0.05 : 0.75,
    role: ROLES.moon,
  });
  nodes.push(...moon.nodes);
  bodies.push(moon.body);
  links.push(...moon.links);

  const planets = almagestPlanets('equant', options.scale, ALMAGEST_TABLES);
  nodes.push(...planets.nodes);
  bodies.push(...planets.bodies);
  links.push(...planets.links);

  nodes.push({
    id: 'stars',
    parent: 'earth',
    constructs: [
      {
        kind: 'sphere',
        radius: proportional ? PLANETARY_HYPOTHESES.stars * PROPORTIONAL_SCALE : SCHEMATIC_DEFERENT.stars,
        style: 'stars',
        layer: 'spheres',
        graticule: true,
        label: 'sphere of the fixed stars',
      },
    ],
  });

  return {
    nodes,
    bodies,
    links,
    observerNode: 'earth',
    earthBody: 'earth',
    sunNode: 'sun.body',
    diurnal: 'heavens',
    stars: {
      displayRadius: proportional ? PLANETARY_HYPOTHESES.stars * PROPORTIONAL_SCALE : SCHEMATIC_DEFERENT.stars,
      mode: 'sphere',
      label: 'Sphere of the fixed stars',
    },
    centerNode: 'earth',
    cameraDistance: proportional ? 120 : 105,
    unitLabel: 'Earth radii (Planetary Hypotheses)',
  };
}

export const ptolemy: EraDefinition = {
  id: 'ptolemy',
  figure: 'Claudius Ptolemy',
  title: 'The Almagest',
  dates: 'c. 150 CE',
  timelineYear: 150,
  knowledgeYear: 150,
  location: { name: 'Alexandria', lat: 31.2, lon: 29.92, reformJd: CALENDAR_REFORM.italy },
  epoch: { year: 139, month: 5, day: 28, hour: 23, minute: 0 },
  defaults: { speed: 6, view: 'cosmos', diurnalLock: false, focus: 'mars', skyTarget: 'mars', skyMode: 'horizon' },
  constellations: 'ptolemaic',
  options: [
    {
      id: 'scale',
      label: 'Layout',
      description: 'Schematic spacing, or the absolute distances of the Planetary Hypotheses (in Earth radii).',
      choices: [
        { value: 'schematic', label: 'Schematic' },
        { value: 'proportional', label: 'Planetary Hypotheses' },
      ],
      default: 'schematic',
    },
  ],
  events: [
    {
      id: 'mars-opposition-139',
      label: 'Mars at opposition',
      date: { year: 139, month: 5, day: 28, hour: 23, minute: 0 },
      description: 'The third of the three oppositions of Mars from which Ptolemy derived its eccentricity and equant (Almagest X.7).',
      view: 'sky',
      focus: 'mars',
      speed: 4,
    },
    {
      id: 'autumn-equinox-139',
      label: 'Autumn equinox observed',
      date: { year: 139, month: 9, day: 26, hour: 7, minute: 0 },
      description: 'Ptolemy reports observing the autumnal equinox about an hour after sunrise on 26 September 139 (Almagest III.1).',
      view: 'sky',
      focus: 'sun',
      speed: 0.02,
    },
  ],
  build: buildPtolemy,
};
