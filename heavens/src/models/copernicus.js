import { body, fixed, EARTH_LOOK, helioPlanet, helioMoon, LEGIBLE_HELIO } from './common.js';
import { helioPeriodLayout, COPERNICUS_A, COPERNICUS_AU, PTOLEMY_SIZES } from './layouts.js';

export const helioCamera = (L, k = 1) => ({ position: [0, L.au * 8.6 * k, L.au * 14.3 * k], target: [0, 0, 0] });

function build(mode) {
  const L = mode === 'period'
    ? helioPeriodLayout(COPERNICUS_AU, { a: COPERNICUS_A, sizes: { ...PTOLEMY_SIZES, sun: 5.45 } })
    : LEGIBLE_HELIO;
  return {
    camera: helioCamera(L),
    sky: { radius: L.stars, shell: true },
    markerScale: L.marker,
    bodies: [
      body('sun', { motion: fixed(), size: L.size.sun }),
      ...helioPlanet('mercury', { style: 'copernican' }, L),
      ...helioPlanet('venus', { style: 'copernican' }, L),
      ...helioPlanet('earth', { style: 'eccentric', body: EARTH_LOOK }, L),
      ...helioMoon({ style: 'epicycle' }, L),
      ...helioPlanet('mars', { style: 'copernican' }, L),
      ...helioPlanet('jupiter', { style: 'copernican' }, L),
      ...helioPlanet('saturn', { style: 'copernican' }, L),
    ],
  };
}

export default {
  id: 'copernicus',
  name: 'Copernicus',
  year: 1543,
  era: '1543',
  place: 'Frombork \u2014 De revolutionibus orbium coelestium',
  epoch: { year: 1543, month: 5, day: 24 },
  defaultSpeed: 3,
  diurnal: 'earth',
  build,
  text: {
    tagline: 'The Sun stands still and the Earth becomes a planet; yet the circles remain.',
    picture: [
      'Order and distances now follow from the model itself: Mercury (0.38 of the Earth\'s distance), Venus (0.72), the Earth with its Moon (1), Mars (1.52), Jupiter (5.2), Saturn (9.2); the period lengthens with distance; the sphere of the fixed stars is immensely far (hence no visible parallax) but still a sphere.',
      'Retrograde motion is explained at a stroke: it is the Earth overtaking a slower outer planet, or being overtaken by a faster inner one. The bounded elongations of Mercury and Venus follow from their orbits lying inside ours. The locked epicycles of Ptolemy vanish, because the "Sun\'s mean motion" they all contained is just the Earth\'s own.',
      'But the orbits are still circles. The true centre is the centre of the Earth\'s orbit (the mean Sun), not the Sun itself; and to avoid the equant Copernicus keeps a small epicyclet on each eccentric circle, Ibn al-Shatir\'s device, for about thirty-four circles in all. They are drawn here: zoom in on any planet. The Earth itself rides a plain eccentric whose eccentricity (1/31) is about twice the true value, the only way a bare eccentric can match the Sun\'s unequal motion; the distances it implies are then wrong, and Mars near opposition can be a degree or two out of place. The Earth\'s motion has no physics yet: why does a heavy body move, why is there no wind, what keeps the Moon with us?',
    ],
    changes: [
      'A different centre with the same mathematics. Kuhn\'s point: Copernicus\' innovation is conservative in method and revolutionary only in consequence.',
      'Planetary order and relative distances become determinate for the first time; the system\'s harmony (<em>commensurabilitas</em>) is its principal argument, since it is no more accurate than Ptolemy.',
      'The sphere of the stars must be vastly enlarged to hide the Earth\'s motion, the first step toward an unbounded universe.',
    ],
    lookFor: [
      'Set the trail frame to Earth: the geocentric loops reappear exactly as in Ptolemy. Set it back to the centre and they dissolve into simple circles.',
      'Follow Mars and watch the Earth catch it up at opposition, when Mars appears to reverse.',
      'Zoom in on Mars or Saturn with the mechanism on to see the Copernican epicyclet: the equant by another name.',
    ],
    scale: 'Copernicus\' relative distances are his own (Mercury 0.376, Venus 0.719, Mars 1.520, Jupiter 5.219, Saturn 9.174 in units of the Earth\'s), and in the period layout his absolute scale too: an Earth\u2013Sun distance of 1,142 Earth radii, inherited from Ptolemy, so that Saturn lies at about 10,500 Earth radii. The Moon is at 60 Earth radii; bodies keep Ptolemy\'s sizes, the Sun 5.45 Earth radii. For the stars Copernicus gave no figure, only "immense"; they are drawn at four times Saturn\'s distance, which understates him.',
    kuhn: 'Chapter 5, "Copernicus\' Innovation": the preface, the harmony argument, and the surprising conservatism of the <em>De revolutionibus</em>.',
  },
};
