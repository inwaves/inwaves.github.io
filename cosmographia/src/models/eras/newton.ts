import { CALENDAR_REFORM, localDateToJdTT } from '../../astro/time';
import { COMETS_BY_ID } from '../../astro/ephemeris/comets';
import type { EraDefinition, EraOptionValues } from '../era';
import type { BodyDef, LinkDef, ModelDefinition, NodeDef } from '../types';
import { sunAppearance } from '../shared/appearance';
import { buildComet, buildKeplerEarthAndMoon, buildKeplerPlanet } from '../shared/keplerian';
import { buildSatellites } from '../shared/satellites';
import type { ClassicalPlanet } from '../shared/phases';
import { HELIO_RADII, HELIO_SCALE } from './copernicus';

const ROLES: Record<ClassicalPlanet, string> = {
  mercury: 'Pulled toward the Sun by a force inversely as the square of the distance, like every other body.',
  venus: 'Its ellipse is what a single inverse-square force produces; Kepler’s laws are consequences, not axioms.',
  mars: 'A projectile forever falling toward the Sun and forever missing it.',
  jupiter: 'Massive enough to disturb Saturn: Newton saw that the planets pull on each other, so the ellipses are only nearly exact.',
  saturn: 'Surrounded by a thin flat ring, as Huygens explained in 1659, and attended by five known moons.',
};

function buildNewton(options: EraOptionValues): ModelDefinition {
  const epochJd = localDateToJdTT(newton.epoch, newton.location.lon, newton.location.reformJd);
  const gravity = options.gravity === 'on';
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
      role: 'One star among countless others, massive enough to hold the planets. Strictly, Sun and planets all move about their common centre of gravity.',
    },
  ];
  const links: LinkDef[] = [];
  for (const id of ['mercury', 'venus', 'mars', 'jupiter', 'saturn'] as const) {
    const built = buildKeplerPlanet({ id, parent: 'sun', unit: 1, epochJd, bodyRadius: HELIO_RADII[id], role: ROLES[id], showFoci: false, saturnRings: 'rings', gravityLink: gravity });
    nodes.push(...built.nodes);
    links.push(...built.links);
    if (built.body) bodies.push(built.body);
  }
  const em = buildKeplerEarthAndMoon({
    parent: 'sun',
    unit: 1,
    epochJd,
    earthRadius: 0.42,
    moonRadius: 0.15,
    moonDisplayScale: 70,
    showFoci: false,
    gravityLink: gravity,
    earthRole: 'Flattened at the poles by its rotation, as Newton predicted, and precessing because the Sun and Moon pull on that equatorial bulge.',
    moonRole: 'Falls toward the Earth by the same force that drops an apple: at 60 Earth radii, 3600 times weaker.',
  });
  nodes.push(...em.nodes);
  bodies.push(...em.bodies);
  links.push(...em.links);
  if (gravity) links.push({ from: 'moon.body', to: 'earth', layer: 'mechanism', style: 'guide', dashed: true, focusBody: 'moon' });
  const jovian = buildSatellites('jupiter', 'jupiter.frame', 1687, HELIO_SCALE, 1, epochJd);
  const saturnian = buildSatellites('saturn', 'saturn.frame', 1687, HELIO_SCALE, 1, epochJd);
  nodes.push(...jovian.nodes, ...saturnian.nodes);
  bodies.push(...jovian.bodies, ...saturnian.bodies);
  for (const id of ['c1680', 'halley'] as const) {
    const spec = COMETS_BY_ID[id];
    const comet = buildComet({
      id,
      name: spec.name,
      parent: 'sun',
      unit: 1,
      elements: spec.elements,
      visibleFrom: spec.visibleFrom,
      visibleTo: spec.visibleTo,
      bodyRadius: 0.2,
      role: spec.note,
    });
    nodes.push(...comet.nodes);
    bodies.push(comet.body);
  }
  return {
    nodes,
    bodies,
    links,
    observerNode: 'earth',
    earthBody: 'earth',
    sunNode: 'sun',
    diurnal: 'earth',
    stars: { displayRadius: 14 * HELIO_SCALE, mode: 'infinite', label: 'Stars: suns scattered through infinite space' },
    centerNode: 'sun',
    cameraDistance: 70,
    unitLabel: 'AU (mean Earth–Sun distance)',
  };
}

export const newton: EraDefinition = {
  id: 'newton',
  figure: 'Isaac Newton',
  title: 'Principia: universal gravitation',
  dates: '1687',
  timelineYear: 1687,
  knowledgeYear: 1687,
  location: { name: 'Cambridge', lat: 52.21, lon: 0.12, reformJd: CALENDAR_REFORM.england },
  epoch: { year: 1687, month: 7, day: 5, hour: 22, minute: 0 },
  defaults: { speed: 15, view: 'cosmos', diurnalLock: false, focus: 'saturn', skyTarget: 'saturn', skyMode: 'horizon' },
  constellations: 'hevelius',
  options: [
    {
      id: 'gravity',
      label: 'Lines of attraction',
      description: 'Draw the pull of the Sun on each planet, and of the Earth on the Moon.',
      choices: [
        { value: 'on', label: 'Show' },
        { value: 'off', label: 'Hide' },
      ],
      default: 'on',
    },
  ],
  events: [
    {
      id: 'comet-1680',
      label: 'The Great Comet, December 1680',
      date: { year: 1680, month: 12, day: 29, hour: 18, minute: 0 },
      description: 'It grazed the Sun and swung back. Newton showed its path was a parabola about the Sun (Principia III, Prop. 41).',
      view: 'cosmos',
      focus: 'c1680',
      speed: 2,
    },
    {
      id: 'halley-1682',
      label: 'Halley’s Comet, September 1682',
      date: { year: 1682, month: 9, day: 5, hour: 20, minute: 30 },
      description: 'Halley later showed it was the comet of 1531 and 1607 on an elongated ellipse, and predicted its return for 1758.',
      view: 'cosmos',
      focus: 'halley',
      speed: 3,
    },
    {
      id: 'principia',
      label: 'Principia published, 5 July 1687',
      date: { year: 1687, month: 7, day: 5, hour: 22, minute: 0 },
      description: 'Philosophiae Naturalis Principia Mathematica: one set of laws for heaven and Earth.',
      view: 'cosmos',
      focus: 'saturn',
    },
  ],
  build: buildNewton,
};
