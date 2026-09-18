import { CALENDAR_REFORM } from '../../astro/time';
import type { EraDefinition, EraOptionValues } from '../era';
import type { BodyDef, ConstructDef, LinkDef, ModelDefinition, NodeDef, TimeContext } from '../types';
import { earthAppearance } from '../shared/appearance';
import { PLANETARY_HYPOTHESES } from '../shared/almagest';
import { buildEccentricSun, buildPtolemaicMoon, type PtolemaicVariant } from '../shared/ptolemaic';
import { moonMean, planetMean, sunMean, type ClassicalPlanet } from '../shared/phases';
import { almagestPlanets, SCHEMATIC_DEFERENT } from './ptolemy';

/**
 * Mean motions re-fitted to the late Middle Ages, as the Toledan and Alfonsine Tables re-fitted
 * Ptolemy's to their own centuries. The geometry stays Ptolemy's; the parameters come from the
 * real mean motions of the date, so errors reflect the structure of the model, not 1100 years of
 * accumulated drift.
 */
export const MEDIEVAL_TABLES = {
  sunMean: (t: TimeContext) => sunMean(t.jd).L,
  lambda: (id: 'mars' | 'jupiter' | 'saturn', t: TimeContext) => planetMean(id, t.jd).L,
  alpha: (id: ClassicalPlanet, t: TimeContext) => {
    const earth = planetMean('emb', t.jd).L;
    const planet = planetMean(id, t.jd).L;
    return id === 'mercury' || id === 'venus' ? planet - earth + 180 : earth + 180 - planet;
  },
  apogee: (id: ClassicalPlanet, t: TimeContext) => planetMean(id, t.jd).varpi + 180,
};

const HEAVENS: { radius: number; name: string }[] = [
  { radius: SCHEMATIC_DEFERENT.moon, name: 'Heaven of the Moon' },
  { radius: SCHEMATIC_DEFERENT.mercury, name: 'Heaven of Mercury' },
  { radius: SCHEMATIC_DEFERENT.venus, name: 'Heaven of Venus' },
  { radius: SCHEMATIC_DEFERENT.sun, name: 'Heaven of the Sun' },
  { radius: SCHEMATIC_DEFERENT.mars, name: 'Heaven of Mars' },
  { radius: SCHEMATIC_DEFERENT.jupiter, name: 'Heaven of Jupiter' },
  { radius: SCHEMATIC_DEFERENT.saturn, name: 'Heaven of Saturn' },
];

const ROLES = {
  latin: {
    mercury: 'Ptolemy’s crank device, carried within its own thick shell of aether in Peurbach’s Theoricae novae planetarum.',
    venus: 'Epicycle within a channel of its shell. Dante’s third heaven, of the lovers.',
    mars: 'Deferent, epicycle and equant, as in the Almagest. The fifth heaven, of the warriors of the faith.',
    jupiter: 'The sixth heaven, of the just rulers.',
    saturn: 'The seventh heaven, of the contemplatives, the last before the stars.',
  },
  maragha: {
    mercury: 'Ibn al-Shatir replaced every eccentric and equant with uniformly turning circles about their own centres.',
    venus: 'Concentric deferent and small epicyclets in place of the equant — the same device Copernicus would use.',
    mars: 'Two epicyclets of radii 3e/2 and e/2 reproduce the equant’s effect with uniform circular motions only.',
    jupiter: 'Concentric deferent with epicyclets: physical spheres that really can turn uniformly about their centres.',
    saturn: 'Concentric deferent with epicyclets, in the tradition of the Maragha observatory.',
  },
};

function buildMedieval(options: EraOptionValues): ModelDefinition {
  const variant: PtolemaicVariant = options.school === 'maragha' ? 'shatir' : 'equant';
  const elements: ConstructDef[] = [
    { kind: 'sphere', radius: 1.7, style: 'element-water', layer: 'spheres', label: 'water' },
    { kind: 'sphere', radius: 2.9, style: 'element-air', layer: 'spheres', label: 'air' },
    { kind: 'sphere', radius: 4.2, style: 'element-fire', layer: 'spheres', label: 'fire' },
  ];
  const heavens: ConstructDef[] = HEAVENS.map((h) => ({ kind: 'sphere', radius: h.radius, style: 'crystal', layer: 'spheres', cutaway: true, label: h.name }));
  const nodes: NodeDef[] = [
    { id: 'earth', parent: null, constructs: elements },
    {
      id: 'heavens',
      parent: 'earth',
      constructs: [
        ...heavens,
        { kind: 'sphere', radius: SCHEMATIC_DEFERENT.stars - 6, style: 'stars', layer: 'spheres', cutaway: true, label: 'Eighth heaven: the fixed stars' },
        { kind: 'sphere', radius: SCHEMATIC_DEFERENT.stars, style: 'crystal-strong', layer: 'spheres', cutaway: true, label: 'Ninth: the crystalline heaven' },
        { kind: 'sphere', radius: SCHEMATIC_DEFERENT.stars + 5, style: 'primum', layer: 'spheres', cutaway: true, label: 'Primum Mobile' },
        { kind: 'sphere', radius: SCHEMATIC_DEFERENT.stars + 11, style: 'empyrean', layer: 'spheres', cutaway: true, label: 'Empyrean — beyond place and time' },
      ],
    },
  ];
  const bodies: BodyDef[] = [
    {
      id: 'earth',
      name: 'Earth',
      kind: 'earth',
      node: 'earth',
      appearance: earthAppearance(1.3),
      inSky: false,
      role: 'The heavy centre, farthest from God, wrapped in the spheres of water, air and fire. “The Earth is round”, wrote Sacrobosco, as every educated reader knew.',
    },
  ];
  const links: LinkDef[] = [];
  const sun = buildEccentricSun({
    e: 2.1,
    apogee: (t) => sunMean(t.jd).apogee,
    meanLongitude: MEDIEVAL_TABLES.sunMean,
    erPerPart: PLANETARY_HYPOTHESES.sun,
    displayScale: SCHEMATIC_DEFERENT.sun / (60 * PLANETARY_HYPOTHESES.sun),
    bodyRadius: 1.7,
    role: 'On its eccentric. Al-Battani had shown that the solar apogee moves, and the Toledan and Alfonsine Tables let it move.',
  });
  nodes.push(...sun.nodes);
  bodies.push(sun.body);
  const moon = buildPtolemaicMoon({
    variant: 'crank',
    args: (t) => {
      const m = moonMean(t.jd);
      return { lambda: m.L, eta: m.D, alpha: m.Mp + 180, omega: m.F - 90, sunMean: sunMean(t.jd).L };
    },
    erPerPart: PLANETARY_HYPOTHESES.moon,
    displayScale: SCHEMATIC_DEFERENT.moon / (60 * PLANETARY_HYPOTHESES.moon),
    bodyRadius: 0.75,
    role: 'Lowest and most changeable heaven. Dante asks Beatrice what the dark marks on the Moon are; the answer is a lesson in the unequal virtues of the spheres.',
  });
  nodes.push(...moon.nodes);
  bodies.push(moon.body);
  links.push(...moon.links);
  const planets = almagestPlanets(variant, 'schematic', MEDIEVAL_TABLES, ROLES[variant === 'shatir' ? 'maragha' : 'latin']);
  nodes.push(...planets.nodes);
  bodies.push(...planets.bodies);
  links.push(...planets.links);
  return {
    nodes,
    bodies,
    links,
    observerNode: 'earth',
    earthBody: 'earth',
    sunNode: 'sun.body',
    diurnal: 'heavens',
    stars: { displayRadius: SCHEMATIC_DEFERENT.stars - 6, mode: 'sphere', label: 'The eighth heaven' },
    centerNode: 'earth',
    cameraDistance: 120,
    unitLabel: 'Earth radii',
  };
}

export const medieval: EraDefinition = {
  id: 'medieval',
  figure: 'The Medieval Cosmos',
  title: 'Sacrobosco, Dante and the school of Maragha',
  dates: 'c. 1250–1350',
  timelineYear: 1300,
  knowledgeYear: 1300,
  location: { name: 'Florence', lat: 43.77, lon: 11.25, reformJd: CALENDAR_REFORM.italy },
  epoch: { year: 1300, month: 4, day: 10, hour: 5, minute: 0 },
  defaults: { speed: 5, view: 'cosmos', diurnalLock: false, focus: 'venus', skyTarget: 'venus', skyMode: 'horizon', layers: { spheres: true, mechanism: false } },
  constellations: 'ptolemaic',
  options: [
    {
      id: 'school',
      label: 'Planetary models',
      description: 'Ptolemy’s equants as taught in the Latin universities, or Ibn al-Shatir’s equant-free models from Damascus (c. 1350).',
      choices: [
        { value: 'latin', label: 'Latin (Ptolemaic)' },
        { value: 'maragha', label: 'Ibn al-Shatir' },
      ],
      default: 'latin',
    },
  ],
  events: [
    {
      id: 'dante-easter',
      label: 'Easter dawn, 10 April 1300',
      date: { year: 1300, month: 4, day: 10, hour: 5, minute: 0 },
      description: 'Dante leaves the Inferno to see “the lovely planet that urges love” shining in Pisces at dawn. In the real sky of 1300 Venus was an evening star; Dante seems to have used an almanac for 1301.',
      view: 'sky',
      focus: 'venus',
      speed: 0.02,
    },
    {
      id: 'alfonsine',
      label: 'Epoch of the Alfonsine Tables, 1 June 1252',
      date: { year: 1252, month: 6, day: 1, hour: 12, minute: 0 },
      location: { name: 'Toledo', lat: 39.86, lon: -4.03, reformJd: CALENDAR_REFORM.italy },
      description: 'The coronation of Alfonso X of Castile, the radix of the tables that computed planetary positions across Europe for three centuries.',
      view: 'cosmos',
      focus: 'sun',
    },
  ],
  build: buildMedieval,
};
