import { CALENDAR_REFORM, centuriesSinceJ2000, localDateToJdTT } from '../../astro/time';
import type { EraDefinition, EraOptionValues } from '../era';
import type { BodyDef, ConstructDef, LinkDef, ModelDefinition, NodeDef, SectorDef } from '../types';
import { sunAppearance } from '../shared/appearance';
import { buildKeplerEarthAndMoon, buildKeplerPlanet } from '../shared/keplerian';
import { buildSatellites } from '../shared/satellites';
import { meanElementsJ2000 } from '../../astro/ephemeris/planets';
import type { ClassicalPlanet } from '../shared/phases';
import { HELIO_RADII, HELIO_SCALE } from './copernicus';

const ROLES: Record<ClassicalPlanet, string> = {
  mercury: 'The most eccentric orbit of the six: e = 0.21.',
  venus: 'Almost a circle (e = 0.007).',
  mars: 'The planet that broke the circle. The best circular theory missed Tycho’s observations by eight minutes of arc, far more than their error, and Kepler would not ignore it: the orbit had to be an oval — at last, an ellipse.',
  jupiter: 'Period 11.86 years, distance 5.20: the cube of the distance equals the square of the period.',
  saturn: 'Outermost known planet. In the Mysterium its sphere encloses the cube, which encloses Jupiter’s sphere.',
};

function buildKepler(options: EraOptionValues): ModelDefinition {
  const epochJd = localDateToJdTT(kepler.epoch, kepler.location.lon, kepler.location.reformJd);
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
      role: 'At one focus of every ellipse, and the cause of the motion: a whirling species or force emanating from the Sun that pushes the planets around, weakening with distance.',
    },
  ];
  const links: LinkDef[] = [];
  for (const id of ['mercury', 'venus', 'mars', 'jupiter', 'saturn'] as const) {
    const built = buildKeplerPlanet({ id, parent: 'sun', unit: 1, epochJd, bodyRadius: HELIO_RADII[id], role: ROLES[id], showFoci: true, saturnRings: 'ears' });
    nodes.push(...built.nodes);
    if (built.body) bodies.push(built.body);
  }
  const em = buildKeplerEarthAndMoon({
    parent: 'sun',
    unit: 1,
    epochJd,
    earthRadius: 0.42,
    moonRadius: 0.15,
    moonDisplayScale: 70,
    showFoci: true,
    earthRole: 'A planet on a slightly eccentric ellipse, fastest at perihelion in early January.',
    moonRole: 'Kepler explained the tides by the Moon’s attraction of the waters — an idea Galileo dismissed as occult.',
  });
  nodes.push(...em.nodes);
  bodies.push(...em.bodies);
  const jovian = buildSatellites('jupiter', 'jupiter.frame', 1618, HELIO_SCALE, 1, epochJd);
  nodes.push(...jovian.nodes);
  bodies.push(...jovian.bodies);

  if (options.mysterium === 'on') {
    nodes.push({ id: 'mysterium', parent: 'sun', constructs: mysteriumConstructs(epochJd) });
  }
  nodes.push({
    id: 'stars',
    parent: 'sun',
    constructs: [{ kind: 'sphere', radius: 12, style: 'stars', layer: 'spheres', label: 'the finite sphere of the fixed stars' }],
  });
  const sectors: SectorDef[] = options.areas === 'on' ? [{ center: 'sun', body: 'mars', periodDays: 686.98, count: 12, layer: 'mechanism' }] : [];
  return {
    nodes,
    bodies,
    links,
    sectors,
    observerNode: 'earth',
    earthBody: 'earth',
    sunNode: 'sun',
    diurnal: 'earth',
    stars: { displayRadius: 12 * HELIO_SCALE, mode: 'sphere', label: 'The fixed stars' },
    centerNode: 'sun',
    cameraDistance: 40,
    unitLabel: 'AU (mean Earth–Sun distance)',
  };
}

/**
 * Kepler's Mysterium Cosmographicum (1596): the five regular solids nested between the planetary
 * spheres. Each solid is inscribed in the outer planet's sphere; its inscribed sphere is drawn so
 * the mismatch with the inner planet's real orbit is visible.
 */
export function mysteriumConstructs(epochJd: number): ConstructDef[] {
  const T = centuriesSinceJ2000(epochJd);
  const a = (id: 'mercury' | 'venus' | 'emb' | 'mars' | 'jupiter' | 'saturn') => meanElementsJ2000(id, T).a;
  const out: ConstructDef[] = [];
  const pairs: ['cube' | 'tetrahedron' | 'dodecahedron' | 'icosahedron' | 'octahedron', number, number, string][] = [
    ['cube', a('saturn'), 1 / Math.sqrt(3), 'cube (Saturn – Jupiter)'],
    ['tetrahedron', a('jupiter'), 1 / 3, 'tetrahedron (Jupiter – Mars)'],
    ['dodecahedron', a('mars'), 0.7947, 'dodecahedron (Mars – Earth)'],
    ['icosahedron', a('emb'), 0.7947, 'icosahedron (Earth – Venus)'],
    ['octahedron', a('venus'), 1 / Math.sqrt(3), 'octahedron (Venus – Mercury)'],
  ];
  for (const [solid, outer, ratio, label] of pairs) {
    out.push({ kind: 'polyhedron', solid, circumradius: outer, style: 'solid', layer: 'mechanism', label });
    out.push({ kind: 'sphere', radius: outer, style: 'crystal', layer: 'mechanism' });
    out.push({ kind: 'sphere', radius: outer * ratio, style: 'crystal-strong', layer: 'mechanism' });
  }
  out.push({ kind: 'sphere', radius: a('mercury'), style: 'crystal', layer: 'mechanism' });
  return out;
}

export const kepler: EraDefinition = {
  id: 'kepler',
  figure: 'Johannes Kepler',
  title: 'Ellipses and the harmony of the world',
  dates: '1609–1619',
  timelineYear: 1618,
  knowledgeYear: 1618,
  location: { name: 'Linz', lat: 48.31, lon: 14.29, reformJd: CALENDAR_REFORM.bohemia },
  epoch: { year: 1618, month: 5, day: 15, hour: 21, minute: 0 },
  defaults: { speed: 10, view: 'cosmos', diurnalLock: false, focus: 'mars', skyTarget: 'mars', skyMode: 'horizon' },
  constellations: 'bayer',
  options: [
    {
      id: 'areas',
      label: 'Second law',
      description: 'Wedges swept by Mars in equal times (one twelfth of its year each): all of equal area.',
      choices: [
        { value: 'on', label: 'Equal areas' },
        { value: 'off', label: 'Hide' },
      ],
      default: 'on',
    },
    {
      id: 'mysterium',
      label: 'Mysterium Cosmographicum (1596)',
      description: 'The five Platonic solids nested between the planetary spheres, as young Kepler imagined God’s plan.',
      choices: [
        { value: 'off', label: 'Hide' },
        { value: 'on', label: 'Show solids' },
      ],
      default: 'off',
    },
  ],
  events: [
    {
      id: 'nova-1604',
      label: 'Kepler’s Star, 17 October 1604',
      date: { year: 1604, month: 10, day: 17, hour: 18, minute: 30 },
      location: { name: 'Prague', lat: 50.09, lon: 14.42, reformJd: CALENDAR_REFORM.bohemia },
      description: 'A new star blazed beside Mars, Jupiter and Saturn, gathered in Ophiuchus. Kepler observed it for a year.',
      view: 'sky',
      focus: 'jupiter',
      speed: 0.05,
    },
    {
      id: 'third-law',
      label: 'The third law, 15 May 1618',
      date: { year: 1618, month: 5, day: 15, hour: 21, minute: 0 },
      description: '“On the 8th of March of this year 1618… it appeared in my head. But… rejected as false, it came back on the 15th of May.” (Harmonices Mundi V)',
      view: 'cosmos',
      focus: 'mars',
      speed: 30,
    },
    {
      id: 'mercury-transit-1631',
      label: 'Transit of Mercury, 7 November 1631',
      date: { year: 1631, month: 11, day: 7, hour: 9, minute: 30 },
      location: { name: 'Paris', lat: 48.85, lon: 2.35, reformJd: CALENDAR_REFORM.italy },
      description: 'Predicted by Kepler’s Rudolphine Tables and seen by Gassendi, a year after Kepler’s death: the first transit of a planet ever observed.',
      view: 'sky',
      focus: 'sun',
      speed: 0.01,
    },
  ],
  build: buildKepler,
};
