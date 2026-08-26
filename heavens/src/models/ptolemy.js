import { body, fixed, GEO, GEO_STARS, LEGIBLE_SIZES, EARTH_LOOK, geoPlanet, geoSun, geoMoon, geoCamera } from './common.js';
import { PTOLEMY_R, PTOLEMY_SIZES, PTOLEMY_STARS } from './layouts.js';

/** Ptolemaic layout for a mode; shared with the medieval and Maragha stages. */
export function ptolemaicLayout(mode) {
  const period = mode === 'period';
  return {
    period,
    R: period ? PTOLEMY_R : GEO,
    S: period ? PTOLEMY_SIZES : { ...LEGIBLE_SIZES, earth: 0.5, sun: 0.8 },
    stars: period ? PTOLEMY_STARS : GEO_STARS,
    markerScale: period ? 30 : 1,
  };
}

export const ptolemyBodies = (L, opts = {}) => {
  const { R, S } = L;
  const sz = (id) => ({ size: S[id] });
  return [
    body('earth', { motion: fixed(), size: S.earth, ...EARTH_LOOK }),
    ...geoMoon(R.moon, { epicycle: 0.0875, sphere: opts.spheres, body: sz('moon') }),
    ...geoPlanet('mercury', R.mercury, { crank: true, markerScale: 1.3, sphere: opts.spheres, body: sz('mercury') }),
    ...geoPlanet('venus', R.venus, { eccentric: true, equant: true, sphere: opts.spheres, body: sz('venus') }),
    ...geoSun(R.sun, { eccentric: true, sphere: opts.spheres, body: sz('sun') }),
    ...geoPlanet('mars', R.mars, { eccentric: true, equant: true, markerScale: 1.3, sphere: opts.spheres, body: sz('mars') }),
    ...geoPlanet('jupiter', R.jupiter, { eccentric: true, equant: true, sphere: opts.spheres, body: sz('jupiter') }),
    ...geoPlanet('saturn', R.saturn, { eccentric: true, equant: true, sphere: opts.spheres, body: sz('saturn') }),
  ];
};

function build(mode) {
  const L = ptolemaicLayout(mode);
  return {
    camera: geoCamera(L.stars, L.period ? 0.9 : 1),
    sky: { radius: L.stars, shell: true },
    markerScale: L.markerScale,
    bodies: ptolemyBodies(L, { spheres: true }),
  };
}

export default {
  id: 'ptolemy',
  name: 'Ptolemy',
  year: 150,
  era: 'c. 150 CE',
  place: 'Alexandria \u2014 the Almagest',
  epoch: { year: 150, month: 3, day: 1 },
  defaultSpeed: 3,
  diurnal: 'cosmos',
  build,
  text: {
    tagline: 'The mathematical summit of ancient astronomy: deferents, epicycles, eccentrics, and the equant.',
    picture: [
      'Order: Moon, Mercury, Venus, Sun, Mars, Jupiter, Saturn, fixed stars. Each planet\'s deferent is eccentric, its centre displaced from the Earth; and the epicycle\'s centre moves uniformly not about the Earth, nor about the deferent\'s centre, but about a third point, the <em>equant</em>, displaced by twice the eccentricity. The equant makes the planet move faster near perigee, as observed, at the price of giving up strictly uniform circular motion.',
      'Mercury and Venus: epicycle centres locked to the direction of the mean Sun. Mars, Jupiter and Saturn: epicycle radii always parallel to the Earth\u2013Sun line. Hidden in these couplings is the heliocentric system. Every outer planet\'s epicycle is the Earth\'s orbit in disguise; every inner planet\'s deferent is the Sun\'s.',
      'Ptolemy\'s parameters, with the deferent radius 60: Mars eccentricity 6, epicycle 39;30; Jupiter 2;45 and 11;30; Saturn 3;25 and 6;30; Venus 1;15 and 43;10; Mercury 22;30, with its deferent centre riding a small crank circle so that the planet has two perigees. The model shown uses the equivalent modern ratios (epicycle/deferent = Earth\'s orbit/planet\'s orbit, modern eccentricities bisected between centre and equant), so the visible structure is Ptolemy\'s and the sky it predicts is very nearly the real one: within a fraction of a degree for Jupiter and Saturn, a degree or two for Venus, up to five degrees for Mars at a perihelic opposition, and worse for Mercury. Those residuals are genuine: the uniform epicycle ignores the Sun\'s own inequality, the defect Kepler would finally remove.',
      'In the later <em>Planetary Hypotheses</em> he stacked the mechanisms without gaps to obtain absolute distances (table below); the period layout draws them.',
    ],
    changes: [
      'The equant: the device that finally matched the planets\' varying speeds, and the "monstrosity" that Copernicus set out to abolish.',
      'Tables good enough to be used, with adjustments, for fourteen hundred years; a full theory of planetary latitude; an estimate of the size of the cosmos.',
      'Astronomy and cosmology begin to part: the mathematical devices save the appearances, whether or not solid spheres could really move that way.',
    ],
    lookFor: [
      'Follow Mars with the mechanism on: its epicycle arm stays parallel to the Earth\u2013Sun line, and its deferent\'s centre (white) and equant (magenta) are labelled while it is followed.',
      'Follow the Earth with the mechanism on and look just beside it: the centre of Mercury\'s deferent crawls round a small circle once a year, the crank Ptolemy needed to fit Mercury\'s erratic elongations.',
      'Follow Venus in the view from Earth: it never strays far from the Sun and, lit from the Sun beyond it, never shows a full face. The telescope would make that decisive.',
      'Set the trail frame to Earth and compare with Hipparchus: the loops are now uneven in size and spacing, as in the sky.',
    ],
    table: {
      caption: 'Distances in the Planetary Hypotheses (Earth radii)',
      head: ['Body', 'Least', 'Greatest', 'Radius'],
      rows: [
        ['Moon', '33', '64', '0.29'], ['Mercury', '64', '166', '0.04'], ['Venus', '166', '1,079', '0.3'], ['Sun', '1,160', '1,260', '5.5'],
        ['Mars', '1,260', '8,820', '1.14'], ['Jupiter', '8,820', '14,187', '4.4'], ['Saturn', '14,187', '19,865', '4.3'], ['Fixed stars', '20,000', '', '4.5'],
      ],
    },
    scale: 'The period layout uses Ptolemy\'s own cosmos: each mechanism\'s mean distance from the nesting above (Moon 48, Mercury 115, Venus 622, Sun 1,210, Mars 5,040, Jupiter 11,500, Saturn 17,030 Earth radii), the stars at 20,000, and his sizes for the bodies (Sun 5.5, Jupiter 4.4, Mars 1.14, Moon 0.29, Mercury 0.04 Earth radii). At that scale the Moon\'s whole orbit is a quarter of one per cent of the cosmos: zoom in on the Earth to find it. The legible layout compresses the distances about tenfold at the outer planets and enlarges the bodies.',
    kuhn: 'Chapter 2 (the Ptolemaic system and the equant), Chapter 3 (its place in the Aristotelian cosmos) and Chapter 5 (the "monster" Copernicus complained of).',
  },
};
