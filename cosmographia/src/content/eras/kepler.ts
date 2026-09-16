import type { EraContent } from '../types';

export const keplerContent: EraContent = {
  headline:
    'Astronomy becomes physics: the planets move on ellipses around the Sun, driven by a power from the Sun, according to three simple laws.',
  overview: [
    'Johannes Kepler was a Copernican from his student days. His first book, Mysterium Cosmographicum (1596), explained why there are six planets at their particular distances by nesting the five regular solids between their spheres. It won him a place beside Tycho in Prague, and Tycho’s observations of Mars became his great puzzle.',
    'After years of calculation Kepler found that his best circular theory of Mars still missed Tycho’s observations by eight minutes of arc — several times more than Tycho’s precision of a minute or two. “Because they could not be ignored, these eight minutes alone led to a total reformation of astronomy.” In Astronomia nova (1609) he gave the first two laws: each planet moves on an ellipse with the Sun at one focus, and the line from the Sun sweeps out equal areas in equal times. In Harmonices Mundi (1619) he added the third: the square of a planet’s period is proportional to the cube of its mean distance. His Rudolphine Tables (1627) were far more accurate than any before them.',
  ],
  mechanism: [
    {
      title: 'First law',
      text: 'The orbit is an ellipse, and the Sun sits at one focus, not at the centre. The other focus is empty.',
    },
    {
      title: 'Second law',
      text: 'A planet runs fastest at perihelion and slowest at aphelion, so equal times sweep equal areas. Each coloured wedge on Mars’s orbit takes one twelfth of its year.',
    },
    {
      title: 'Third law',
      text: 'Period squared is proportional to distance cubed: Mercury 0.24 years at 0.39, Jupiter 11.86 years at 5.20. Periods and distances are one system.',
    },
    {
      title: 'A physical cause',
      text: 'Kepler imagined a power from the rotating Sun sweeping the planets around, weakening with distance, with magnetic attraction and repulsion shaping the ellipses. He was wrong about the force, but he was the first to insist there must be one.',
    },
  ],
  explained: [
    'Planetary positions to within minutes of arc: the Rudolphine Tables predicted the transit of Mercury of 1631',
    'The varying speeds of the planets without equants or epicycles',
    'Periods and distances bound together by one law',
  ],
  problems: [
    'No correct physics for the force from the Sun',
    'Why ellipses? Unexplained until Newton',
    'Slow to be accepted: Galileo ignored the ellipses',
  ],
  kuhn: 'Chapter 6, “The Assimilation of Copernican Astronomy”: Kepler.',
  sources: [
    'J. Kepler, Astronomia nova (1609), trans. W. H. Donahue (1992)',
    'J. Kepler, Harmonices Mundi (1619), Book V',
    'M. Caspar, Kepler, trans. C. D. Hellman (1959)',
  ],
  modelNotes: [
    'Orbits are Keplerian ellipses with JPL’s modern elements — Kepler’s laws at their best. Kepler’s own tables were typically good to a few minutes of arc.',
    'The Mysterium option draws each solid inscribed in the outer planet’s real sphere, together with the solid’s inscribed sphere, so the mismatch Kepler blamed on imprecise distances is visible.',
    'The four Galilean moons are included: Kepler confirmed them in 1610 and coined the word “satellite” for them. Saturn is still triple; its rings were not explained until 1659.',
  ],
  tryThis: [
    'Select Mars and watch the wedges: long and thin near aphelion, short and wide near perihelion, all of equal area.',
    'Turn on “Mysterium Cosmographicum” under Layers and zoom out to see the cube between Saturn and Jupiter.',
    'Choose “Transit of Mercury, 7 November 1631” and zoom the Sky view onto the Sun.',
  ],
};
