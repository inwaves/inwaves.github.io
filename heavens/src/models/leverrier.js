import { body, fixed, EARTH_LOOK, helioPlanet, helioMoon, galileanMoons, saturnMoons, asteroidBodies, SATURN_RING, norm360, LEGIBLE_HELIO } from './common.js';
import { helioPeriodLayout, ENCKE_AU, telescopicSizes } from './layouts.js';
import { helioCamera } from './copernicus.js';
import { HALLEY, ASTEROIDS } from '../data/elements.js';
import { dateToJD, J2000 } from '../engine/time.js';

const halleyPeriT = dateToJD(1682, 9, 15) - J2000;

function build(mode) {
  const L = mode === 'period'
    ? helioPeriodLayout(ENCKE_AU, { sizes: telescopicSizes(ENCKE_AU), stars: 250 * ENCKE_AU })
    : { ...LEGIBLE_HELIO, stars: 400 };
  return {
    camera: helioCamera(L, 4.3),
    sky: { radius: L.stars, shell: false, scatter: true },
    markerScale: L.marker,
    bodies: [
      body('sun', { motion: fixed(), size: L.size.sun, texture: 'sun', spin: 25.4 }),
      ...helioPlanet('mercury', { style: 'ellipse' }, L),
      ...helioPlanet('venus', { style: 'ellipse' }, L),
      ...helioPlanet('earth', { style: 'ellipse', body: EARTH_LOOK }, L),
      ...helioMoon({ style: 'ellipse', body: { texture: 'moon' } }, L),
      ...helioPlanet('mars', { style: 'ellipse' }, L),
      ...asteroidBodies(ASTEROIDS, L),
      ...helioPlanet('jupiter', { style: 'ellipse' }, L),
      ...galileanMoons(L),
      ...helioPlanet('saturn', { style: 'ellipse', body: { ring: SATURN_RING } }, L),
      ...saturnMoons(L),
      ...helioPlanet('uranus', { style: 'ellipse', body: { name: 'Uranus (Herschel, 1781)' } }, L),
      ...helioPlanet('neptune', { style: 'ellipse', body: { name: 'Neptune (Le Verrier and Galle, 1846)' } }, L),
      {
        id: 'halley', kind: 'body', name: "Halley's comet", color: 0xbfe8ff, size: L.size.moon * 0.5, emissive: true, glow: 0.7, glowScale: 7, parent: 'sun',
        motion: { type: 'ellipse', a: HALLEY.a * L.au, e: HALLEY.e, period: HALLEY.period, peri: HALLEY.peri, incl: HALLEY.i, node: HALLEY.node, M0: norm360((-360 * halleyPeriT) / HALLEY.period) },
        trailEvery: 12, trailMax: 2600, guideOpacity: 0.35,
      },
    ],
  };
}

export default {
  id: 'leverrier',
  name: 'The Newtonian Harvest: Herschel to Le Verrier',
  shortName: 'Neptune',
  year: 1846,
  era: '1781\u20131846',
  place: 'Bath, Palermo, K\u00f6nigsberg, Paris and Berlin',
  epoch: { year: 1846, month: 9, day: 23 },
  defaultSpeed: 10,
  diurnal: 'earth',
  build,
  text: {
    tagline: 'Gravitation turned into a tool: planets found by telescope, by arithmetic, and by the failures of other planets to keep to their orbits.',
    picture: [
      'In 1781 William Herschel, sweeping the sky from his garden in Bath, found a slow greenish disc that proved to be a planet beyond Saturn: Uranus, the first new planet in recorded history, doubling the radius of the known system. On New Year\'s night 1801 Giuseppe Piazzi found Ceres in the gap between Mars and Jupiter where Bode\'s rule wanted a planet; Gauss computed its orbit from three observations, and Pallas, Juno and Vesta followed within six years. Then nothing, until Hencke found Astraea in December 1845: in September 1846 these five were the whole of the asteroid belt.',
      'Uranus would not keep to its Newtonian orbit. Adams in Cambridge and Le Verrier in Paris independently worked backward from the discrepancy to the mass and position of an unseen planet; on 23 September 1846 Galle in Berlin found Neptune within a degree of Le Verrier\'s prediction. A planet had been discovered, as Arago said, "with the point of a pen". Halley\'s comet had already returned in 1759 as foretold; Laplace had shown the system stable; the heavens had become a clockwork whose every irregularity was a clue.',
      'The stars, too, acquired distances at last. Transits of Venus (1761, 1769) fixed the astronomical unit at about 23,400 Earth radii, and in 1838 Bessel measured the parallax of 61 Cygni: a third of a second of arc, a distance of some 660,000 astronomical units. The sphere of the fixed stars, already abandoned in theory, was now dissolved by measurement, though no screen can draw the stars to that scale.',
    ],
    changes: [
      'The planetary system becomes open-ended: new members can be found, and their number is an empirical question, not a matter of principle.',
      'Prediction of the unseen from the seen. Neptune is the paradigm case of a theory confirmed by a novel, risky forecast.',
      'Celestial mechanics as a mature science: perturbation theory, orbit determination from few observations (Gauss), the stability of the system (Laplace).',
    ],
    lookFor: [
      'Follow Uranus or Neptune: their slow crawl (84 and 165 years to the circuit) is why Neptune\'s orbit is still only half traversed since its discovery.',
      'Ceres, Pallas, Juno, Vesta and Astraea, tilted and eccentric, between Mars and Jupiter; Pallas climbs 35\u00b0 out of the ecliptic.',
      'Compare with Newton\'s stage: the geometry is the same law, the system twice as wide.',
    ],
    scale: 'In the period layout the astronomical unit is Encke\'s 1835 value from the transits of Venus, 23,400 Earth radii (within a quarter of a per cent of the truth), so the planets\' sizes and distances are essentially modern: Neptune at 700,000 Earth radii, the Sun\'s radius 109 times the Earth\'s, Ceres one fourteenth of the Earth. Bessel\'s stars at 660,000 astronomical units cannot be drawn; they are scattered in depth far closer than that.',
    kuhn: 'Beyond the end of Kuhn\'s narrative. The Copernican Revolution closes with Newton; this stage shows the Newtonian world-view paying its dividends in the following century and a half.',
  },
};
