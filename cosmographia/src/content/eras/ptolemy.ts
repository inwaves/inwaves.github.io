import type { EraContent } from '../types';

export const ptolemyContent: EraContent = {
  headline:
    'The heavens as a clockwork of circles, fitted to centuries of observation: the Earth at rest, every planet on an epicycle, uniform motion measured from a point that is not the centre.',
  overview: [
    'Around 150 CE in Alexandria, Claudius Ptolemy completed the Mathematike Syntaxis, known through its Arabic name as the Almagest. It gathered five centuries of Greek geometry and Babylonian records into a system that predicted the positions of the Sun, Moon and planets for any date, and for fourteen hundred years it was astronomy.',
    'The frame is the ancient two-sphere universe: a small, spherical, motionless Earth at the centre of a rotating sphere of stars. Inside that sphere each wanderer has its own machinery of circles. In the later Planetary Hypotheses Ptolemy turned the machinery into nested physical shells with no gaps: the Moon’s shell reaches from 33 to 64 Earth radii, Mercury’s begins where the Moon’s ends, and so outward to Saturn, whose shell closes at almost 20,000 Earth radii, where the stars begin.',
  ],
  mechanism: [
    {
      title: 'Deferent and epicycle',
      text: 'Each planet rides a small circle, the epicycle, whose centre is carried around a large circle, the deferent. When the planet’s motion on its epicycle runs against the deferent’s, the planet seems to stop and move backward among the stars. Retrograde motion comes out of uniform circles and nothing else.',
    },
    {
      title: 'Eccentric',
      text: 'The deferent’s centre is displaced from the Earth, so each body comes nearer in one part of the zodiac and seems to move faster there. The Sun has no epicycle: an eccentric alone gives the unequal seasons that Hipparchus measured.',
    },
    {
      title: 'Equant',
      text: 'Ptolemy’s boldest device. The epicycle’s centre moves uniformly as seen from a third point, the equant, placed opposite the Earth at twice the deferent’s eccentricity — not from the Earth, and not from the centre of its own circle. It fits the observations far better but abandons uniform motion about a centre, and astronomers from Ibn al-Haytham to Copernicus objected to it.',
    },
    {
      title: 'The Sun inside every planet',
      text: 'For Venus and Mercury the epicycle’s centre always lies on the line to the mean Sun; for Mars, Jupiter and Saturn the epicycle’s radius stays parallel to the Earth–Sun line. Nothing in the geometry says why the Sun is built into every planet’s motion. Copernicus made much of this coincidence.',
    },
    {
      title: 'The Moon',
      text: 'In the “crank” model the centre of the lunar deferent swings around the Earth and pulls the epicycle closer at the quarters. The longitudes come out well, but the Moon at quarter phase would be almost twice as near as at full Moon, so it should look almost twice as large. It does not.',
    },
  ],
  explained: [
    'The retrograde loops of every planet, and why Mars, Jupiter and Saturn retrograde only at opposition',
    'The unequal lengths of the seasons',
    'Why Venus and Mercury never wander far from the Sun',
    'Planetary longitudes to within a degree or two, from tables that anyone could use',
  ],
  problems: [
    'The equant breaks the rule that the heavens move uniformly in circles',
    'The lunar model makes the Moon’s apparent size nearly double at the quarters, which never happens',
    'Venus always lies between the Earth and the Sun, so it could never show a full disc. Galileo saw one in 1610',
    'The distances rest on the assumption that the shells fit exactly, not on any measurement',
    'A year slightly too long and precession of 1° a century (really 1° in 72 years), so the tables drift over the centuries',
  ],
  kuhn: 'Chapter 2, “The Problem of the Planets”, and the Technical Appendix on eccentrics, epicycles and the equant.',
  sources: [
    'Ptolemy, Almagest, trans. G. J. Toomer (1984), Books III–XI',
    'B. R. Goldstein, “The Arabic Version of Ptolemy’s Planetary Hypotheses” (1967)',
    'J. Evans, The History and Practice of Ancient Astronomy (1998), ch. 7',
  ],
  modelNotes: [
    'Mean motions and mean positions at the era of Nabonassar (26 February 747 BCE, noon at Alexandria) are Ptolemy’s own, written as his sexagesimal fractions.',
    'Eccentricities (deferent radius 60): Sun 2;30, Mercury 3;0, Venus 1;15, Mars 6;0, Jupiter 2;45, Saturn 3;25. Epicycles: Mercury 22;30, Venus 43;10, Mars 39;30, Jupiter 11;30, Saturn 6;30. Planetary apogees advance 1° per century; the solar apogee is fixed at Gemini 5;30.',
    'The Moon uses the second lunar model of Book V (deferent 49;41, eccentricity 10;19, epicycle 5;15) with its prosneusis point, inclined 5° about regressing nodes.',
    'Planetary latitudes use modern inclinations and nodes in place of the latitude theory of Book XIII.',
    'The “Planetary Hypotheses” layout scales each mechanism so that its greatest distance equals the least distance of the next shell, in Earth radii. The schematic layout spaces the deferents evenly; as seen from the Earth both are identical.',
    'Turn on Modern positions to compare with the real sky, computed from JPL ephemerides: on the night of the Mars opposition of 139 CE the model is within about two degrees for every body.',
  ],
  tryThis: [
    'Switch to the Sky view at about 4 days per second and watch Mars stop, back up among the stars of Sagittarius, and move on again.',
    'Select Venus in the Cosmos view: the centre of its epicycle keeps pace with the Sun all year.',
    'Turn on Modern positions, then jump forward to 1450: after thirteen centuries of accumulated error the tables are several degrees out.',
  ],
};
