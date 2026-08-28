import { body, fixed, circle, SUN, MOON, EARTH_LOOK, helioPlanet, LEGIBLE_HELIO } from './common.js';
import { helioPeriodLayout, TYCHO_AU, TYCHO_STARS, PTOLEMY_SIZES } from './layouts.js';
import { helioCamera } from './copernicus.js';

function build(mode) {
  const L = mode === 'period'
    ? helioPeriodLayout(TYCHO_AU, { sizes: { ...PTOLEMY_SIZES, sun: 5.2 }, stars: TYCHO_STARS })
    : { ...LEGIBLE_HELIO, stars: 4.2 * 10.5 };
  return {
    camera: helioCamera(L),
    sky: { radius: L.stars, shell: true },
    markerScale: L.marker,
    bodies: [
      body('earth', { motion: fixed(), size: L.size.earth, ...EARTH_LOOK }),
      body('moon', { parent: 'earth', motion: circle(L.moonOrbit, MOON.period, MOON.L0, { incl: MOON.i, node: MOON.node }), size: L.size.moon }),
      body('sun', { parent: 'earth', motion: circle(L.au, SUN.period, SUN.L0, { eccentric: { distance: 0.03584 * L.au, direction: SUN.apogee } }), size: L.size.sun, guideColor: 0xffa040, guideOpacity: 0.8 }),
      ...helioPlanet('mercury', { style: 'copernican' }, L),
      ...helioPlanet('venus', { style: 'copernican' }, L),
      ...helioPlanet('mars', { style: 'copernican', body: { guideOpacity: 0.8 } }, L),
      ...helioPlanet('jupiter', { style: 'copernican' }, L),
      ...helioPlanet('saturn', { style: 'copernican' }, L),
    ],
  };
}

export default {
  id: 'tycho',
  name: 'Tycho Brahe',
  shortName: 'Tycho',
  year: 1588,
  era: '1588',
  place: 'Uraniborg, Hven \u2014 De mundi aetherei recentioribus phaenomenis',
  epoch: { year: 1588, month: 1, day: 1 },
  defaultSpeed: 3,
  diurnal: 'cosmos',
  build,
  text: {
    tagline: 'An immobile Earth, a circling Sun, and every other planet circling the Sun: the compromise system.',
    picture: [
      'The Earth rests at the centre. The Moon and the Sun revolve around it; Mercury, Venus, Mars, Jupiter and Saturn revolve around the moving Sun. For the planets\' directions the scheme is mathematically equivalent to Copernicus\', without a moving Earth and without the stellar parallax that Tycho, the finest observer of the age, could not detect.',
      'The orbit of Mars crosses the orbit of the Sun, so the heavens cannot be filled with solid spheres. Two recent events had already shaken them: the new star of 1572, which appeared and faded in the supposedly unchangeable heavens, and the comet of 1577, which Tycho showed by its lack of parallax to lie far beyond the Moon, sailing through where the spheres should have been.',
      'Tycho\'s universe is small by Copernican standards: the stars lie just beyond Saturn, about 14,000 Earth radii away, much as in the ancient nesting. The planetary circles carry the same eccentrics and epicyclets as Copernicus\'s (the system was worked out in detail by his assistant Longomontanus); the Sun\'s eccentricity is his own 0.0358, about twice the true value, as a bare eccentric requires.',
    ],
    changes: [
      'Observations accurate to about one minute of arc, two dozen years of them: the data from which Kepler would extract the ellipse.',
      'The end of the crystalline spheres, and a cosmos in which orbits are mere paths.',
      'A half-way house that let astronomers use Copernican geometry with a stationary Earth; after the decree of 1616 it became the system of choice for Jesuit astronomers.',
    ],
    lookFor: [
      'The Sun\'s circle (orange) and Mars\' circle (red) intersect: no solid sphere could carry both.',
      'Follow Mars, then set the trail frame to Earth and compare with Copernicus\' stage: as seen from Earth the two systems are identical.',
      'Slow the clock below half a day per second: in Tycho\'s system the whole heaven still turns once a day about the fixed Earth.',
    ],
    scale: 'Tycho took the Sun\'s distance as 1,150 Earth radii and, having found no parallax, set the fixed stars at about 14,000 Earth radii, barely beyond Saturn: the period layout draws exactly that cramped cosmos. He made the Sun 5.2 Earth radii across and the Moon 0.29; his naked-eye estimates of the planets\' sizes were inflated, and Ptolemy\'s are used here.',
    kuhn: 'Chapter 6, "The Assimilation of Copernican Astronomy": Tycho\'s observations, the Tychonic system, and the nova and comet that undermined the spheres.',
  },
};
