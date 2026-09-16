import { Vector3 } from 'three';
import { CALENDAR_REFORM } from '../../astro/time';
import { lstDeg } from '../../astro/time';
import { obliquityDeg } from '../../astro/frames';
import type { EraDefinition, EraOptionValues } from '../era';
import type { BodyDef, ModelDefinition, NodeDef } from '../types';
import { BODY_COLORS, earthAppearance, moonAppearance, PLANET_NAMES, planetAppearance, sunAppearance } from '../shared/appearance';
import { onCircle, tiltAboutNodeLine } from '../shared/geometry';
import { moonMean, planetMean, sunMean, type ClassicalPlanet } from '../shared/phases';

/** Radii (units of the Earth's daily circle). No numbers survive; these keep daily parallax modest. */
const RADII = { counterEarth: 0.6, earth: 1, moon: 30, sun: 60, mercury: 70, venus: 80, mars: 95, jupiter: 110, saturn: 125, stars: 145 } as const;
const SCALE = 0.45;

const X = new Vector3(1, 0, 0);

function buildPhilolaus(options: EraOptionValues): ModelDefinition {
  const enlarged = options.layout !== 'scale';
  const location = philolaus.location;
  const nodes: NodeDef[] = [
    { id: 'fire', parent: null, displayScale: SCALE },
    {
      // The plane of the Earth's daily circuit is the celestial equator.
      id: 'daily',
      parent: 'fire',
      displayScale: enlarged ? 9 : 1,
      update: (t, _pos, rot) => {
        rot.setFromAxisAngle(X, (-obliquityDeg(t.T) * Math.PI) / 180);
      },
      constructs: [
        { kind: 'circle', radius: RADII.earth, style: 'orbit', layer: 'orbits', label: 'the Earth’s daily circuit' },
        { kind: 'circle', radius: RADII.counterEarth, style: 'orbit-faint', layer: 'orbits' },
      ],
    },
    {
      id: 'counterEarth',
      parent: 'daily',
      update: (t, pos) => {
        onCircle(pos, RADII.counterEarth, lstDeg(t.ut, location.lon));
      },
    },
    {
      id: 'earth',
      parent: 'daily',
      update: (t, pos) => {
        // The inhabited side always faces away from the Central Fire, so the meridian points outward.
        onCircle(pos, RADII.earth, lstDeg(t.ut, location.lon));
      },
    },
  ];
  const bodies: BodyDef[] = [
    {
      id: 'fire',
      name: 'Central Fire',
      kind: 'fire',
      node: 'fire',
      appearance: { color: BODY_COLORS.fire, radius: 0.9, surface: 'fire', emissive: true, glow: '#ff7a3a' },
      inSky: false,
      role: 'Hestia, the hearth of the universe, at the centre of everything. We never see it: our side of the Earth always faces away.',
    },
    {
      id: 'counterEarth',
      name: 'Counter-Earth',
      kind: 'counter-earth',
      node: 'counterEarth',
      appearance: { color: BODY_COLORS.counterEarth, radius: 0.35, surface: 'counter-earth', phases: true },
      inSky: false,
      role: 'Antichthon, the tenth body, completing the perfect number of the decad. It keeps pace with the Earth between it and the Fire, forever unseen.',
    },
    {
      id: 'earth',
      name: 'Earth',
      kind: 'earth',
      node: 'earth',
      appearance: earthAppearance(0.4),
      inSky: false,
      role: 'A planet circling the Central Fire once a day. The daily turning of the sky is the Earth’s own motion — the first time the Earth was set in motion.',
    },
  ];
  const meanMoon = (jd: number) => moonMean(jd);
  nodes.push(
    {
      id: 'moon.orbit',
      parent: 'fire',
      update: (t, _pos, rot) => {
        const m = meanMoon(t.jd);
        tiltAboutNodeLine(rot, m.L - m.F, 5.15);
      },
      constructs: [{ kind: 'circle', radius: RADII.moon, style: 'orbit', layer: 'orbits' }],
    },
    {
      id: 'moon.body',
      parent: 'moon.orbit',
      update: (t, pos) => {
        onCircle(pos, RADII.moon, meanMoon(t.jd).L);
      },
    },
    { id: 'sun.orbit', parent: 'fire', constructs: [{ kind: 'circle', radius: RADII.sun, style: 'orbit', layer: 'orbits' }] },
    {
      id: 'sun.body',
      parent: 'fire',
      update: (t, pos) => {
        onCircle(pos, RADII.sun, sunMean(t.jd).L);
      },
    },
  );
  bodies.push(
    {
      id: 'moon',
      name: 'Moon',
      kind: 'moon',
      node: 'moon.body',
      appearance: moonAppearance(0.5),
      truth: 'moon',
      trailDays: 27.3,
      role: 'Circles the Central Fire once a month, uniformly.',
    },
    {
      id: 'sun',
      name: 'Sun',
      kind: 'sun',
      node: 'sun.body',
      appearance: sunAppearance(1.1),
      truth: 'sun',
      trailDays: 365,
      role: 'Not a fire of its own but a glassy body that gathers the light of the fires and passes it on to us.',
    },
  );
  for (const id of ['mercury', 'venus', 'mars', 'jupiter', 'saturn'] as const) {
    const inferior = id === 'mercury' || id === 'venus';
    nodes.push(
      { id: `${id}.orbit`, parent: 'fire', constructs: [{ kind: 'circle', radius: RADII[id], style: 'orbit', layer: 'orbits' }] },
      {
        id: `${id}.planet`,
        parent: 'fire',
        update: (t, pos) => {
          // Mercury and Venus keep company with the Sun; the outer planets circle at their mean rates.
          onCircle(pos, RADII[id], inferior ? sunMean(t.jd).L : planetMean(id, t.jd).L);
        },
      },
    );
    bodies.push({
      id,
      name: PLANET_NAMES[id],
      kind: 'planet',
      node: `${id}.planet`,
      appearance: planetAppearance(id as ClassicalPlanet, id === 'jupiter' ? 0.8 : id === 'saturn' ? 0.75 : 0.5),
      truth: id,
      trailDays: { mercury: 116, venus: 584, mars: 780, jupiter: 399, saturn: 378 }[id],
      role: inferior
        ? 'Keeps company with the Sun, circling the Central Fire in a year. No retrograde motion: the Pythagorean scheme has none to offer.'
        : 'A uniform circle about the Central Fire. Seen from the moving Earth it advances steadily; there are no loops.',
    });
  }
  nodes.push({
    id: 'stars',
    parent: 'fire',
    constructs: [{ kind: 'sphere', radius: RADII.stars, style: 'stars', layer: 'spheres', graticule: true, label: 'sphere of the fixed stars, at rest' }],
  });
  return {
    nodes,
    bodies,
    observerNode: 'earth',
    earthBody: 'earth',
    sunNode: 'sun.body',
    diurnal: 'orbit',
    stars: { displayRadius: RADII.stars * SCALE, mode: 'sphere', label: 'The fixed stars' },
    centerNode: 'fire',
    cameraDistance: 95,
    unitLabel: 'radii of the Earth’s daily circuit',
  };
}

export const philolaus: EraDefinition = {
  id: 'philolaus',
  figure: 'Philolaus of Croton',
  title: 'The Central Fire',
  dates: 'c. 430 BCE',
  timelineYear: -429,
  knowledgeYear: -429,
  location: { name: 'Croton', lat: 39.08, lon: 17.12, reformJd: CALENDAR_REFORM.italy },
  epoch: { year: -429, month: 7, day: 20, hour: 21, minute: 30 },
  defaults: { speed: 1 / 24, view: 'cosmos', diurnalLock: false, focus: 'earth', skyTarget: 'moon', skyMode: 'horizon', layers: { orbits: true } },
  constellations: 'ptolemaic',
  options: [
    {
      id: 'layout',
      label: 'Earth’s daily circuit',
      description: 'Enlarge the circuit of the Earth and Counter-Earth around the Central Fire so it can be seen, or draw it to the same scale as the rest.',
      choices: [
        { value: 'enlarged', label: 'Enlarged' },
        { value: 'scale', label: 'To scale' },
      ],
      default: 'enlarged',
    },
  ],
  events: [],
  build: buildPhilolaus,
};
