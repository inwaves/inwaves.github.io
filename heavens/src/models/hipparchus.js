import { body, fixed, GEO, GEO_STARS, LEGIBLE_SIZES, EARTH_LOOK, geoPlanet, geoSun, geoMoon, geoCamera } from './common.js';
import { HIPPARCHUS_R, HIPPARCHUS_SIZES, PTOLEMY_STARS } from './layouts.js';

function build(mode) {
  const period = mode === 'period';
  const R = period ? HIPPARCHUS_R : GEO;
  const S = period ? HIPPARCHUS_SIZES : { ...LEGIBLE_SIZES, earth: 0.5, sun: 0.8 };
  const stars = period ? PTOLEMY_STARS : GEO_STARS;
  const sz = (id) => ({ body: { size: S[id] } });
  return {
    camera: geoCamera(stars, period ? 0.9 : 1),
    sky: { radius: stars, shell: true },
    markerScale: period ? 30 : 1,
    bodies: [
      body('earth', { motion: fixed(), size: S.earth, ...EARTH_LOOK }),
      ...geoMoon(R.moon, { epicycle: 0.0875, ...sz('moon') }),
      ...geoPlanet('mercury', R.mercury, sz('mercury')),
      ...geoPlanet('venus', R.venus, sz('venus')),
      ...geoSun(R.sun, { eccentric: true, ...sz('sun') }),
      ...geoPlanet('mars', R.mars, sz('mars')),
      ...geoPlanet('jupiter', R.jupiter, sz('jupiter')),
      ...geoPlanet('saturn', R.saturn, sz('saturn')),
    ],
  };
}

export default {
  id: 'hipparchus',
  name: 'Apollonius and Hipparchus',
  shortName: 'Hipparchus',
  year: -150,
  era: 'c. 200\u2013130 BCE',
  place: 'Perge, Alexandria and Rhodes',
  epoch: { year: -139, month: 1, day: 1 },
  defaultSpeed: 3,
  diurnal: 'cosmos',
  build,
  text: {
    tagline: 'Circles upon circles: the epicycle and the eccentric replace nests of spheres.',
    picture: [
      'Each planet rides a small circle, the <em>epicycle</em>, whose centre rides a large circle, the <em>deferent</em>, about the Earth. When the planet is on the inner side of its epicycle its backward motion outruns the deferent\'s forward motion: the planet retrogrades, and, being nearer, it is brighter. One device answers both of the questions Eudoxus could not.',
      'Apollonius of Perge (c. 200 BCE) proved that an eccentric circle and an epicycle produce identical appearances. Hipparchus used an eccentric for the Sun, with the Earth displaced from the centre by 1/24 of the radius and the apogee in Gemini, to account for the unequal seasons, and an epicycle for the Moon. He also discovered the precession of the equinoxes and compiled the first great star catalogue; but, Ptolemy tells us, he left the planets unfinished, having found the available observations inadequate.',
      'The planets here use the simplest epicyclic theory, the one Hipparchus knew: concentric deferents and strictly uniform motions. Its retrograde loops are all the same size and evenly spaced around the zodiac, which the real planets do not oblige with, and for Mars it can be tens of degrees wrong.',
    ],
    changes: [
      'Quantitative, predictive geometry replaces the qualitative spheres. Periods and radii become parameters to be fitted to observation.',
      'The Earth is no longer exactly at the centre of every motion (the eccentric): a first, small, crack in strict geocentrism.',
      'The whole apparatus that Ptolemy would inherit, refine and make canonical.',
    ],
    lookFor: [
      'Follow the Sun with the mechanism on: its circle is visibly off-centre (white mark: its centre), and it moves faster near perigee.',
      'Set the trail frame to Earth: the planets draw perfectly regular, identical loops.',
      'The Moon\'s epicycle is small (5;15 parts in 60) but real: follow the Moon to see it.',
    ],
    scale: 'Hipparchus measured the Moon at 59 to 67 Earth radii (shown at 62) and, from the Sun\'s lack of visible parallax, placed it at least 490 and probably about 2,490 Earth radii away, making it some 12 Earth radii across. He gave no planetary distances; in the period layout the planets keep the spacing Ptolemy later derived, the Moon and Sun his own figures, and the stars lie at 20,000 Earth radii.',
    kuhn: 'Chapter 2: epicycles and deferents, the eccentric, and Hipparchus as the founder of quantitative planetary astronomy.',
  },
};
