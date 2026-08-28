import { elementShells, geoCamera } from './common.js';
import { ptolemyBodies, ptolemaicLayout } from './ptolemy.js';

function build(mode) {
  const L = ptolemaicLayout(mode);
  return {
    camera: geoCamera(L.stars, L.period ? 0.9 : 1.15),
    sky: { radius: L.stars, shell: true },
    markerScale: L.markerScale,
    shells: [
      ...elementShells(L.S.earth),
      { radius: L.stars * 1.08, color: 0xb8ccff, opacity: 0.07, name: 'Primum Mobile (crystalline heaven)', wire: true },
      { radius: L.stars * 1.19, color: 0xffe7b0, opacity: 0.06, emissive: 0xffe0a0, emissiveIntensity: 0.6, inside: true, name: 'Empyrean' },
    ],
    bodies: ptolemyBodies(L, { spheres: true }),
  };
}

export default {
  id: 'medieval',
  name: 'The Medieval Cosmos',
  shortName: 'Dante',
  year: 1300,
  era: 'c. 1300',
  place: 'Paris, Oxford, Florence \u2014 Sacrobosco, Aquinas, Dante',
  epoch: { year: 1300, month: 4, day: 8 },
  defaultSpeed: 3,
  diurnal: 'cosmos',
  build,
  text: {
    tagline: "Aristotle's physics, Ptolemy's circles and Christian theology fused into the universe of the Divine Comedy.",
    picture: [
      'Nine heavens turn about the motionless Earth: Moon, Mercury, Venus, Sun, Mars, Jupiter, Saturn, the Fixed Stars (the firmament), and the crystalline <em>Primum Mobile</em>, the first moved, whose daily turn is transmitted to everything below. Around them all lies the Empyrean, the motionless, immaterial abode of God and the blessed, shown here as a soft outer glow.',
      'Each sphere is turned by an angelic intelligence. Nobility increases outward: at the very centre of the universe is Hell. Humanity lives at the literal and moral bottom of creation, yet at the point on which the whole is focused. Dante climbs this structure sphere by sphere in the <em>Paradiso</em>.',
      'The technical astronomy is Ptolemy\'s, received through al-Farghani and taught from Sacrobosco\'s <em>Sphere</em>. Epicycles fit awkwardly inside Aristotle\'s solid spheres, so the spheres were thickened to make room for them. Scholars knew the fit was imperfect: Averroes rejected epicycles outright, while Buridan and Oresme showed that a rotating Earth could not be refuted by observation, then set the idea aside for lack of a decisive argument.',
    ],
    changes: [
      'Nothing in the mechanics changes (the motions here are Ptolemy\'s). What changes is the weight the picture carries: cosmology is now tied to morality, scripture and the place of humanity.',
      'The Primum Mobile and Empyrean added beyond the stars: a precessing ninth sphere to fix Ptolemy\'s equinoxes, and a theological tenth.',
      'This is the setting that made any change in astronomy a threat to everything else: Kuhn\'s explanation of why the Copernican innovation became a revolution.',
    ],
    lookFor: [
      'The two outer shells beyond the fixed stars, labelled Primum Mobile and Empyrean; the element shells around the Earth.',
      'Slow the clock to half a day per second or less: in this cosmos the whole machine, down to the Moon, turns once a day under the Primum Mobile.',
      'Everything else is as in the Ptolemy stage: the same equants, the same loops.',
    ],
    scale: 'Medieval distances are Ptolemy\'s as transmitted by al-Farghani (Moon 33\u201364, Mercury to 166, Venus to 1,079, Sun 1,160\u20131,260, Mars to 8,820, Jupiter to 14,187, Saturn to 19,865, stars at about 20,000 Earth radii); Sacrobosco, Dante\'s Convivio and Roger Bacon all repeat them. The period layout uses the same figures as the Ptolemy stage, with the Primum Mobile and Empyrean just beyond the stars.',
    kuhn: 'Chapter 4, "Recasting the Tradition: Aristotle to the Copernicans": the medieval universe of Dante, the scholastics\' criticisms, and the intellectual climate on the eve of Copernicus.',
  },
};
