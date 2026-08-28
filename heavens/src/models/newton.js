import { body, fixed, EARTH_LOOK, helioPlanet, helioMoon, galileanMoons, saturnMoons, SATURN_RING, norm360, LEGIBLE_HELIO } from './common.js';
import { helioPeriodLayout, NEWTON_AU, telescopicSizes } from './layouts.js';
import { helioCamera } from './copernicus.js';
import { HALLEY } from '../data/elements.js';
import { dateToJD, J2000 } from '../engine/time.js';

const halleyPeriT = dateToJD(1682, 9, 15) - J2000;

function build(mode) {
  const L = mode === 'period'
    ? helioPeriodLayout(NEWTON_AU, { sizes: telescopicSizes(NEWTON_AU), stars: 80 * NEWTON_AU })
    : LEGIBLE_HELIO;
  return {
    camera: helioCamera(L, 1.6),
    sky: { radius: L.stars, shell: false, scatter: true },
    markerScale: L.marker,
    extras: {
      toggles: [{ id: 'sweep', label: 'Equal areas in equal times (Mars)', def: false }],
    },
    bodies: [
      body('sun', { motion: fixed(), size: L.size.sun, texture: 'sun', spin: 25.4 }),
      ...helioPlanet('mercury', { style: 'ellipse' }, L),
      ...helioPlanet('venus', { style: 'ellipse' }, L),
      ...helioPlanet('earth', { style: 'ellipse', body: EARTH_LOOK }, L),
      ...helioMoon({ style: 'ellipse', body: { texture: 'moon' } }, L),
      ...helioPlanet('mars', { style: 'ellipse', body: { sweep: { days: 45 } } }, L),
      ...helioPlanet('jupiter', { style: 'ellipse' }, L),
      ...galileanMoons(L),
      ...helioPlanet('saturn', { style: 'ellipse', body: { ring: SATURN_RING } }, L),
      ...saturnMoons(L),
      {
        id: 'halley', kind: 'body', name: "Halley's comet (1682)", color: 0xbfe8ff, size: L.size.moon * 0.5, emissive: true, glow: 0.7, glowScale: 7, parent: 'sun',
        motion: { type: 'ellipse', a: HALLEY.a * L.au, e: HALLEY.e, period: HALLEY.period, peri: HALLEY.peri, incl: HALLEY.i, node: HALLEY.node, M0: norm360((-360 * halleyPeriT) / HALLEY.period) },
        trailEvery: 12, trailMax: 2600, guideOpacity: 0.35,
      },
    ],
  };
}

export default {
  id: 'newton',
  name: 'Newton',
  year: 1687,
  era: '1687',
  place: 'Cambridge \u2014 Philosophiae naturalis principia mathematica',
  epoch: { year: 1687, month: 7, day: 5 },
  defaultSpeed: 3,
  diurnal: 'earth',
  build,
  text: {
    tagline: "One law for the apple and the Moon: Kepler's ellipses explained by universal gravitation.",
    picture: [
      'Every body attracts every other with a force proportional to the product of their masses and inversely to the square of the distance between them. From this single law Kepler\'s three laws follow as theorems; so do the tides, the precession of the equinoxes, the irregularities of the Moon, the flattening of the Earth, and the paths of comets. The comet of 1682, whose return Halley predicted for 1758, is shown on its 76-year ellipse.',
      'The Sun is no longer a privileged centre but simply the greatest mass; strictly, the Sun and planets all move about their common centre of gravity, though the Sun\'s share of that motion (about 0.005 of the Earth\'s distance, mostly owed to Jupiter) is far too small to show at this scale, so the Sun is drawn fixed. The stars are suns scattered through unbounded space, as Digges and Bruno had guessed: the sphere of the fixed stars is gone, and here the stars are given depth.',
      'The post-Galilean discoveries are all present: Jupiter\'s satellites, Saturn\'s ring (Huygens, 1659) and its moon Titan (1655), the cratered Moon and the spotted, rotating Sun.',
    ],
    changes: [
      'The Copernican Revolution completed: from saving the appearances to a physics that <em>explains</em> them, and that unites heaven and Earth under one law.',
      'Space becomes infinite and homogeneous; the universe a machine running by law, with God as its lawgiver and occasional mechanic. Kuhn closes his book here: the new universe replaced not a diagram but a world.',
    ],
    lookFor: [
      'Speed up the clock and watch Halley\'s comet plunge in toward the Sun, whip round perihelion and crawl back out: the same law, an extreme ellipse.',
      'Orbit the camera through the star field: the stars now lie at different depths instead of on a shell.',
      'The geometry of Kepler\'s stage is unchanged. What has changed is that it is now explained.',
    ],
    scale: 'Newton adopted a solar parallax of about 10.5 arcseconds, an Earth\u2013Sun distance near 19,600 Earth radii (Cassini\'s 1672 value was 21,700; the truth is 23,455). The period layout uses it: Saturn at 187,000 Earth radii, a Sun of 91 Earth radii, Jupiter 9, and the satellites of Jupiter and Saturn at their true distances in planet radii. The stars, which Huygens put at tens of thousands of astronomical units for Sirius, are scattered in depth but far closer than that, as no screen could hold them.',
    kuhn: 'Chapter 7, "The New Universe": the corpuscular philosophy, Newton\'s synthesis, and the completed revolution.',
  },
};
