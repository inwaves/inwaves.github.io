import { CALENDAR_REFORM, localDateToJdTT } from '../../astro/time';
import type { EraDefinition, EraOptionValues } from '../era';
import type { BodyDef, ModelDefinition, NodeDef } from '../types';
import { earthAppearance } from '../shared/appearance';
import { buildEudoxanMoon, buildEudoxanPlanet, buildEudoxanSun } from '../shared/eudoxan';
import type { ClassicalPlanet } from '../shared/phases';

/** Schematic radii, in Plato's order: Moon, Sun, Venus, Mercury, Mars, Jupiter, Saturn. */
export const HOMOCENTRIC_RADII = { moon: 4, sun: 7.5, venus: 11, mercury: 14.5, mars: 18, jupiter: 21.5, saturn: 25, stars: 29 } as const;

const ROLES: Record<ClassicalPlanet, string> = {
  saturn: 'Four spheres: daily, zodiacal (30 years), and a pair turning once per synodic period about axes 6° apart. The pair traces a slender figure-eight.',
  jupiter: 'Twelve years through the zodiac, a 13-month hippopede 13° wide: when the figure-eight runs backward faster than the zodiacal sphere runs forward, Jupiter retrogrades.',
  mars: 'Here the scheme fails. With the synodic period Simplicius reports (8 months 20 days) and any inclination, the hippopede cannot reproduce Mars’s single long retrograde loop every 26 months.',
  venus: 'A hippopede 46° long keeps Venus swinging from side to side of the Sun, but never makes it retrograde.',
  mercury: 'A small, fast hippopede (110 days, 23°) keeps Mercury near the Sun and gives it brief retrograde arcs.',
};

function buildEudoxus(_options: EraOptionValues): ModelDefinition {
  const epochJd = localDateToJdTT(eudoxus.epoch, eudoxus.location.lon, eudoxus.location.reformJd);
  const nodes: NodeDef[] = [{ id: 'earth', parent: null }];
  const bodies: BodyDef[] = [
    {
      id: 'earth',
      name: 'Earth',
      kind: 'earth',
      node: 'earth',
      appearance: earthAppearance(1.2),
      inSky: false,
      role: 'A small sphere at rest at the centre of every sphere.',
    },
  ];
  const moon = buildEudoxanMoon({
    radius: HOMOCENTRIC_RADII.moon,
    bodyRadius: 0.5,
    callippus: false,
    role: 'Three spheres: the daily sphere, one turning slowly backward along the zodiac (the nodes), and one tilted 5° carrying the Moon around each month.',
  });
  const sun = buildEudoxanSun({
    radius: HOMOCENTRIC_RADII.sun,
    bodyRadius: 1.1,
    callippus: false,
    role: 'Three spheres: daily, yearly along the ecliptic, and a third for a small wandering in latitude that Eudoxus believed in. No anomaly: the seasons come out equal, which they are not.',
  });
  nodes.push(...moon.nodes, ...sun.nodes);
  bodies.push(moon.body, sun.body);
  for (const id of ['venus', 'mercury', 'mars', 'jupiter', 'saturn'] as const) {
    const built = buildEudoxanPlanet({ id, radius: HOMOCENTRIC_RADII[id], epochJd, bodyRadius: id === 'jupiter' ? 0.75 : id === 'saturn' ? 0.7 : 0.5, role: ROLES[id] });
    nodes.push(...built.nodes);
    bodies.push(built.body);
  }
  nodes.push({
    id: 'stars',
    parent: 'earth',
    constructs: [{ kind: 'sphere', radius: HOMOCENTRIC_RADII.stars, style: 'stars', layer: 'spheres', graticule: true, label: 'sphere of the fixed stars' }],
  });
  return {
    nodes,
    bodies,
    observerNode: 'earth',
    earthBody: 'earth',
    sunNode: 'sun.body',
    diurnal: 'heavens',
    stars: { displayRadius: HOMOCENTRIC_RADII.stars, mode: 'sphere', label: 'Sphere of the fixed stars' },
    centerNode: 'earth',
    cameraDistance: 62,
    unitLabel: 'schematic units',
  };
}

export const eudoxus: EraDefinition = {
  id: 'eudoxus',
  figure: 'Eudoxus of Cnidus',
  title: 'The two-sphere universe and the homocentric spheres',
  dates: 'c. 370 BCE',
  timelineYear: -369,
  knowledgeYear: -369,
  location: { name: 'Cnidus', lat: 36.69, lon: 27.37, reformJd: CALENDAR_REFORM.italy },
  epoch: { year: -368, month: 2, day: 15, hour: 22, minute: 0 },
  defaults: { speed: 6, view: 'cosmos', diurnalLock: false, focus: 'jupiter', skyTarget: 'jupiter', skyMode: 'horizon', layers: { mechanism: true, spheres: true } },
  constellations: 'ptolemaic',
  options: [],
  events: [
    {
      id: 'jupiter-opposition-369',
      label: 'Jupiter at opposition, February 369 BCE',
      date: { year: -368, month: 2, day: 15, hour: 22, minute: 0 },
      description: 'The hippopede’s backward swing at its fastest: watch Jupiter station and retrograde on its spheres.',
      view: 'sky',
      focus: 'jupiter',
      speed: 5,
    },
    {
      id: 'mars-opposition-370',
      label: 'Mars at opposition, March 370 BCE',
      date: { year: -369, month: 3, day: 7, hour: 22, minute: 0 },
      description: 'Compare the model with the real sky: Eudoxus’s Mars loops three times per synodic period, the real Mars once.',
      view: 'sky',
      focus: 'mars',
      speed: 5,
    },
  ],
  build: buildEudoxus,
};
