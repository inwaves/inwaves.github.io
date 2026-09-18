import type { EraContent } from '../types';

export const copernicusContent: EraContent = {
  headline:
    'The Sun near the centre and the Earth a planet: the same circles as before, rearranged so that the retrograde loops, the order of the planets and their distances all follow from one arrangement.',
  overview: [
    'Nicolaus Copernicus, a canon of Frombork Cathedral, circulated a short sketch of a Sun-centred system around 1514 and published the full theory, De revolutionibus orbium coelestium, in 1543, the year he died. The Earth turns daily on its axis and circles the Sun yearly; the Moon alone circles the Earth.',
    'Its advantages were harmony rather than accuracy. The loops of every planet become reflections of the Earth’s own motion, which explains at a stroke why the outer planets retrograde only at opposition and why Mercury and Venus stay near the Sun, and the order and relative distances of the planets follow from observation. Yet Copernicus insisted on uniform circles and rejected the equant, so he kept small epicycles and eccentric circles, and his tables were no better than Ptolemy’s.',
  ],
  mechanism: [
    {
      title: 'The Earth’s three motions',
      text: 'Daily rotation; yearly revolution; and a third, annual conical motion of the axis, turning against the revolution so that the axis keeps pointing at nearly the same stars. The small mismatch between the two yearly motions produces the slow precession of the equinoxes.',
    },
    {
      title: 'Eccentrics and epicyclets',
      text: 'Each outer planet moves on a circle whose centre lies 3e/2 from the centre of the Earth’s orbit and carries a small epicyclet of radius e/2 turning at the same rate. Two uniform circles reproduce the equant’s effect — the device Ibn al-Shatir had used.',
    },
    {
      title: 'The mean Sun',
      text: 'Copernicus referred the planetary orbits not to the Sun but to the centre of the Earth’s orbit, a point near it. Strictly, the system is heliostatic rather than heliocentric.',
    },
    {
      title: 'Order and distance',
      text: 'The periods set the order: Mercury 88 days, Venus 225, Earth a year, Mars two, Jupiter twelve, Saturn thirty. The size of each loop gives the planet’s distance in units of the Earth’s orbit — for the first time.',
    },
    {
      title: 'The Moon',
      text: 'A double epicycle keeps the Moon’s distance nearly constant and so removes Ptolemy’s absurd doubling of the Moon’s apparent size.',
    },
  ],
  explained: [
    'Why the outer planets retrograde only at opposition, and why the loops shrink from Mars to Saturn',
    'Why Mercury and Venus never stray far from the Sun',
    'The order and relative distances of all the planets, from observation',
    'The Sun’s yearly influence on every planet, as a reflection of the Earth’s own motion',
  ],
  problems: [
    'No stellar parallax: the stars must be immensely far',
    'A moving Earth contradicts Aristotle’s physics: why do falling stones not lag behind?',
    'Still epicycles, and predictions no better than the Ptolemaic tables',
    'Many said it contradicted the plain sense of Scripture',
  ],
  kuhn: 'Chapter 5, “Copernicus’ Innovation”, and Chapter 6, “The Assimilation of Copernican Astronomy”.',
  sources: [
    'N. Copernicus, De revolutionibus orbium coelestium (1543), Books I and V',
    'N. M. Swerdlow and O. Neugebauer, Mathematical Astronomy in Copernicus’s De revolutionibus (1984)',
    'O. Gingerich, The Book Nobody Read (2004)',
  ],
  modelNotes: [
    'Earth: a circle whose centre lies 0.0323 of its radius from the Sun. Mars, Jupiter and Saturn: deferent eccentricities 0.146, 0.0687 and 0.0854 and epicyclets 0.050, 0.0229 and 0.0285 of each orbit’s radius; radii 1.520, 5.219 and 9.174.',
    'Venus is an eccentric circle of radius 0.7193. Copernicus’s intricate oscillating model for Mercury is simplified to the outer planets’ construction with a modern eccentricity. The Moon uses the two epicycles of Book IV (0.1097 and 0.0237 of the deferent).',
    'Mean motions and apsidal lines are phased from the real mean elements of 1543 rather than Copernicus’s tables, so the errors show the structure of the model.',
    'The Moon’s orbit is enlarged 70 times so it can be seen, and all bodies are drawn far larger than to scale.',
  ],
  tryThis: [
    'Turn on “Trails as seen from Earth” under Layers: the Sun-centred circles turn into the familiar retrograde loops.',
    'Select Mars and open the Sky view with Modern positions on: Copernicus’s Mars is typically within a degree or two of the real one.',
    'Choose “Mars at opposition, 5 June 1512”: the Earth overtakes Mars on the inside track.',
  ],
};
