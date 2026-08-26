import { fixed, circle } from './common.js';

// Anaximander's proportions are simple enough to draw exactly in both layouts:
// Earth diameter 1, stars at 9, Moon at 18, Sun at 27; the Sun the size of the Earth.
function build() {
  return {
    camera: { position: [0, 24, 62], target: [0, 0, 0] },
    sky: { radius: 9, shell: false, wheels: true },
    markerScale: 1,
    bodies: [
      { id: 'earth', kind: 'body', name: 'Earth (a stone drum)', shape: 'cylinder', size: 0.5, height: 0.33, color: 0x7a6a55, motion: fixed() },
      {
        id: 'sun', kind: 'body', name: 'Sun: a breathing-hole in a wheel of fire', color: 0xffc847, size: 0.5, emissive: true, light: true, glowScale: 5,
        parent: 'earth', motion: circle(27, 1.0, 0, { incl: 23.4, node: 0 }), torus: { tube: 0.35, color: 0xff8a3a, opacity: 0.35 }, trail: false,
      },
      {
        id: 'moon', kind: 'body', name: 'Moon: aperture in a dimmer wheel', color: 0xdfe4ee, size: 0.35, emissive: true, glow: 0.5,
        parent: 'earth', motion: circle(18, 1.035, 120, { incl: 28.5, node: 40 }), torus: { tube: 0.28, color: 0xff8a3a, opacity: 0.3 }, trail: false,
      },
    ],
  };
}

export default {
  id: 'anaximander',
  name: 'Anaximander',
  year: -560,
  era: 'c. 560 BCE',
  place: 'Miletus, Ionia',
  epoch: { year: -559, month: 6, day: 21 },
  defaultSpeed: 0.02,
  diurnal: 'stars',
  build,
  text: {
    tagline: 'A drum-shaped Earth hangs unsupported at the centre of great wheels of fire.',
    picture: [
      'The Earth is a short cylinder, three times as wide as it is deep, and we live on its flat upper face. It does not rest on water (Thales) or on air; it stays where it is because it is equally distant from everything and has no more reason to move one way than another. This is the first recorded appeal to symmetry as a physical explanation.',
      'The Sun, Moon and stars are not bodies at all. They are breathing-holes in hoops of compressed air filled with fire, which wheel around the Earth once a day. Eclipses and lunar phases occur when an aperture is partly stopped up. The Sun\'s wheel lies 27 Earth-diameters away, the Moon\'s 18, and the stars, strangely to modern eyes, nearest of all at 9.',
      'There is no sphere of fixed stars, no spherical Earth, and the five planets are not yet singled out as a separate problem. The scene shows the stars on a shell at the innermost distance, threaded by a few of the fire-wheels that were supposed to carry them.',
    ],
    changes: [
      'The first cosmos that is a <em>mechanism</em>: celestial events explained by matter and geometry rather than by the moods of gods.',
      'The Earth floats free at the centre with nothing to hold it up, an idea so bold that Aristotle still thought it worth refuting two centuries later.',
      'Distances are assigned in simple numerical ratios (9 : 18 : 27), an early instance of the Greek taste for mathematical order in the heavens.',
    ],
    lookFor: [
      'The clock is slowed right down: the wheels turn once a day. Speed it up and the Sun becomes a blur, as it should.',
      'Switch to the view from Earth and watch the Sun-aperture climb, cross the sky and set.',
      'Nothing here accounts for the Sun\'s yearly drift through the zodiac or for the planets: those problems await the two-sphere universe.',
    ],
    scale: 'Drawn to Anaximander\'s own proportions in both layouts: an Earth one unit across and a third as deep, the stars at 9, the Moon at 18 and the Sun at 27 Earth-diameters, the Sun itself the size of the Earth (Hippolytus, Refutation I.6; Aetius).',
    kuhn: 'Chapter 1, "The Ancient Two-Sphere Universe": Kuhn cites Anaximander\'s drum-shaped Earth and fire-wheels among the pre-scientific cosmologies the Greeks left behind.',
  },
};
