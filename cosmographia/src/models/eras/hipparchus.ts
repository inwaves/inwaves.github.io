import { CALENDAR_REFORM } from '../../astro/time';
import type { EraDefinition, EraOptionValues } from '../era';
import type { BodyDef, LinkDef, ModelDefinition, NodeDef } from '../types';
import { earthAppearance } from '../shared/appearance';
import { ALMAGEST, PLANETARY_HYPOTHESES } from '../shared/almagest';
import { buildEccentricSun, buildPtolemaicMoon } from '../shared/ptolemaic';
import { ALMAGEST_TABLES, almagestMoonArgs, almagestPlanets, SCHEMATIC_DEFERENT } from './ptolemy';

const ROLES = {
  mercury: 'A simple epicycle on a concentric deferent, the Apollonian scheme Hipparchus inherited and found could not match the observations.',
  venus: 'Epicycle centred on the direction of the mean Sun, on a deferent centred on the Earth. The size of the epicycle fixes Venus’s greatest elongation.',
  mars: 'The same epicycle Ptolemy later used, but on a deferent centred on the Earth: the loops come out the same size everywhere in the zodiac. The real loops are not.',
  jupiter: 'Deferent and epicycle, uniform about the Earth. Hipparchus compiled observations of the planets but left their theory to his successors.',
  saturn: 'Deferent and epicycle, uniform about the Earth.',
};

function buildHipparchus(_options: EraOptionValues): ModelDefinition {
  const nodes: NodeDef[] = [{ id: 'earth', parent: null }];
  const bodies: BodyDef[] = [
    {
      id: 'earth',
      name: 'Earth',
      kind: 'earth',
      node: 'earth',
      appearance: earthAppearance(1.3),
      inSky: false,
      role: 'At the centre, a mere point compared with the sphere of the stars.',
    },
  ];
  const links: LinkDef[] = [];
  const sun = buildEccentricSun({
    e: ALMAGEST.sun.e,
    apogee: () => ALMAGEST.sun.apogee,
    meanLongitude: ALMAGEST_TABLES.sunMean,
    erPerPart: PLANETARY_HYPOTHESES.sun,
    displayScale: SCHEMATIC_DEFERENT.sun / (60 * PLANETARY_HYPOTHESES.sun),
    bodyRadius: 1.7,
    role: 'Hipparchus’s solar theory: uniform motion on an eccentric circle 1/24 of its radius off-centre, apogee at Gemini 5½°. It explains why spring lasts 94½ days and summer 92½.',
  });
  nodes.push(...sun.nodes);
  bodies.push(sun.body);
  const moon = buildPtolemaicMoon({
    variant: 'simple',
    args: almagestMoonArgs,
    erPerPart: PLANETARY_HYPOTHESES.moon,
    displayScale: SCHEMATIC_DEFERENT.moon / (60 * PLANETARY_HYPOTHESES.moon),
    bodyRadius: 0.75,
    role: 'A single epicycle on a concentric deferent. It predicts the Moon at new and full Moon, and so eclipses, very well; at the quarters it can be off by more than two degrees.',
  });
  nodes.push(...moon.nodes);
  bodies.push(moon.body);
  links.push(...moon.links);
  const planets = almagestPlanets('concentric', 'schematic', ALMAGEST_TABLES, ROLES);
  nodes.push(...planets.nodes);
  bodies.push(...planets.bodies);
  links.push(...planets.links);
  nodes.push({
    id: 'stars',
    parent: 'earth',
    constructs: [{ kind: 'sphere', radius: SCHEMATIC_DEFERENT.stars, style: 'stars', layer: 'spheres', graticule: true, label: 'sphere of the fixed stars — and it is slowly turning' }],
  });
  return {
    nodes,
    bodies,
    links,
    observerNode: 'earth',
    earthBody: 'earth',
    sunNode: 'sun.body',
    diurnal: 'heavens',
    stars: { displayRadius: SCHEMATIC_DEFERENT.stars, mode: 'sphere', label: 'Sphere of the fixed stars' },
    centerNode: 'earth',
    cameraDistance: 105,
    unitLabel: 'Earth radii',
  };
}

export const hipparchus: EraDefinition = {
  id: 'hipparchus',
  figure: 'Apollonius & Hipparchus',
  title: 'Circles upon circles',
  dates: 'c. 200–130 BCE',
  timelineYear: -145,
  knowledgeYear: -134,
  location: { name: 'Rhodes', lat: 36.44, lon: 28.22, reformJd: CALENDAR_REFORM.italy },
  epoch: { year: -145, month: 9, day: 26, hour: 22, minute: 0 },
  defaults: { speed: 8, view: 'cosmos', diurnalLock: false, focus: 'mars', skyTarget: 'sun', skyMode: 'horizon' },
  constellations: 'ptolemaic',
  options: [],
  events: [
    {
      id: 'autumn-equinox-146',
      label: 'Autumn equinox observed, 27 September 146 BCE',
      date: { year: -145, month: 9, day: 27, hour: 0, minute: 0 },
      description: 'One of the equinoxes Hipparchus timed (Almagest III.1). Comparing them with Aristarchus’s solstice he found the year slightly shorter than 365¼ days.',
      view: 'sky',
      focus: 'sun',
      speed: 0.1,
    },
    {
      id: 'precession',
      label: 'Spica slips along the zodiac',
      date: { year: -134, month: 4, day: 15, hour: 22, minute: 0 },
      description: 'Comparing his star positions with Timocharis’s from 150 years before, Hipparchus found Spica 2° farther from the autumn equinox: the precession of the equinoxes. Try 100 years per second in the Sky view.',
      view: 'sky',
      speed: 365.25,
    },
  ],
  build: buildHipparchus,
};
