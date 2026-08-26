import { body, fixed, ELEMENTS, EARTH_LOOK, helioPlanet, helioMoon, LEGIBLE_HELIO } from './common.js';
import { helioPeriodLayout, KEPLER_AU, telescopicSizes } from './layouts.js';
import { helioCamera } from './copernicus.js';

const thirdLawRow = (id) => {
  const el = ELEMENTS[id];
  const P = el.period / 365.25;
  return [el.name, el.a.toFixed(3), P.toFixed(3), ((P * P) / (el.a ** 3)).toFixed(3)];
};

function build(mode) {
  const L = mode === 'period' ? helioPeriodLayout(KEPLER_AU, { sizes: telescopicSizes(KEPLER_AU) }) : LEGIBLE_HELIO;
  const a = (id) => ELEMENTS[id].a * L.au;
  return {
    camera: helioCamera(L),
    sky: { radius: L.stars, shell: true },
    markerScale: L.marker,
    extras: {
      toggles: [
        { id: 'solids', label: "Kepler's nested regular solids (1596)", hint: 'Each solid is inscribed in the sphere of the planet outside it; the sphere within should touch its faces.', def: false },
        { id: 'sweep', label: 'Equal areas in equal times (Mars)', hint: 'Two sectors of the same duration, half an orbit apart.', def: true },
      ],
      solids: [
        { type: 'cube', radius: a('saturn'), label: 'cube: Saturn \u2192 Jupiter' },
        { type: 'tetrahedron', radius: a('jupiter'), label: 'tetrahedron: Jupiter \u2192 Mars' },
        { type: 'dodecahedron', radius: a('mars'), label: 'dodecahedron: Mars \u2192 Earth' },
        { type: 'icosahedron', radius: a('earth'), label: 'icosahedron: Earth \u2192 Venus' },
        { type: 'octahedron', radius: a('venus'), label: 'octahedron: Venus \u2192 Mercury' },
      ],
    },
    bodies: [
      body('sun', { motion: fixed(), size: L.size.sun }),
      ...helioPlanet('mercury', { style: 'ellipse' }, L),
      ...helioPlanet('venus', { style: 'ellipse' }, L),
      ...helioPlanet('earth', { style: 'ellipse', body: EARTH_LOOK }, L),
      ...helioMoon({ style: 'ellipse' }, L),
      ...helioPlanet('mars', { style: 'ellipse', body: { sweep: { days: 45 } } }, L),
      ...helioPlanet('jupiter', { style: 'ellipse' }, L),
      ...helioPlanet('saturn', { style: 'ellipse' }, L),
    ],
  };
}

export default {
  id: 'kepler',
  name: 'Kepler',
  year: 1609,
  era: '1609\u20131619',
  place: 'Prague and Linz \u2014 Astronomia nova, Harmonices mundi',
  epoch: { year: 1609, month: 1, day: 1 },
  defaultSpeed: 3,
  diurnal: 'earth',
  build,
  text: {
    tagline: 'Ellipses, a speed law and a distance law: the circles are gone at last.',
    picture: [
      'Working on Tycho\'s observations of Mars, Kepler first showed that the Earth\'s own orbit needed the bisected eccentricity that Ptolemy had given the planets: the Earth is a planet like the others, and the degree-sized errors in Mars that every earlier stage of this tour still contains vanish with that one change. He then found that no circle, even with an equant, could fit Mars to better than eight minutes of arc, and eight minutes he would not forgive. The orbit is an ellipse with the Sun at one focus (first law). The radius vector sweeps equal areas in equal times (second law), so the planet is fastest at perihelion. Ten years later, in the <em>Harmonices mundi</em>, the squares of the periods prove proportional to the cubes of the mean distances (third law; table below).',
      'The true Sun, not the mean Sun, is the centre, and it is a physical cause: an <em>anima motrix</em>, later a magnet-like force, issuing from the rotating Sun and weakening with distance, sweeps the planets round. Kepler is the first astronomer to demand a physics of the heavens, and the first to derive the orbit from the force.',
      'The young Kepler\'s <em>Mysterium cosmographicum</em> (1596) had nested the five regular solids between the planetary spheres to explain why there are six planets and why they are spaced as they are. Toggle the solids on: each is inscribed in the sphere outside it, and the fit to the sphere inside is close but imperfect, which is what sent Kepler to Tycho\'s data in the first place.',
    ],
    changes: [
      'No epicycles, no equants, no circles: seven ovals replace some eighty circles, and predictive accuracy improves tenfold.',
      'Astronomy becomes dynamical: orbits are consequences of forces. Newton will supply the right force.',
      'Uniform circular motion, the axiom of two thousand years, is simply dropped.',
    ],
    lookFor: [
      'Follow a planet with the mechanism on: the cyan mark is the empty second focus of its ellipse; the Sun sits at the other.',
      'The two shaded sectors on Mars\' orbit are swept in equal times: the fat one near perihelion, the thin one near aphelion.',
      'Toggle Kepler\'s solids and follow the nesting from Saturn\'s cube inward.',
    ],
    table: {
      caption: "Kepler's third law: P\u00b2 / a\u00b3 is the same for every planet",
      head: ['Planet', 'a (AU)', 'P (years)', 'P\u00b2/a\u00b3'],
      rows: ['mercury', 'venus', 'earth', 'mars', 'jupiter', 'saturn'].map(thirdLawRow),
    },
    scale: 'Kepler enlarged the cosmos: from the absence of a measurable solar parallax he set the Sun at 3,469 Earth radii (Epitome, 1618), three times Ptolemy\'s figure, so that Saturn lies at 33,000 Earth radii and the Sun is about 16 Earth radii across. The period layout uses that unit, with the Moon at 60 Earth radii and planet sizes implied by telescopic angular diameters at his distances. He put the fixed stars enormously farther than Saturn; they are drawn at four times its distance, not to scale.',
    kuhn: 'Chapter 6: Kepler\'s laws as the completion of the Copernican system\'s astronomy, and Chapter 7 on the neo-Platonic and physical motives behind them.',
  },
};
