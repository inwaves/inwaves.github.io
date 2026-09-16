import { Vector3 } from 'three';
import { CALENDAR_REFORM } from '../../astro/time';
import { COMETS_BY_ID } from '../../astro/ephemeris/comets';
import type { EraDefinition, EraOptionValues } from '../era';
import type { BodyDef, LinkDef, ModelDefinition, NodeDef } from '../types';
import { earthAppearance, sunAppearance } from '../shared/appearance';
import { buildCopernicanMoon, buildCopernicanPlanets, earthFromSun, ER_PER_AU, greatOrbCenter } from '../shared/copernican';
import { buildComet } from '../shared/keplerian';
import type { ClassicalPlanet } from '../shared/phases';

/** Tycho's scale: the Sun at 1150 Earth radii; the stars just beyond Saturn at 14,000. */
export const TYCHO_SUN_ER = 1150;
export const TYCHO_STARS_ER = 14000;
const DISPLAY = 1 / 150;

const ROLES: Record<ClassicalPlanet, string> = {
  mercury: 'Circles the Sun, and with the Sun circles the Earth.',
  venus: 'Circles the Sun, so it shows the same phases as in Copernicus’s system — which is why Galileo’s observations of Venus could not decide between them.',
  mars: 'Its orbit around the Sun cuts through the Sun’s orbit around the Earth. With solid spheres that is impossible; Tycho’s comets had already shattered them.',
  jupiter: 'Circles the Sun at more than five times the Sun’s distance from the Earth.',
  saturn: 'Circles the Sun; its greatest distance, about 12,300 Earth radii, sets the edge of Tycho’s compact universe.',
};

function buildTycho(_options: EraOptionValues): ModelDefinition {
  const u = TYCHO_SUN_ER;
  const nodes: NodeDef[] = [{ id: 'earth', parent: null, displayScale: DISPLAY }];
  const bodies: BodyDef[] = [
    {
      id: 'earth',
      name: 'Earth',
      kind: 'earth',
      node: 'earth',
      appearance: earthAppearance(0.35),
      inSky: false,
      role: 'At rest at the centre. Tycho could detect no stellar parallax, and a heavy, sluggish Earth hurtling through space made no physical sense to him.',
    },
  ];
  const links: LinkDef[] = [];
  const tmp = new Vector3();
  nodes.push(
    {
      id: 'sun.path',
      parent: 'earth',
      update: (t, pos) => {
        greatOrbCenter(t, pos).multiplyScalar(-u);
      },
      constructs: [{ kind: 'circle', radius: u, style: 'deferent', layer: 'mechanism', label: 'the Sun’s orbit around the Earth' }],
    },
    {
      id: 'sun',
      parent: 'earth',
      update: (t, pos) => {
        earthFromSun(t, tmp);
        pos.copy(tmp).multiplyScalar(-u);
      },
    },
  );
  bodies.push({
    id: 'sun',
    name: 'Sun',
    kind: 'sun',
    node: 'sun',
    appearance: sunAppearance(1.2),
    truth: 'sun',
    trailDays: 365,
    role: 'Circles the Earth once a year, carrying the five planets with it.',
  });
  const planets = buildCopernicanPlanets({
    sunNode: 'sun',
    unit: u,
    orbitStyle: 'orbit',
    showEpicyclets: false,
    bodyRadii: { mercury: 0.28, venus: 0.4, mars: 0.36, jupiter: 0.95, saturn: 0.85 },
    roles: ROLES,
  });
  nodes.push(...planets.nodes);
  bodies.push(...planets.bodies);
  // Model units here are Earth radii; the Moon keeps its ~60 Earth-radius distance, independent of
  // Tycho's compressed solar distance.
  const moon = buildCopernicanMoon({
    earthNode: 'earth',
    unit: ER_PER_AU,
    displayScale: 5,
    bodyRadius: 0.14,
    role: 'Circles the Earth. Tycho discovered two new lunar inequalities, the variation and the annual equation.',
  });
  // Tycho's lunar theory was his own; the construction shown here is the Copernican one it refined.
  nodes.push(...moon.nodes);
  bodies.push(moon.body);
  links.push(...moon.links);

  const c1577 = COMETS_BY_ID.c1577;
  const comet = buildComet({
    id: 'c1577',
    name: 'Great Comet of 1577',
    parent: 'sun',
    unit: u,
    elements: c1577.elements,
    visibleFrom: c1577.visibleFrom,
    visibleTo: c1577.visibleTo,
    bodyRadius: 0.22,
    role: 'Tycho found less than a quarter-degree of daily parallax: the comet was at least six times farther than the Moon, passing through the spheres that were supposed to carry the planets.',
  });
  nodes.push(...comet.nodes);
  bodies.push(comet.body);

  nodes.push({
    id: 'stars',
    parent: 'earth',
    constructs: [{ kind: 'sphere', radius: TYCHO_STARS_ER, style: 'stars', layer: 'spheres', graticule: true, label: 'sphere of the fixed stars, just beyond Saturn' }],
  });
  return {
    nodes,
    bodies,
    links,
    observerNode: 'earth',
    earthBody: 'earth',
    sunNode: 'sun',
    diurnal: 'heavens',
    stars: { displayRadius: TYCHO_STARS_ER * DISPLAY, mode: 'sphere', label: 'Sphere of the fixed stars' },
    centerNode: 'earth',
    cameraDistance: 120,
    unitLabel: 'Earth radii (Tycho’s scale)',
  };
}

const HERREVAD = { name: 'Herrevad Abbey, Skåne', lat: 56.09, lon: 13.24, reformJd: CALENDAR_REFORM.denmark };

export const tycho: EraDefinition = {
  id: 'tycho',
  figure: 'Tycho Brahe',
  title: 'The geo-heliocentric world system',
  dates: '1588',
  timelineYear: 1588,
  knowledgeYear: 1588,
  location: { name: 'Uraniborg, Hven', lat: 55.91, lon: 12.7, reformJd: CALENDAR_REFORM.denmark },
  epoch: { year: 1577, month: 11, day: 13, hour: 18, minute: 0 },
  defaults: { speed: 5, view: 'cosmos', diurnalLock: false, focus: 'mars', skyTarget: 'c1577', skyMode: 'horizon' },
  constellations: 'ptolemaic',
  options: [],
  events: [
    {
      id: 'nova-1572',
      label: 'A new star in Cassiopeia, 11 November 1572',
      date: { year: 1572, month: 11, day: 11, hour: 19, minute: 0 },
      location: HERREVAD,
      description: 'Walking home at dusk, Tycho saw a star brighter than Venus where none had been. It showed no parallax: the unchangeable heavens had changed.',
      view: 'sky',
      speed: 0.02,
    },
    {
      id: 'comet-1577',
      label: 'The Great Comet, 13 November 1577',
      date: { year: 1577, month: 11, day: 13, hour: 18, minute: 0 },
      description: 'Tycho’s measurements put the comet far beyond the Moon, among the planets. Solid celestial spheres could not survive it.',
      view: 'sky',
      focus: 'c1577',
      speed: 0.5,
    },
  ],
  build: buildTycho,
};
