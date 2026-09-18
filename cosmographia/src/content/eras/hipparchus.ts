import type { EraContent } from '../types';

export const hipparchusContent: EraContent = {
  headline:
    'Circles carried by circles: the eccentric and the epicycle, fitted by Hipparchus to measurements with a precision no one had attempted before.',
  overview: [
    'Around 200 BCE Apollonius of Perga showed that two constructions could do what Eudoxus’s spheres could not: a planet on a small circle, the epicycle, riding a larger circle centred on the Earth; or a single circle whose centre is displaced from the Earth, the eccentric. Either makes speeds and distances change; the epicycle also makes retrograde loops.',
    'Hipparchus of Nicaea, observing at Rhodes between about 162 and 127 BCE, made them quantitative. He measured the unequal seasons and gave the Sun an eccentric, built a lunar theory good enough to predict eclipses, compiled a catalogue of about 850 stars and, comparing it with older positions, discovered that the equinoxes slide slowly along the zodiac. For the planets he gathered observations and showed that the existing epicycle schemes failed, but left the theory to others.',
  ],
  mechanism: [
    {
      title: 'The Sun’s eccentric',
      text: 'Uniform motion on a circle whose centre sits 1/24 of its radius from the Earth, toward Gemini 5½°. Seen from the Earth the Sun runs slowest near that point: spring lasts 94½ days, summer 92½.',
    },
    {
      title: 'The lunar epicycle',
      text: 'The Moon rides an epicycle of radius 5¼ (on a deferent of 60), moving westward at its top, so it speeds up and slows down once per anomalistic month.',
    },
    {
      title: 'Planets on epicycles',
      text: 'An epicycle on a deferent centred on the Earth gives each planet a retrograde loop at every opposition or inferior conjunction — the Apollonian scheme Hipparchus tested and found wanting.',
    },
    {
      title: 'Precession',
      text: 'The sphere of the stars creeps slowly eastward: at least 1° a century by Hipparchus’s estimate, really 1° in 72 years. Run the Sky view at a year per second to watch the zodiac slide against the stars.',
    },
  ],
  explained: [
    'The unequal seasons, quantitatively',
    'Eclipse times and the Moon’s changing speed',
    'The precession of the equinoxes',
    'Retrograde loops for every planet, qualitatively',
  ],
  problems: [
    'Concentric deferents make every retrograde loop the same size, but Mars’s loops vary greatly around the zodiac',
    'The lunar theory fails away from new and full Moon',
    'No planetary distances, and no physical account of what carries the circles',
  ],
  kuhn: 'Chapter 2, “The Problem of the Planets”: eccentrics, epicycles and the growing precision of Greek astronomy.',
  sources: [
    'Ptolemy, Almagest III–IV and IX.2 (reporting Hipparchus)',
    'O. Neugebauer, A History of Ancient Mathematical Astronomy (1975)',
    'J. Evans, The History and Practice of Ancient Astronomy (1998)',
  ],
  modelNotes: [
    'The solar model (eccentricity 2½ parts of 60, apogee Gemini 5½°) and the simple lunar epicycle (5¼ parts) are Hipparchus’s, as Ptolemy transmits them, with the mean motions of the Almagest.',
    'Hipparchus left no planetary theory, so the planets use Apollonian concentric deferents carrying the epicycle sizes Ptolemy later measured. The gap Ptolemy closed with the eccentric and equant is easy to see.',
    'The layout is schematic; as seen from the Earth, directions are unaffected.',
  ],
  tryThis: [
    'Select Mars and turn on Modern positions: on a concentric deferent the model’s Mars can be ten degrees or more from the real one.',
    'Choose “Autumn equinox observed” and watch the Sun cross the celestial equator in the Sky view.',
    'Choose “Spica slips along the zodiac” and let decades pass: the stars drift along the ecliptic.',
  ],
};
