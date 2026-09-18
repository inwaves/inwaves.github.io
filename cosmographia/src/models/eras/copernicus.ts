import { CALENDAR_REFORM } from '../../astro/time';
import type { EraDefinition, EraOptionValues } from '../era';
import type { BodyDef, LinkDef, ModelDefinition, NodeDef } from '../types';
import { earthAppearance, sunAppearance } from '../shared/appearance';
import { buildCopernicanMoon, buildCopernicanPlanets } from '../shared/copernican';
import { planetMean, type ClassicalPlanet } from '../shared/phases';
import { onCircle } from '../shared/geometry';

export const HELIO_SCALE = 7;

export const HELIO_RADII: Record<ClassicalPlanet, number> = { mercury: 0.28, venus: 0.42, mars: 0.36, jupiter: 1.0, saturn: 0.9 };

const ROLES: Record<ClassicalPlanet, string> = {
  mercury: 'Innermost and swiftest, 88 days around the Sun. In Copernicus’s order, the period sets the distance.',
  venus: 'Its orbit lies inside the Earth’s, which is why it is never seen far from the Sun: no epicycle needs to be tied to the Sun.',
  mars: 'Its retrograde loop is no longer a real motion: it appears when the faster Earth overtakes Mars on the inside track.',
  jupiter: 'Twelve years per circuit. Small retrograde arcs, because the Earth’s orbit looks small from so far out.',
  saturn: 'Thirty years per circuit, and the smallest loops of all — the size of the loops measures the planet’s distance.',
};

function buildCopernicus(options: EraOptionValues): ModelDefinition {
  const showMechanism = options.mechanism !== 'simple';
  const nodes: NodeDef[] = [{ id: 'sun', parent: null, displayScale: HELIO_SCALE, constructs: [] }];
  const bodies: BodyDef[] = [
    {
      id: 'sun',
      name: 'Sun',
      kind: 'sun',
      node: 'sun',
      appearance: sunAppearance(1.3),
      truth: 'sun',
      trailDays: 365,
      role: 'Near the centre, motionless: “In the middle of all sits the Sun enthroned… as upon a royal throne, ruling his children the planets.”',
    },
  ];
  const links: LinkDef[] = [];
  const planets = buildCopernicanPlanets({
    sunNode: 'sun',
    unit: 1,
    orbitStyle: 'deferent',
    showEpicyclets: showMechanism,
    bodyRadii: HELIO_RADII,
    roles: ROLES,
  });
  nodes.push(...planets.nodes);
  bodies.push(...planets.bodies);
  links.push(...planets.links);

  nodes.push(
    {
      id: 'earth.orbit',
      parent: 'greatOrb',
      constructs: [{ kind: 'circle', radius: 1, style: 'deferent', layer: 'mechanism', label: 'the great orb' }],
    },
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
    role: 'A planet. Three motions: daily rotation, yearly revolution, and a slow conical motion of the axis that keeps it pointing at the same stars.',
  });
  const moon = buildCopernicanMoon({
    earthNode: 'earth',
    unit: 1,
    displayScale: 70,
    bodyRadius: 0.15,
    role: 'The only body that still circles the Earth. A double epicycle keeps its distance nearly constant, unlike Ptolemy’s crank.',
  });
  nodes.push(...moon.nodes);
  bodies.push(moon.body);
  links.push(...moon.links);
  nodes.push({
    id: 'stars',
    parent: 'sun',
    constructs: [{ kind: 'sphere', radius: 12, style: 'stars', layer: 'spheres', graticule: true, label: 'sphere of the fixed stars (immensely far)' }],
  });
  return {
    nodes,
    bodies,
    links,
    observerNode: 'earth',
    earthBody: 'earth',
    sunNode: 'sun',
    diurnal: 'earth',
    stars: { displayRadius: 12 * HELIO_SCALE, mode: 'sphere', label: 'Sphere of the fixed stars' },
    centerNode: 'sun',
    cameraDistance: 38,
    unitLabel: 'radii of the great orb',
  };
}

export const copernicus: EraDefinition = {
  id: 'copernicus',
  figure: 'Nicolaus Copernicus',
  title: 'De revolutionibus orbium coelestium',
  dates: '1543',
  timelineYear: 1543,
  knowledgeYear: 1543,
  location: { name: 'Frombork', lat: 54.36, lon: 19.68, reformJd: CALENDAR_REFORM.italy },
  epoch: { year: 1543, month: 5, day: 24, hour: 21, minute: 30 },
  defaults: { speed: 10, view: 'cosmos', diurnalLock: false, focus: 'mars', skyTarget: 'mars', skyMode: 'horizon' },
  constellations: 'ptolemaic',
  options: [
    {
      id: 'mechanism',
      label: 'Planetary machinery',
      description: 'Show the eccentric deferents and epicyclets Copernicus kept, or only the circles.',
      choices: [
        { value: 'full', label: 'Epicyclets' },
        { value: 'simple', label: 'Circles only' },
      ],
      default: 'full',
    },
  ],
  events: [
    {
      id: 'mars-1512',
      label: 'Mars at opposition, 5 June 1512',
      date: { year: 1512, month: 6, day: 5, hour: 23, minute: 0 },
      description: 'The first of three oppositions of Mars from which Copernicus derived its orbit (De revolutionibus V.16).',
      view: 'sky',
      focus: 'mars',
      speed: 4,
    },
    {
      id: 'de-rev',
      label: 'De revolutionibus published',
      date: { year: 1543, month: 5, day: 24, hour: 21, minute: 30 },
      description: 'By tradition Copernicus received a printed copy on the day he died in Frombork.',
      view: 'cosmos',
      focus: 'earth',
    },
  ],
  build: buildCopernicus,
};
