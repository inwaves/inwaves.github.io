import { body, fixed, EARTH_LOOK, helioPlanet, helioMoon, galileanMoons, saturnMoons, belt, SATURN_RING, norm360, LEGIBLE_HELIO } from './common.js';
import { helioPeriodLayout, TRUE_AU_ER, telescopicSizes } from './layouts.js';
import { helioCamera } from './copernicus.js';
import { HALLEY } from '../data/elements.js';
import { dateToJD, J2000 } from '../engine/time.js';

const halleyPeriT = dateToJD(1986, 2, 9) - J2000;

function build(mode) {
  const L = mode === 'period'
    ? helioPeriodLayout(TRUE_AU_ER, { sizes: telescopicSizes(TRUE_AU_ER), stars: 250 * TRUE_AU_ER })
    : { ...LEGIBLE_HELIO, stars: 600 };
  return {
    camera: helioCamera(L, 6.5),
    sky: { radius: L.stars, shell: false, scatter: true },
    markerScale: L.marker,
    bodies: [
      body('sun', { motion: fixed(), size: L.size.sun, texture: 'sun', spin: 25.4 }),
      ...helioPlanet('mercury', { style: 'ellipse' }, L),
      ...helioPlanet('venus', { style: 'ellipse' }, L),
      ...helioPlanet('earth', { style: 'ellipse', body: EARTH_LOOK }, L),
      ...helioMoon({ style: 'ellipse', body: { texture: 'moon' } }, L),
      ...helioPlanet('mars', { style: 'ellipse' }, L),
      belt('asteroids', { name: 'main asteroid belt', aMin: 2.1, aMax: 3.3, eMax: 0.25, iMax: 20, count: 350, color: 0xb8b0a0, size: 2, seed: 11 }, L),
      ...helioPlanet('jupiter', { style: 'ellipse' }, L),
      ...galileanMoons(L),
      ...helioPlanet('saturn', { style: 'ellipse', body: { ring: SATURN_RING } }, L),
      ...saturnMoons(L),
      ...helioPlanet('uranus', { style: 'ellipse' }, L),
      ...helioPlanet('neptune', { style: 'ellipse' }, L),
      belt('kuiper', { name: 'Kuiper belt', aMin: 37, aMax: 48, eMax: 0.15, iMax: 25, count: 450, color: 0x9fb8d8, size: 2, seed: 23 }, L),
      ...helioPlanet('pluto', { style: 'ellipse', body: { name: 'Pluto (dwarf planet, 1930)' } }, L),
      ...helioPlanet('eris', { style: 'ellipse', body: { name: 'Eris (dwarf planet, 2005)' } }, L),
      {
        id: 'halley', kind: 'body', name: "Halley's comet (1986, next 2061)", color: 0xbfe8ff, size: L.size.moon * 0.5, emissive: true, glow: 0.7, glowScale: 7, parent: 'sun',
        motion: { type: 'ellipse', a: HALLEY.a * L.au, e: HALLEY.e, period: HALLEY.period, peri: HALLEY.peri, incl: HALLEY.i, node: HALLEY.node, M0: norm360((-360 * halleyPeriT) / HALLEY.period) },
        trailEvery: 12, trailMax: 2600, guideOpacity: 0.35,
      },
    ],
  };
}

export default {
  id: 'today',
  name: 'The Solar System Today',
  shortName: 'Today',
  year: 2026,
  era: 'Today',
  place: 'Everywhere \u2014 the sky tonight',
  epoch: 'now',
  startPaused: true,
  defaultSpeed: 1,
  diurnal: 'earth',
  build,
  text: {
    tagline: 'Eight planets, a belt of rubble, a ring of ice worlds, and a Sun that is one star among hundreds of billions.',
    picture: [
      'The clock starts at today\'s date, so this is the sky tonight to within a degree or so (the model runs on mean orbital elements; modern ephemerides integrate the planets\' mutual perturbations numerically). Eight planets circle the Sun on Kepler\'s ellipses. Between Mars and Jupiter lie hundreds of thousands of asteroids, a few hundred of which are drawn; beyond Neptune the Kuiper belt (first member found 1992), with Pluto, found by Tombaugh in 1930 and reclassified as a dwarf planet in 2006 once Eris and its kin showed it to be one of a population. Far beyond, undrawable, the Oort cloud of comets reaches halfway to the nearest star; Halley\'s comet, last here in 1986, returns in 2061.',
      'Gravitation itself was revised. The perihelion of Mercury advances 43 arcseconds a century more than Newton allows, explained in 1915 by Einstein\'s general relativity, which replaced force with the curvature of spacetime; the 1919 eclipse measurements of starlight bent by the Sun made it famous. For the motions shown here the difference is invisible, but the foundation is no longer Newton\'s.',
      'The last step in the Copernican demotion: the Sun is an ordinary star about 26,000 light-years from the centre of a galaxy of a few hundred billion (Shapley, 1918), one galaxy among some two trillion (Hubble, 1924) in a universe that has been expanding for 13.8 billion years (Hubble and Lema\u00eetre, 1927\u20131929). Since 1995 thousands of planets have been found around other stars; spacecraft have visited every planet, and New Horizons passed Pluto in 2015. Of Anaximander\'s cosmos only the question survives: by what ordered motions are the appearances to be saved?',
    ],
    changes: [
      'The solar system becomes a small, knowable neighbourhood rather than the universe; its boundary (Kuiper belt, Oort cloud) is a matter of population statistics.',
      'The classification of its members is a decision, not a discovery: "planet" acquired a definition in 2006.',
      'The centre of the universe is nowhere, and every vantage point is as good as any other: the Copernican principle in its final form.',
    ],
    lookFor: [
      'The clock opens paused at today\'s date, so the top bar shows the sky tonight; press Play to let it run, and Epoch to return to now. Switch to the view from Earth, point at Mars or Jupiter, and compare with the real evening sky.',
      'Follow Pluto: its orbit is tilted 17\u00b0 and so eccentric that it spends twenty years of each circuit inside Neptune\'s; Eris, tilted 44\u00b0, is near aphelion at almost 100 astronomical units.',
      'Speed the clock to a year per second and watch the belts churn while Neptune barely moves.',
    ],
    scale: 'The period layout is simply the truth: one astronomical unit of 23,455 Earth radii, the Sun\'s radius 109 times the Earth\'s, Jupiter\'s 11, Neptune at 705,000 Earth radii, Eris reaching 2.3 million. The nearest star, at 270,000 astronomical units, would lie more than six billion Earth radii away, and the stars are therefore scattered in depth only schematically.',
    kuhn: 'Beyond Kuhn\'s book, whose final chapter already looks ahead to "the new universe" of an infinite space populated by suns. This stage completes that thought with what has been learned since.',
  },
};
