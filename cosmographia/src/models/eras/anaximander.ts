import { CALENDAR_REFORM } from '../../astro/time';
import type { EraDefinition, EraOptionValues } from '../era';
import type { BodyDef, ModelDefinition, NodeDef } from '../types';
import { BODY_COLORS } from '../shared/appearance';
import { onCircle, tiltAboutNodeLine } from '../shared/geometry';
import { moonMean, sunMean } from '../shared/phases';

/** Earth diameters. Hippolytus: the Sun’s ring 27 times the Earth, the Moon’s 18; the stars’ 9. */
export const ANAXIMANDER = { drumRadius: 0.5, starWheel: 9, moonWheel: 18, sunWheel: 27, tube: 0.5 } as const;
const SCALE = 1.8;

function buildAnaximander(_options: EraOptionValues): ModelDefinition {
  const nodes: NodeDef[] = [
    { id: 'earth', parent: null, displayScale: SCALE },
    {
      id: 'sun.wheel',
      parent: 'earth',
      constructs: [{ kind: 'torus', radius: ANAXIMANDER.sunWheel, tube: ANAXIMANDER.tube, style: 'mist', layer: 'spheres', label: 'the Sun’s wheel: fire inside a tube of mist, 27 Earth-diameters' }],
    },
    {
      id: 'sun.vent',
      parent: 'sun.wheel',
      update: (t, pos) => {
        onCircle(pos, ANAXIMANDER.sunWheel, sunMean(t.jd).L);
      },
    },
    {
      id: 'moon.wheel',
      parent: 'earth',
      update: (t, _pos, rot) => {
        const m = moonMean(t.jd);
        tiltAboutNodeLine(rot, m.L - m.F, 5.15);
      },
      constructs: [{ kind: 'torus', radius: ANAXIMANDER.moonWheel, tube: ANAXIMANDER.tube, style: 'mist', layer: 'spheres', label: 'the Moon’s wheel, 18 Earth-diameters' }],
    },
    {
      id: 'moon.vent',
      parent: 'moon.wheel',
      update: (t, pos) => {
        onCircle(pos, ANAXIMANDER.moonWheel, moonMean(t.jd).L);
      },
    },
    {
      id: 'stars',
      parent: 'earth',
      constructs: [{ kind: 'sphere', radius: ANAXIMANDER.starWheel, style: 'mist', layer: 'spheres', label: 'the star wheels: fire glimpsed through holes in the mist, 9 Earth-diameters' }],
    },
  ];
  const bodies: BodyDef[] = [
    {
      id: 'earth',
      name: 'Earth',
      kind: 'earth',
      node: 'earth',
      appearance: { color: '#b89a66', radius: ANAXIMANDER.drumRadius * SCALE, surface: 'drum', shape: 'drum' },
      inSky: false,
      role: 'A squat drum, three times as wide as it is deep, floating unsupported at the centre: equally far from everything, it has no reason to fall one way rather than another. We live on its flat top.',
    },
    {
      id: 'sun',
      name: 'Sun',
      kind: 'sun',
      node: 'sun.vent',
      appearance: { color: BODY_COLORS.sun, radius: ANAXIMANDER.drumRadius * SCALE, surface: 'fire', emissive: true, glow: '#ffb050' },
      truth: 'sun',
      trailDays: 365,
      role: 'Not a body at all but a vent in a vast wheel of fire, as wide as the Earth. When the vent is blocked the Sun is eclipsed.',
    },
    {
      id: 'moon',
      name: 'Moon',
      kind: 'moon',
      node: 'moon.vent',
      appearance: { color: '#e9e3d0', radius: 0.35 * SCALE, surface: 'plain', phases: true, glow: '#f0e8d0' },
      truth: 'moon',
      trailDays: 27.3,
      role: 'A vent in a wheel of fire, nearer than the Sun’s. Its phases are the vent opening and closing.',
    },
  ];
  return {
    nodes,
    bodies,
    observerNode: 'earth',
    earthBody: 'earth',
    sunNode: 'sun.vent',
    diurnal: 'heavens',
    stars: { displayRadius: ANAXIMANDER.starWheel * SCALE, mode: 'mist', label: 'The star wheels' },
    centerNode: 'earth',
    cameraDistance: 85,
    unitLabel: 'Earth diameters',
    cosmosUp: 'zenith',
  };
}

export const anaximander: EraDefinition = {
  id: 'anaximander',
  figure: 'Anaximander of Miletus',
  title: 'The first model of the cosmos',
  dates: 'c. 550 BCE',
  timelineYear: -546,
  knowledgeYear: -546,
  location: { name: 'Miletus', lat: 37.53, lon: 27.28, reformJd: CALENDAR_REFORM.italy },
  epoch: { year: -546, month: 6, day: 21, hour: 21, minute: 30 },
  defaults: { speed: 1 / 24, view: 'cosmos', diurnalLock: true, focus: 'sun', skyTarget: 'moon', skyMode: 'horizon', layers: { spheres: true } },
  constellations: 'ptolemaic',
  options: [],
  events: [
    {
      id: 'midsummer-547',
      label: 'Midsummer night at Miletus, 547 BCE',
      date: { year: -546, month: 6, day: 21, hour: 21, minute: 30 },
      description: 'The year Anaximander was 64, according to Apollodorus. Watch the wheels turn about the tilted pole while the drum stays still.',
      view: 'cosmos',
      speed: 1 / 24,
    },
  ],
  build: buildAnaximander,
};
