import type { EraContent } from '../types';

export const tychoContent: EraContent = {
  headline:
    'The Earth at rest and the planets circling the Sun, which circles the Earth: every Copernican harmony, no moving Earth, and heavens emptied of solid spheres by a new star and a comet.',
  overview: [
    'Tycho Brahe, a Danish nobleman, built at Uraniborg on the island of Hven the finest observatory before the telescope and measured the sky to about a minute of arc. In 1572 he showed that a new star in Cassiopeia had no parallax and so belonged to the heavens that were supposed never to change; in 1577 he showed that a great comet moved far beyond the Moon.',
    'Tycho admired Copernicus’s harmony but could not accept a moving Earth: it defied physics and Scripture, and the stars showed no parallax. In 1588 he proposed a compromise: the Earth at rest, the Moon and Sun circling it, the five planets circling the Sun. Geometrically it is Copernicus’s system seen from the Earth, so it predicts exactly the same sky. Mars’s orbit crosses the Sun’s — impossible with solid spheres, but Tycho’s comet had already passed straight through them.',
  ],
  mechanism: [
    {
      title: 'Geo-heliocentric',
      text: 'Hold the Earth still and move everything else so all relative positions are unchanged. The Sun’s yearly circle carries the centre of every planetary orbit.',
    },
    {
      title: 'Intersecting orbits',
      text: 'The circle of Mars around the Sun cuts through the circle of the Sun around the Earth. There are no crystalline spheres to shatter.',
    },
    {
      title: 'A compact universe',
      text: 'The Sun at 1,150 Earth radii, Saturn out to about 12,300, and the stars just beyond, near 14,000. No vast empty gap is needed, because nothing moves the Earth.',
    },
  ],
  explained: [
    'Everything Copernicus explained about the planets, with the Earth still',
    'The absence of stellar parallax',
    'Comets as heavenly bodies moving among the planets',
  ],
  problems: [
    'Two centres of motion: the planets circle the Sun while the Sun circles the Earth',
    'No physical reason why the planets should follow the Sun',
    'The changeless aethereal heavens were lost either way',
  ],
  kuhn: 'Chapter 6, “The Assimilation of Copernican Astronomy”: Tycho Brahe’s system and his observations.',
  sources: [
    'T. Brahe, De nova stella (1573); De mundi aetherei recentioribus phaenomenis (1588)',
    'V. E. Thoren, The Lord of Uraniborg: A Biography of Tycho Brahe (1990)',
    'C. D. Hellman, The Comet of 1577: Its Place in the History of Astronomy (1944)',
  ],
  modelNotes: [
    'The planetary geometry is the Copernican one used in this atlas, translated so that the Earth stays still. Every direction seen from the Earth is identical to Copernicus’s; the test suite checks it.',
    'Scale: the Sun at 1,150 Earth radii (Tycho’s value) and the stars at 14,000. The Moon keeps its 60 Earth radii and is enlarged five times so it can be seen.',
    'The comet of 1577 follows its modern parabolic orbit. Tycho himself fitted it to a circle around the Sun outside Venus.',
    'The new star of 1572 appears in the Sky view from November 1572 to March 1574, fading from brighter than Venus.',
  ],
  tryThis: [
    'Select Mars and run at two weeks per second: its orbit swings straight through the Sun’s.',
    'Choose “A new star in Cassiopeia” and look north in the Sky view for the star beside the W of Cassiopeia.',
    'Go to Copernicus, set the same date, and open the Sky view: the two worldviews show an identical sky.',
  ],
};
