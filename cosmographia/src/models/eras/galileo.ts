import { CALENDAR_REFORM } from '../../astro/time';
import type { EraDefinition, EraOptionValues } from '../era';
import type { BodyDef, LinkDef, ModelDefinition, NodeDef } from '../types';
import { earthAppearance, sunAppearance } from '../shared/appearance';
import { buildCopernicanMoon, buildCopernicanPlanets } from '../shared/copernican';
import { buildSatellites } from '../shared/satellites';
import { planetMean, type ClassicalPlanet } from '../shared/phases';
import { onCircle } from '../shared/geometry';
import { HELIO_RADII, HELIO_SCALE } from './copernicus';

const ROLES: Record<ClassicalPlanet, string> = {
  mercury: 'Too close to the Sun for Galileo’s small telescopes to show much.',
  venus: 'Through the telescope it waxes and wanes like the Moon, and at gibbous phase it is small and far: it must go around the Sun.',
  mars: 'Its disc swells near opposition and shrinks near conjunction, as a Sun-centred orbit requires.',
  jupiter: 'Carries four moons. If Jupiter can hold satellites while it moves, a moving Earth can keep its Moon.',
  saturn: 'In 1610 Galileo saw it as three bodies — “I have observed the highest planet to be triple”. The rings were not understood until Huygens.',
};

function buildGalileo(_options: EraOptionValues): ModelDefinition {
  const nodes: NodeDef[] = [{ id: 'sun', parent: null, displayScale: HELIO_SCALE }];
  const bodies: BodyDef[] = [
    {
      id: 'sun',
      name: 'Sun',
      kind: 'sun',
      node: 'sun',
      appearance: sunAppearance(1.3),
      truth: 'sun',
      trailDays: 365,
      role: 'Spotted and rotating: from 1611 Galileo watched sunspots move across the disc. The Sun itself turns and is not perfect.',
    },
  ];
  const links: LinkDef[] = [];
  const planets = buildCopernicanPlanets({
    sunNode: 'sun',
    unit: 1,
    orbitStyle: 'orbit',
    showEpicyclets: false,
    bodyRadii: HELIO_RADII,
    roles: ROLES,
    saturnRings: 'ears',
  });
  nodes.push(...planets.nodes);
  bodies.push(...planets.bodies);
  nodes.push(
    { id: 'earth.orbit', parent: 'greatOrb', constructs: [{ kind: 'circle', radius: 1, style: 'orbit', layer: 'orbits' }] },
    {
      id: 'earth',
      parent: 'greatOrb',
      update: (t, pos) => {
        onCircle(pos, 1, planetMean('emb', t.jd).L);
      },
    },
  );
  bodies.push({
    id: 'earth',
    name: 'Earth',
    kind: 'earth',
    node: 'earth',
    appearance: earthAppearance(0.42),
    inSky: false,
    role: 'A planet like the others. Earthshine on the Moon shows the Earth shining on the Moon as the Moon shines on the Earth.',
  });
  const moon = buildCopernicanMoon({
    earthNode: 'earth',
    unit: 1,
    displayScale: 70,
    bodyRadius: 0.16,
    role: 'Mountains, craters and valleys, their shadows lengthening near the terminator: a rough world, not a perfect aethereal sphere.',
  });
  nodes.push(...moon.nodes);
  bodies.push(moon.body);
  const jovian = buildSatellites('jupiter', 'jupiter.frame', 1610, HELIO_SCALE, 1, 2309107.25);
  nodes.push(...jovian.nodes);
  bodies.push(...jovian.bodies);
  nodes.push({
    id: 'stars',
    parent: 'sun',
    constructs: [{ kind: 'sphere', radius: 12, style: 'stars', layer: 'spheres', graticule: false, label: 'the stars: far more of them than the eye can see' }],
  });
  return {
    nodes,
    bodies,
    links,
    observerNode: 'earth',
    earthBody: 'earth',
    sunNode: 'sun',
    diurnal: 'earth',
    stars: { displayRadius: 12 * HELIO_SCALE, mode: 'sphere', label: 'The fixed stars' },
    centerNode: 'sun',
    cameraDistance: 55,
    unitLabel: 'radii of the Earth’s orbit',
  };
}

export const galileo: EraDefinition = {
  id: 'galileo',
  figure: 'Galileo Galilei',
  title: 'Sidereus Nuncius: the telescope',
  dates: '1610',
  timelineYear: 1610,
  knowledgeYear: 1610,
  location: { name: 'Padua', lat: 45.41, lon: 11.88, reformJd: CALENDAR_REFORM.italy },
  epoch: { year: 1610, month: 1, day: 7, hour: 19, minute: 0 },
  defaults: { speed: 0.5, view: 'cosmos', diurnalLock: false, focus: 'jupiter', skyTarget: 'jupiter', skyMode: 'horizon' },
  constellations: 'bayer',
  options: [],
  events: [
    {
      id: 'medicean-stars',
      label: 'Three little stars beside Jupiter, 7 January 1610',
      date: { year: 1610, month: 1, day: 7, hour: 19, minute: 0 },
      description: 'Two to the east of Jupiter, one to the west. Over the next nights they moved with Jupiter and around it: moons.',
      view: 'cosmos',
      focus: 'jupiter',
      speed: 0.25,
    },
    {
      id: 'venus-phases',
      label: 'Venus gibbous, October 1610',
      date: { year: 1610, month: 10, day: 13, hour: 17, minute: 30 },
      description: 'Galileo began watching Venus as a small gibbous evening star; by December it was half lit and by January a large crescent. On 11 December he sent Kepler an anagram: “Cynthiae figuras aemulatur mater amorum” — the mother of loves imitates the shapes of Cynthia.',
      view: 'cosmos',
      focus: 'venus',
      speed: 5,
    },
  ],
  build: buildGalileo,
};
