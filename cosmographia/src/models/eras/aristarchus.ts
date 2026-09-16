import { CALENDAR_REFORM } from '../../astro/time';
import type { EraDefinition, EraOptionValues } from '../era';
import type { BodyDef, LinkDef, ModelDefinition, NodeDef } from '../types';
import { earthAppearance, moonAppearance, PLANET_NAMES, planetAppearance, sunAppearance } from '../shared/appearance';
import { onCircle, tiltAboutNodeLine } from '../shared/geometry';
import { moonMean, planetMean, type ClassicalPlanet } from '../shared/phases';

/** Aristarchus: the Sun about 19 times as far as the Moon (the real ratio is about 390). */
export const ARISTARCHUS_RATIO = 19;
const SCALE = 6;
/** Planetary distances are not in Aristarchus; these are the proportions later derived by Copernicus. */
const RADII: Record<ClassicalPlanet, number> = { mercury: 0.376, venus: 0.719, mars: 1.52, jupiter: 5.22, saturn: 9.17 };

function buildAristarchus(options: EraOptionValues): ModelDefinition {
  const nodes: NodeDef[] = [{ id: 'sun', parent: null, displayScale: SCALE }];
  const bodies: BodyDef[] = [
    {
      id: 'sun',
      name: 'Sun',
      kind: 'sun',
      node: 'sun',
      appearance: sunAppearance(0.9),
      truth: 'sun',
      trailDays: 365,
      role: 'At rest at the centre. Aristarchus found it far larger than the Earth — almost seven times its diameter — and put the larger body in the middle.',
    },
  ];
  const links: LinkDef[] = [];
  nodes.push(
    { id: 'earth.orbit', parent: 'sun', constructs: [{ kind: 'circle', radius: 1, style: 'orbit', layer: 'orbits', label: 'the Earth’s circle' }] },
    {
      id: 'earth',
      parent: 'sun',
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
    appearance: earthAppearance(0.14),
    inSky: false,
    role: 'Revolves about the Sun in a circle and turns daily on its axis — “the hypotheses of Aristarchus”, known to us only through Archimedes’ Sand-Reckoner.',
  });
  const r = 1 / ARISTARCHUS_RATIO;
  nodes.push(
    {
      id: 'moon.orbit',
      parent: 'earth',
      update: (t, _pos, rot) => {
        const m = moonMean(t.jd);
        tiltAboutNodeLine(rot, m.L - m.F, 5.15);
      },
      constructs: [{ kind: 'circle', radius: r, style: 'orbit-faint', layer: 'orbits' }],
    },
    {
      id: 'moon.body',
      parent: 'moon.orbit',
      update: (t, pos) => {
        const m = moonMean(t.jd);
        onCircle(pos, r, m.F + (m.L - m.F));
      },
    },
  );
  bodies.push({
    id: 'moon',
    name: 'Moon',
    kind: 'moon',
    node: 'moon.body',
    appearance: moonAppearance(0.07),
    truth: 'moon',
    trailDays: 27.3,
    role: 'Circles the Earth. At half moon the angle Moon–Earth–Sun is, Aristarchus judged, 87°, so the Sun is between 18 and 20 times farther than the Moon.',
  });
  for (const id of ['mercury', 'venus', 'mars', 'jupiter', 'saturn'] as const) {
    nodes.push(
      {
        id: `${id}.orbit`,
        parent: 'sun',
        update: (t, _pos, rot) => {
          const m = planetMean(id, t.jd);
          tiltAboutNodeLine(rot, m.node, m.I);
        },
        constructs: [{ kind: 'circle', radius: RADII[id], style: 'orbit', layer: 'orbits' }],
      },
      {
        id: `${id}.planet`,
        parent: `${id}.orbit`,
        update: (t, pos) => {
          onCircle(pos, RADII[id], planetMean(id, t.jd).L);
        },
      },
    );
    bodies.push({
      id,
      name: PLANET_NAMES[id],
      kind: 'planet',
      node: `${id}.planet`,
      appearance: planetAppearance(id, { mercury: 0.1, venus: 0.16, mars: 0.13, jupiter: 0.5, saturn: 0.45 }[id]),
      truth: id,
      trailDays: { mercury: 116, venus: 584, mars: 780, jupiter: 399, saturn: 378 }[id],
      role: 'Circles the Sun uniformly. Retrograde motion becomes an appearance: the Earth overtakes the outer planets and is overtaken by the inner ones.',
    });
  }
  if (options.triangle === 'on') {
    links.push(
      { from: 'earth', to: 'moon.body', layer: 'mechanism', style: 'accent' },
      { from: 'moon.body', to: 'sun', layer: 'mechanism', style: 'guide', dashed: true },
      { from: 'earth', to: 'sun', layer: 'mechanism', style: 'guide', dashed: true },
    );
  }
  nodes.push({
    id: 'stars',
    parent: 'sun',
    constructs: [{ kind: 'sphere', radius: 11, style: 'stars', layer: 'spheres', label: 'the fixed stars, so far that the Earth’s circle is but a point' }],
  });
  return {
    nodes,
    bodies,
    links,
    observerNode: 'earth',
    earthBody: 'earth',
    sunNode: 'sun',
    diurnal: 'earth',
    stars: { displayRadius: 11 * SCALE, mode: 'sphere', label: 'The fixed stars' },
    centerNode: 'sun',
    cameraDistance: 26,
    unitLabel: 'radii of the Earth’s circle',
  };
}

export const aristarchus: EraDefinition = {
  id: 'aristarchus',
  figure: 'Aristarchus of Samos',
  title: 'The Sun at the centre',
  dates: 'c. 280 BCE',
  timelineYear: -279,
  knowledgeYear: -279,
  location: { name: 'Alexandria', lat: 31.2, lon: 29.92, reformJd: CALENDAR_REFORM.italy },
  epoch: { year: -279, month: 6, day: 26, hour: 21, minute: 0 },
  defaults: { speed: 8, view: 'cosmos', diurnalLock: false, focus: 'earth', skyTarget: 'mars', skyMode: 'horizon', layers: { orbits: true, mechanism: true } },
  constellations: 'ptolemaic',
  options: [
    {
      id: 'triangle',
      label: 'Distance of the Sun',
      description: 'Draw the Sun–Earth–Moon triangle Aristarchus used at half moon.',
      choices: [
        { value: 'on', label: 'Triangle' },
        { value: 'off', label: 'Hide' },
      ],
      default: 'on',
    },
  ],
  events: [
    {
      id: 'solstice-280',
      label: 'Summer solstice observed, 280 BCE',
      date: { year: -279, month: 6, day: 26, hour: 21, minute: 0 },
      description: 'Ptolemy quotes Aristarchus’s observation of the summer solstice in the 50th year of the first Callippic cycle.',
      view: 'cosmos',
      focus: 'earth',
      speed: 8,
    },
    {
      id: 'half-moon-280',
      label: 'Half moon, 22 July 280 BCE',
      date: { year: -279, month: 7, day: 22, hour: 18, minute: 0 },
      description: 'At exact quarter the Moon–Earth–Sun triangle has a right angle at the Moon. Aristarchus measured 87° at the Earth; the true angle is 89.85°.',
      view: 'cosmos',
      focus: 'moon',
      speed: 0.1,
    },
  ],
  build: buildAristarchus,
};
