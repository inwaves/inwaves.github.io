import { body, fixed, circle, MOON, SUN, PLATO, PLATO_STARS, LEGIBLE_SIZES, EARTH_LOOK, eudoxusPlanet, geoCamera } from './common.js';
import { TIMAEUS_R, TIMAEUS_STARS, EUDOXUS_SIZES } from './layouts.js';

export const EUDOXAN_TILTS = { venus: 46, mercury: 23, mars: 34, jupiter: 13, saturn: 6 };

/** Eudoxan spheres in either layout; shared with Aristotle. */
export function eudoxanSystem(mode) {
  const period = mode === 'period';
  const R = period ? TIMAEUS_R : PLATO;
  const S = period ? EUDOXUS_SIZES : { ...LEGIBLE_SIZES, earth: 0.45, moon: 0.16, sun: 0.55 };
  const stars = period ? TIMAEUS_STARS : PLATO_STARS;
  const bodies = [
    body('earth', { motion: fixed(), size: S.earth, ...EARTH_LOOK }),
    body('moon', { parent: 'earth', motion: circle(R.moon, MOON.period, MOON.L0, { incl: MOON.i, node: MOON.node }), sphere: true, sphereRadius: R.moon, size: S.moon }),
    body('sun', { parent: 'earth', motion: circle(R.sun, SUN.period, SUN.L0), sphere: true, sphereRadius: R.sun, size: S.sun }),
    ...['venus', 'mercury', 'mars', 'jupiter', 'saturn'].map((id) => eudoxusPlanet(id, R[id], EUDOXAN_TILTS[id], { sphere: true, body: { size: S[id] } })),
  ];
  return { bodies, stars, earthSize: S.earth, camera: geoCamera(stars, period ? 0.9 : 1), markerScale: period ? 3 : 1 };
}

function build(mode) {
  const s = eudoxanSystem(mode);
  return { camera: s.camera, sky: { radius: s.stars, shell: true }, markerScale: s.markerScale, bodies: s.bodies };
}

export default {
  id: 'eudoxus',
  name: 'Eudoxus of Cnidus',
  shortName: 'Eudoxus',
  year: -365,
  era: 'c. 365 BCE',
  place: 'Cnidus and Athens',
  epoch: { year: -364, month: 1, day: 1 },
  defaultSpeed: 3,
  diurnal: 'cosmos',
  build,
  text: {
    tagline: 'Every wanderer is carried by a nest of concentric spheres, each turning uniformly about its own axis.',
    picture: [
      'Twenty-seven spheres, all centred on the Earth. The Sun and Moon have three each (daily rotation, zodiacal motion, a small deviation in latitude). Each planet has four. The outer two reproduce the daily turn and the slow eastward march through the zodiac. The inner two spin at equal and opposite rates about axes inclined to each other by a small angle, so that the planet traces a figure-of-eight, the <em>hippopede</em> ("horse-fetter"). Superimposed on the zodiacal drift, the backward half of the figure produces stations and retrogressions.',
      'Everything is uniform circular motion about the centre of the universe: Plato\'s demand is met in full. The inner pair turns once per synodic period; the tilt between their axes fixes the width of the loop. The angles used here follow Schiaparelli\'s reconstruction: Saturn 6\u00b0, Jupiter 13\u00b0, Mars 34\u00b0, Venus 46\u00b0, Mercury 23\u00b0.',
      'The scheme has famous failures. A homocentric planet stays at the same distance, so it cannot change in brightness. For Mars and Venus the hippopede is too slow relative to the zodiacal motion to turn the planet backward at all, so their retrogressions cannot be produced with the correct periods. Callippus soon added seven more spheres to patch the Sun and Moon.',
    ],
    changes: [
      'The first genuinely mathematical planetary theory, and the first demonstration that a complicated apparent motion can be analysed into a compound of simple ones.',
      'Spheres rather than rings or wheels: a device that Aristotle would make physical and that would dominate cosmology until Tycho.',
    ],
    lookFor: [
      'Turn the trails off and look at the figure-of-eight guide attached to Jupiter or Saturn; then turn the trails on and watch the loops form as the figure drifts along the zodiac.',
      'Compare Mars: its figure is enormous but its path never actually turns back. Eudoxus\' Mars was the weak point everyone noticed.',
      'Toggle the crystalline spheres to see the concentric shells that carry each body.',
    ],
    scale: 'Homocentric spheres fix the order of the bodies but not their distances. The period layout uses the proportions Plato gives the seven circles in the Timaeus (1 : 2 : 3 : 4 : 8 : 9 : 27 for Moon, Sun, Venus, Mercury, Mars, Jupiter, Saturn), anchored to Aristarchus\' lunar distance of 20 Earth radii, with the Sun nine times the Moon\'s diameter as Eudoxus held (Archimedes, Sand-Reckoner) and the planets, whose sizes no one estimated, drawn small.',
    kuhn: 'Chapter 2, "The Problem of the Planets": homocentric spheres as the first solution, admired for its ingenuity but never quantitatively adequate.',
  },
};
