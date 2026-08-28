import { body, fixed, circle, MOON, SUN, ELEMENTS, EARTH_LOOK, DAY_SIDEREAL } from './common.js';

const year = SUN.period;

// The Pythagoreans left no distances; the layout is schematic in both modes.
function build() {
  return {
    camera: { position: [0, 17, 27], target: [0, 0, 0] },
    sky: { radius: 20, shell: true },
    markerScale: 1,
    bodies: [
      { id: 'fire', kind: 'body', name: 'Central Fire (Hestia, hearth of the universe)', color: 0xff7a2a, size: 0.55, emissive: true, light: true, glowScale: 7, motion: fixed() },
      { id: 'antichthon', kind: 'body', name: 'Counter-Earth', color: 0x6b7a8f, size: 0.2, parent: 'fire', motion: circle(1.3, DAY_SIDEREAL, 0), guideOpacity: 0.4 },
      body('earth', { parent: 'fire', motion: circle(2.3, DAY_SIDEREAL, 0), size: 0.3, ...EARTH_LOOK }),
      body('moon', { parent: 'fire', motion: circle(3.6, MOON.synodic, MOON.L0, { incl: 5.1, node: 125 }), size: 0.14 }),
      body('sun', { parent: 'fire', motion: circle(5.5, year, SUN.L0), size: 0.5, light: false, glowScale: 5 }),
      body('venus', { parent: 'fire', motion: circle(7, year, SUN.L0 + 35, { incl: 3.4, node: 76 }) }),
      body('mercury', { parent: 'fire', motion: circle(8.5, year, SUN.L0 - 20, { incl: 7, node: 48 }) }),
      body('mars', { parent: 'fire', motion: circle(10.5, ELEMENTS.mars.period, ELEMENTS.mars.L0, { incl: 1.85, node: 49.6 }) }),
      body('jupiter', { parent: 'fire', motion: circle(13, ELEMENTS.jupiter.period, ELEMENTS.jupiter.L0, { incl: 1.3, node: 100.5 }) }),
      body('saturn', { parent: 'fire', motion: circle(16, ELEMENTS.saturn.period, ELEMENTS.saturn.L0, { incl: 2.5, node: 113.7 }) }),
    ],
  };
}

export default {
  id: 'philolaus',
  name: 'Philolaus and the Pythagoreans',
  shortName: 'Philolaus',
  year: -430,
  era: 'c. 430 BCE',
  place: 'Croton and Thebes',
  epoch: { year: -429, month: 3, day: 27 },
  defaultSpeed: 0.05,
  diurnal: 'none',
  build,
  text: {
    tagline: 'A spherical Earth in motion about a Central Fire, accompanied by a Counter-Earth we can never see.',
    picture: [
      'At the centre burns the Central Fire, the hearth of the universe. Around it revolve ten bodies, the perfect Pythagorean number: the Counter-Earth, the Earth, the Moon, the Sun, the five planets and the sphere of fixed stars.',
      'The Earth circles the Fire once a day, always keeping its inhabited side turned away from it; that revolution, not a rotating sky, is what produces day and night. The Sun is a glassy body that gathers and reflects the light of the Central Fire. The Counter-Earth, always between us and the Fire, hides the Fire from view and helps to explain why lunar eclipses are so frequent.',
      'The arrangement is qualitative. No Pythagorean computed planetary positions from it; the distances and periods here are schematic (Venus and Mercury are simply carried round with the Sun). What mattered to the school was that the distances stood in musical ratios: the harmony of the spheres.',
    ],
    changes: [
      'The Earth is a sphere, and it <em>moves</em>, though not around the Sun.',
      'The centre of the cosmos is not the Earth. Copernicus would later cite Philolaus in his preface as a predecessor who set the Earth in motion.',
      'Number and harmony become the organising principle of the heavens, an idea that runs straight to Kepler.',
    ],
    lookFor: [
      'Follow the Earth and watch the Counter-Earth keep station between it and the Fire.',
      'Notice the two time scales: the Earth completes its daily circuit while the Sun needs a year.',
      'In the view from Earth the Central Fire is never visible: the Counter-Earth is in the way, exactly as intended.',
    ],
    scale: 'No Pythagorean source gives distances or sizes; only the order of the bodies and the claim that their spacing was harmonic survive. The layout is therefore schematic and identical in both modes.',
    kuhn: 'Chapter 1, and again in Chapter 5, where Kuhn notes the Pythagorean precedent that Copernicus invoked for a moving Earth.',
  },
};
