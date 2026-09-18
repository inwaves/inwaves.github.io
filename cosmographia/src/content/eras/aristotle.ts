import type { EraContent } from '../types';

export const aristotleContent: EraContent = {
  headline:
    'The homocentric spheres made physical: 55 real spheres of aether nested around a spherical Earth, a changeless heaven above the Moon and a world of change below it.',
  overview: [
    'Aristotle took Eudoxus’s spheres, as revised by his colleague Callippus, and turned a mathematical device into the physical structure of the universe. The heavens are made of aether, a fifth element whose natural motion is circular, so they never age or change. Below the Moon, earth, water, air and fire mix, move in straight lines, come into being and pass away.',
    'The spheres are real bodies and they touch. The spheres carrying one planet would drag the spheres of the planet below, so Aristotle inserted “unrolling” spheres that turn backward and undo the motions above: moving and counteracting spheres together number 55. At the edge, the sphere of the stars is moved by the Unmoved Mover, and beyond it there is nothing — not even empty space.',
  ],
  mechanism: [
    {
      title: 'Callippus’s corrections',
      text: 'Callippus added two spheres each to the Sun and Moon, giving them the unequal speeds that make the seasons unequal, and one each to Mercury, Venus and Mars.',
    },
    {
      title: 'Unrolling spheres',
      text: 'Beneath each planet’s set lie one fewer counteracting spheres than it has moving ones — 22 in all — so every set below starts again from the daily motion of the stars.',
    },
    {
      title: 'The elements',
      text: 'Earth sinks to the centre, water settles over it, air rises above, and fire rises highest, to just beneath the sphere of the Moon.',
    },
    {
      title: 'Natural motion',
      text: 'Heavy things move naturally toward the centre of the universe. That is why the Earth is there, why it is round, and why it does not move.',
    },
  ],
  explained: [
    'Why the Earth is spherical and at rest: heavy matter collects at the centre of the universe',
    'The round shadow of the Earth on the Moon during eclipses',
    'The difference between the regular, changeless heavens and the changing Earth',
    'A single physics joining the motions of the planets with falling stones and rising flames',
  ],
  problems: [
    'The spheres keep every planet at a constant distance, yet the planets change in brightness',
    'Comets and new stars had to be weather, below the Moon — until Tycho measured them',
    'Fifty-five spheres still predicted the planets poorly',
  ],
  kuhn: 'Chapter 3, “The Two-Sphere Universe in Aristotelian Thought”.',
  sources: [
    'Aristotle, Metaphysics XII.8 (the count of spheres); De caelo I–II',
    'Simplicius, Commentary on Aristotle’s De caelo II.12',
    'G. E. R. Lloyd, Aristotle: The Growth and Structure of His Thought (1968)',
  ],
  modelNotes: [
    'The planetary spheres follow Eudoxus’s reported periods and Schiaparelli’s hippopede inclinations. How Callippus’s fifth sphere for Mars, Venus and Mercury worked is not recorded; it is drawn but does not move them.',
    'Callippus’s two extra spheres for the Sun and for the Moon are modelled as hippopede pairs turning once per anomalistic year or month, inclined 1.9° and 6.3°, which reproduces the unequal speeds they were meant to give — a reconstruction in the spirit of Schiaparelli.',
    'The 22 counteracting spheres are drawn as violet shells below each set; their motions cancel, so they change nothing that can be seen.',
    'The mechanism lines are off by default so the nested shells can be seen; turn them on under Layers.',
  ],
  tryThis: [
    'Choose “The Moon covers Mars” and open the Sky view: the half Moon slides past Mars, as Aristotle watched it in 357 BCE.',
    'Select the Sun and speed up to a month per second: on Callippus’s spheres it runs faster through the winter than the summer.',
    'Turn on Mechanism under Layers and select Saturn to see the axes of its spheres, then its three unrolling spheres below.',
  ],
};
