import type { EraContent } from '../types';

export const galileoContent: EraContent = {
  headline:
    'The telescope turns the heavens into evidence: moons around Jupiter, phases of Venus, mountains on the Moon, spots on the Sun, and stars beyond counting.',
  overview: [
    'In 1609 Galileo Galilei, professor of mathematics at Padua, built a telescope that magnified about twenty times and turned it on the sky. In March 1610 he published Sidereus Nuncius, the Starry Messenger: the Moon was mountainous, the Milky Way a swarm of stars, and on 7 January 1610 he had seen three small stars beside Jupiter — soon four — moving with Jupiter and around it.',
    'None of this proved that the Earth moves, but all of it wore away the old picture. A planet with moons made a moving Earth with one Moon less absurd; a rough Moon and a spotted Sun undid the perfection of the heavens; and late in 1610 Venus showed a full cycle of phases, impossible in Ptolemy’s arrangement though allowed by Copernicus’s and Tycho’s. Galileo defended Copernicus in the Dialogue of 1632 and was tried and silenced in 1633.',
  ],
  mechanism: [
    {
      title: 'Copernican circles',
      text: 'Galileo taught the Copernican arrangement and never adopted Kepler’s ellipses; his Dialogue draws simple circles about the Sun.',
    },
    {
      title: 'The Medicean Stars',
      text: 'Io, Europa, Ganymede and Callisto circle Jupiter in 1.8, 3.6, 7.2 and 16.7 days. Galileo named them after the Medici and later proposed their eclipses as a clock for finding longitude at sea.',
    },
    {
      title: 'Phases of Venus',
      text: 'A planet circling the Sun inside the Earth’s orbit shows every phase: small and full beyond the Sun, large and crescent when nearest us.',
    },
    {
      title: 'Saturn’s companions',
      text: 'In July 1610 Saturn looked like three bodies. By late 1612 the side bodies had vanished (the rings were edge-on) and they returned in 1616. Huygens explained them only in 1659.',
    },
  ],
  explained: [
    'Moons orbiting another planet: the Earth is not the only centre of motion',
    'The phases of Venus: Venus goes around the Sun',
    'The Milky Way resolved into countless stars',
    'A rough Moon and a spotted, rotating Sun: the heavens are made like the Earth',
  ],
  problems: [
    'Still no stellar parallax',
    'Circular orbits predicted no better than Copernicus’s',
    'Galileo’s own proof of the Earth’s motion, from the tides, was wrong',
  ],
  kuhn: 'Chapter 6, “The Assimilation of Copernican Astronomy”: Galileo and the telescope.',
  sources: [
    'G. Galilei, Sidereus Nuncius (1610), trans. A. Van Helden (1989)',
    'G. Galilei, Dialogue Concerning the Two Chief World Systems (1632)',
    'A. Van Helden, “Saturn and His Anses”, Journal for the History of Astronomy 5 (1974)',
  ],
  modelNotes: [
    'The planets follow the Copernican geometry of 1543, drawn as circles, as Galileo drew them.',
    'The four Galilean moons are placed from JPL Horizons state vectors and advanced at their mean rates. On the evening of 7 January 1610 two lie east of Jupiter and one west, as in Galileo’s sketch; the test suite checks it.',
    'Each moon’s orbit is enlarged individually so the system is legible beside an exaggerated Jupiter; directions from Jupiter are true.',
    'Saturn is drawn with two companions, as Galileo reported it in 1610.',
  ],
  tryThis: [
    'Select Jupiter, zoom in, and run at six hours per second: the four moons race around it.',
    'Choose “Venus gibbous, October 1610”, open the Telescope and let time run: Venus grows larger and thinner, as it can only if it circles the Sun. Then look at Venus in Ptolemy’s worldview.',
    'Step back to Tycho: in that worldview Jupiter has no moons at all.',
  ],
};
