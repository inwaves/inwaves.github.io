import { CALENDAR_REFORM, localDateToJdTT } from '../../astro/time';
import type { EraDefinition, EraOptionValues } from '../era';
import type { BodyDef, ModelDefinition, NodeDef } from '../types';
import { earthAppearance } from '../shared/appearance';
import { buildEudoxanMoon, buildEudoxanPlanet, buildEudoxanSun } from '../shared/eudoxan';
import type { ClassicalPlanet } from '../shared/phases';

/** Radii leave room below each set for its unrolling spheres, and below the Moon for the elements. */
const RADII = { earth: 1, water: 1.35, air: 2.3, fire: 3.3, moon: 4.6, sun: 8, venus: 11.4, mercury: 14.8, mars: 18.2, jupiter: 21.6, saturn: 25, stars: 28.5 } as const;

/** Moving spheres per wanderer after Callippus, and counteracting spheres added by Aristotle. */
const SPHERES: Record<ClassicalPlanet | 'sun' | 'moon', { moving: number; counter: number }> = {
  saturn: { moving: 4, counter: 3 },
  jupiter: { moving: 4, counter: 3 },
  mars: { moving: 5, counter: 4 },
  venus: { moving: 5, counter: 4 },
  mercury: { moving: 5, counter: 4 },
  sun: { moving: 5, counter: 4 },
  moon: { moving: 5, counter: 0 },
};

const ROLES: Record<ClassicalPlanet, string> = {
  saturn: 'Outermost wanderer: four spheres of aether, then three unrolling spheres that cancel their motions so Jupiter’s spheres start from the daily rotation alone.',
  jupiter: 'Four moving spheres and three counteracting ones. Each sphere is a real body of aether, moved by its own unmoved mover.',
  mars: 'Five spheres after Callippus, who added one to fix Eudoxus’s failures; how it worked is lost. Four unrolling spheres below.',
  venus: 'Five spheres and four unrolling spheres.',
  mercury: 'Five spheres and four unrolling spheres.',
};

function buildAristotle(_options: EraOptionValues): ModelDefinition {
  const epochJd = localDateToJdTT(aristotle.epoch, aristotle.location.lon, aristotle.location.reformJd);
  const nodes: NodeDef[] = [
    {
      id: 'earth',
      parent: null,
      constructs: [
        { kind: 'sphere', radius: RADII.water, style: 'element-water', layer: 'spheres', label: 'water' },
        { kind: 'sphere', radius: RADII.air, style: 'element-air', layer: 'spheres', label: 'air' },
        { kind: 'sphere', radius: RADII.fire, style: 'element-fire', layer: 'spheres', label: 'fire — the top of the sublunar world' },
      ],
    },
  ];
  const bodies: BodyDef[] = [
    {
      id: 'earth',
      name: 'Earth',
      kind: 'earth',
      node: 'earth',
      appearance: earthAppearance(RADII.earth),
      inSky: false,
      role: 'Heavy earth falls naturally toward the centre of the universe and collects there as a sphere. Its round shadow in lunar eclipses proves the shape.',
    },
  ];
  const moon = buildEudoxanMoon({
    radius: RADII.moon,
    bodyRadius: 0.45,
    callippus: true,
    role: 'Lowest of the aethereal bodies. Below its sphere everything is generated and decays; above, nothing changes. Callippus’s two extra spheres give it unequal speed.',
  });
  const sun = buildEudoxanSun({
    radius: RADII.sun,
    bodyRadius: 1.0,
    callippus: true,
    role: 'Five spheres. Callippus added two so the Sun runs faster in winter than in summer, matching the unequal seasons Meton and Euctemon measured.',
  });
  nodes.push(...moon.nodes, ...sun.nodes);
  bodies.push(moon.body, sun.body);
  nodes.push({
    id: 'sun.counter',
    parent: 'earth',
    constructs: Array.from({ length: SPHERES.sun.counter }, (_, k) => ({
      kind: 'sphere' as const,
      radius: RADII.sun * (0.9 - 0.035 * k),
      style: 'counter' as const,
      layer: 'spheres' as const,
      focusBody: 'sun',
    })),
  });
  for (const id of ['venus', 'mercury', 'mars', 'jupiter', 'saturn'] as const) {
    const built = buildEudoxanPlanet({
      id,
      radius: RADII[id],
      epochJd,
      bodyRadius: id === 'jupiter' ? 0.7 : id === 'saturn' ? 0.65 : 0.45,
      role: ROLES[id],
      counterSpheres: SPHERES[id].counter,
      callippanSphere: SPHERES[id].moving === 5,
    });
    nodes.push(...built.nodes);
    bodies.push(built.body);
  }
  nodes.push({
    id: 'stars',
    parent: 'earth',
    constructs: [
      { kind: 'sphere', radius: RADII.stars, style: 'primum', layer: 'spheres', graticule: true, label: 'the first heaven: fixed stars, moved by the Unmoved Mover' },
    ],
  });
  return {
    nodes,
    bodies,
    observerNode: 'earth',
    earthBody: 'earth',
    sunNode: 'sun.body',
    diurnal: 'heavens',
    stars: { displayRadius: RADII.stars, mode: 'sphere', label: 'The first heaven' },
    centerNode: 'earth',
    cameraDistance: 64,
    unitLabel: 'schematic units',
  };
}

export const aristotle: EraDefinition = {
  id: 'aristotle',
  figure: 'Aristotle',
  title: 'On the Heavens: the physical cosmos',
  dates: 'c. 350 BCE',
  timelineYear: -349,
  knowledgeYear: -349,
  location: { name: 'Athens', lat: 37.98, lon: 23.73, reformJd: CALENDAR_REFORM.italy },
  epoch: { year: -356, month: 5, day: 4, hour: 19, minute: 45 },
  defaults: { speed: 4, view: 'cosmos', diurnalLock: false, focus: 'moon', skyTarget: 'moon', skyMode: 'horizon', layers: { spheres: true, mechanism: false } },
  constellations: 'ptolemaic',
  options: [],
  events: [
    {
      id: 'moon-occults-mars',
      label: 'The Moon covers Mars, 4 May 357 BCE',
      date: { year: -356, month: 5, day: 4, hour: 19, minute: 45 },
      description: '“We have seen the Moon, half-full, pass beneath the planet Mars, which vanished on its shadow side and came forth by the bright and shining part” (De caelo II.12). So the Moon is nearer than Mars.',
      view: 'sky',
      focus: 'moon',
      speed: 0.02,
    },
  ],
  build: buildAristotle,
};
