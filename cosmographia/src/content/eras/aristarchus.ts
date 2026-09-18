import type { EraContent } from '../types';

export const aristarchusContent: EraContent = {
  headline:
    'Measurement leads to the Sun at the centre: a great fiery Sun far beyond the Moon, a moving Earth, and stars so distant that the Earth’s whole circle is a point beside them.',
  overview: [
    'Aristarchus of Samos, working in Alexandria around 280 BCE, applied geometry to the size of the cosmos. At half Moon the Sun, Moon and Earth form a right triangle; judging the angle at the Earth to be 87°, he concluded that the Sun is between 18 and 20 times farther than the Moon and, from eclipses, several times larger than the Earth.',
    'Perhaps because the Sun was so large, he put it at the centre. His book is lost, but Archimedes reports that Aristarchus “supposes that the fixed stars and the Sun remain unmoved, that the Earth revolves about the Sun in the circumference of a circle”, and that the sphere of the stars is so vast that the Earth’s circle is as a point to it. The idea found few followers; Seleucus of Seleucia defended it a century later.',
  ],
  mechanism: [
    {
      title: 'The Earth’s circle',
      text: 'The Earth goes around the Sun once a year and turns once a day. Day and night, and the Sun’s yearly journey through the zodiac, are the Earth’s own motions.',
    },
    {
      title: 'Retrograde motion as appearance',
      text: 'Nothing really reverses. As the Earth overtakes an outer planet on its faster inner circle, the planet seems for a while to slide backward against the stars.',
    },
    {
      title: 'The half-Moon triangle',
      text: 'At exact quarter the angle at the Moon is a right angle, and the angle at the Earth gives the ratio of the distances. The method is sound but the angle is nearly impossible to measure: the true value is 89°51′, giving about 390, not 19.',
    },
    {
      title: 'Distant stars',
      text: 'If the Earth moves, the stars should shift during the year. Aristarchus answered that they are immeasurably far — the answer Copernicus gave again, and the right one. Stellar parallax was first measured in 1838.',
    },
  ],
  explained: [
    'Retrograde motion as a natural consequence of the Earth’s own motion',
    'Why Venus and Mercury never stray far from the Sun',
    'The first estimates of the relative distances and sizes of the Sun and Moon',
  ],
  problems: [
    'No visible parallax of the stars, and no physics for a moving Earth',
    'Uniform circles cannot match the planets’ unequal speeds',
    'The Sun’s distance underestimated twentyfold',
    'Contrary to Aristotle’s physics, and to common sense',
  ],
  kuhn: 'Chapter 2, on Greek alternatives to the two-sphere universe, and Chapter 5, “Copernicus’ Innovation”, on why the ancient heliocentric idea did not take hold.',
  sources: [
    'Archimedes, The Sand-Reckoner',
    'Aristarchus, On the Sizes and Distances of the Sun and Moon, ed. and trans. T. L. Heath (1913)',
    'Plutarch, On the Face in the Moon 6',
  ],
  modelNotes: [
    'The Moon’s circle is 1/19 of the Earth’s, Aristarchus’s ratio; the real ratio is about 1/390.',
    'Aristarchus gave no planetary distances. The circles use the proportions Copernicus later derived from the same arrangement: Mercury 0.38, Venus 0.72, Mars 1.52, Jupiter 5.2, Saturn 9.2.',
    'All motions are uniform circles phased to the real mean positions of 280 BCE. With no eccentrics Mars can be more than ten degrees from its true place.',
    'The Sun is drawn almost seven times the Earth’s diameter, as Aristarchus estimated.',
  ],
  tryThis: [
    'Choose “Half moon” and look at the triangle: nearly a right angle at the Moon, and a long thin wedge reaching out to the Sun.',
    'Turn on “Trails as seen from Earth” under Layers and run at a month per second: in the Earth’s frame the planets draw loops.',
    'Open the Sky view with Modern positions on: the loops happen in the right places, but uniform circles misplace them by several degrees.',
  ],
};
