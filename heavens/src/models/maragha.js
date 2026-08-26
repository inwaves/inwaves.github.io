import { body, fixed, EARTH_LOOK, geoPlanet, geoSun, geoMoon, geoCamera } from './common.js';
import { ptolemaicLayout } from './ptolemy.js';

function build(mode) {
  const L = ptolemaicLayout(mode);
  const { R, S } = L;
  const sz = (id) => ({ size: S[id] });
  return {
    camera: geoCamera(L.stars, L.period ? 0.9 : 1),
    sky: { radius: L.stars, shell: true },
    markerScale: L.markerScale,
    bodies: [
      body('earth', { motion: fixed(), size: S.earth, ...EARTH_LOOK }),
      ...geoMoon(R.moon, { epicycle: 0.0875, body: sz('moon') }),
      ...geoPlanet('mercury', R.mercury, { maragha: true, body: sz('mercury') }),
      ...geoPlanet('venus', R.venus, { maragha: true, body: sz('venus') }),
      ...geoSun(R.sun, { maragha: true, body: sz('sun') }),
      ...geoPlanet('mars', R.mars, { maragha: true, body: sz('mars') }),
      ...geoPlanet('jupiter', R.jupiter, { maragha: true, body: sz('jupiter') }),
      ...geoPlanet('saturn', R.saturn, { maragha: true, body: sz('saturn') }),
    ],
  };
}

export default {
  id: 'maragha',
  name: 'The Maragha School: al-Tusi and Ibn al-Shatir',
  shortName: 'Ibn al-Shatir',
  year: 1350,
  era: '1260\u20131375',
  place: 'Maragha and Damascus',
  epoch: { year: 1350, month: 1, day: 1 },
  defaultSpeed: 3,
  diurnal: 'cosmos',
  build,
  text: {
    tagline: "Ptolemy's predictions without Ptolemy's equant: little epicycles restore uniform circular motion.",
    picture: [
      'Astronomers of the Islamic world accepted Ptolemy\'s accuracy but rejected the equant as physically absurd: a solid sphere cannot turn uniformly about a point that is not its centre. Nasir al-Din al-Tusi (1201\u20131274) at the Maragha observatory invented the <em>Tusi couple</em>, a pair of circles that turn two rotations into a straight-line oscillation. Ibn al-Shatir of Damascus (c. 1305\u20131375) went further and replaced every eccentric and equant with additional small epicycles, while reproducing Ptolemy\'s results almost exactly.',
      'In the reconstruction shown here each deferent is concentric with the Earth. A first epicyclet of radius 3e/2, pointing steadily toward the apogee, stands in for the eccentric; a second, of radius e/2 and turning twice per revolution, stands in for the equant. On top rides the ordinary epicycle carrying the planet. The Sun is treated the same way, and Mercury and Venus receive a further pair of epicyclets for their own inequality, where Ptolemy had used a crank. Ibn al-Shatir\'s lunar model also removed the absurd variation in the Moon\'s distance that Ptolemy\'s produced.',
      'Copernicus\'s models for the Moon and planets are mathematically identical to Ibn al-Shatir\'s, the only difference being where the centre is put. How the devices reached Poland remains debated.',
    ],
    changes: [
      'Physical consistency becomes a criterion for astronomical models, the "philosophical" objection to Ptolemy that Copernicus would repeat almost word for word.',
      'The epicyclet devices that reappear in <em>De revolutionibus</em>, and so the mathematical continuity between late medieval and Copernican astronomy.',
    ],
    lookFor: [
      'Follow Mars with the mechanism on and zoom in on its epicycle centre: the two small epicyclets at the base of the big epicycle, one steady, one turning at double speed.',
      'Compare the trails with Ptolemy\'s stage, in either frame: the predictions are indistinguishable.',
      'Notice that the Earth is now at the exact centre of every deferent again.',
    ],
    scale: 'Ibn al-Shatir kept the Ptolemaic order and nesting, with somewhat different figures for Mercury and Venus; the period layout uses Ptolemy\'s distances and sizes, which the Maragha astronomers took over essentially unchanged.',
    kuhn: 'Kuhn touches Islamic astronomy only briefly in Chapter 4; this stage fills in the mathematical devices Copernicus inherited, which later scholarship (Kennedy, Roberts, Swerdlow, Saliba) has brought to light.',
  },
};
