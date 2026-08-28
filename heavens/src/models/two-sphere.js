import { body, fixed, circle, MOON, SUN, EARTH_LOOK, geoCamera } from './common.js';
import { ARISTARCHUS, PTOLEMY_STARS } from './layouts.js';

function build(mode) {
  const period = mode === 'period';
  const stars = period ? PTOLEMY_STARS : 20;
  const L = period
    ? { earth: 1, moonR: ARISTARCHUS.moon, moonSize: ARISTARCHUS.moonSize, sunR: ARISTARCHUS.sun, sunSize: ARISTARCHUS.sunSize }
    : { earth: 0.5, moonR: 5.5, moonSize: 0.22, sunR: 13, sunSize: 0.7 };
  const wanderer = (id) => body(id, {
    parent: 'earth', size: period ? 40 : 0.13, emissive: true, glow: 0.55, glowScale: 5,
    motion: { type: 'apparent', of: id, radius: stars * 0.985 },
    trailMax: 2400,
  });
  return {
    camera: geoCamera(stars, period ? 1 : 1),
    sky: { radius: stars, shell: true },
    markerScale: period ? 30 : 1,
    bodies: [
      body('earth', { motion: fixed(), size: L.earth, ...EARTH_LOOK }),
      body('sun', { parent: 'earth', motion: circle(L.sunR, SUN.period, SUN.L0), size: L.sunSize }),
      body('moon', { parent: 'earth', motion: circle(L.moonR, MOON.period, MOON.L0, { incl: MOON.i, node: MOON.node }), size: L.moonSize }),
      wanderer('mercury'),
      wanderer('venus'),
      wanderer('mars'),
      wanderer('jupiter'),
      wanderer('saturn'),
    ],
  };
}

export default {
  id: 'two-sphere',
  name: 'The Two-Sphere Universe',
  shortName: 'Two spheres',
  year: -380,
  era: 'c. 380 BCE',
  place: "Plato's Academy, Athens",
  epoch: { year: -379, month: 1, day: 1 },
  defaultSpeed: 0.1,
  diurnal: 'cosmos',
  build,
  text: {
    tagline: 'A small, motionless, spherical Earth inside an immense rotating sphere of stars; and seven wanderers no one can yet explain.',
    picture: [
      'Two spheres. The Earth, tiny and at rest at the centre. The sphere of the fixed stars, turning westward once a day about the celestial poles and carrying every star with it without disturbing a single constellation. Between them the Sun, which shares the daily turn but also creeps eastward along the ecliptic once a year, and the Moon, eastward once a month along a path close to the Sun\'s.',
      'The five planets also drift eastward through the zodiac, but irregularly: they slow, stop, loop backward for weeks (retrogression), then resume, and they brighten as they do so. Nothing in the two-sphere picture says how far away they are. Here they are shown where the Greeks had to leave them: as points of light on the stellar sphere, moving exactly as the real planets move against the stars.',
      'Plato\'s challenge to his students, as Simplicius reports it: by the assumption of what uniform and ordered motions can the apparent motions of the planets be saved?',
    ],
    changes: [
      'A spherical Earth and a spherical heaven: the framework that explained the daily motions of stars, Sun and Moon so well, and so simply, that it lasted two thousand years.',
      'A precisely posed research problem, <em>the problem of the planets</em>, together with the rule for solving it: compound uniform circular motions.',
      'Astronomy becomes a mathematical science with a clear agenda, rather than a collection of observations and myths.',
    ],
    lookFor: [
      'The clock starts slow: the sphere of stars turns once a day, carrying Sun, Moon and wanderers with it. Speed the clock past half a day per second and the sky is shown at the same sidereal time each day, so the slow eastward drift of the wanderers stands out.',
      'Switch to the view from Earth and turn the trails on: Mars, Jupiter and Saturn draw the retrograde loops that every later model exists to explain. Mercury and Venus swing back and forth about the Sun.',
      'Because this model gives the planets no depth, they sit on the stellar sphere. Their loops are real, but their distances are unknown.',
    ],
    scale: 'Plato\'s contemporaries had no measured distances. The period layout uses the first Greek estimates, Aristarchus\' of c. 270 BCE: the Moon about 20 Earth radii away and 0.36 Earth radii in size, the Sun nineteen times farther (380 Earth radii) and 6.75 Earth radii across, and the stars at 20,000 Earth radii, far enough that the Earth is "as a point" (Aristotle, Ptolemy). The planets, of unknown distance, sit on the sphere in both layouts.',
    kuhn: 'Chapters 1 and 2: the two-sphere universe as the conceptual scheme of Greek astronomy, and the problem of the planets that it left unsolved.',
  },
};
