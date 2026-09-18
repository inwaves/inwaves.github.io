import type { EraContent } from '../types';

export const eudoxusContent: EraContent = {
  headline:
    'The first mathematical theory of the planets: every motion in the sky built from nested spheres turning uniformly about the Earth, with retrograde motion drawn as a figure-eight.',
  overview: [
    'By the fourth century BCE Greek astronomers pictured a two-sphere universe: a small spherical Earth at the centre of a vast sphere of stars turning once a day, with the Sun, the Moon and the planets moving slowly within it. Around 370 BCE Eudoxus of Cnidus, a mathematician of Plato’s circle, answered the challenge to “save the phenomena” with uniform circular motions alone.',
    'Each wanderer received its own set of concentric spheres — 27 in all, counting the stars. The outermost of each set turns with the stars; the next carries the body around the zodiac; for the planets, two more spheres turning in opposite senses about slightly tilted axes carry the planet along a figure-eight, the hippopede. When the backward swing of the figure outruns the forward drift, the planet retrogrades.',
  ],
  mechanism: [
    {
      title: 'The daily sphere',
      text: 'The outermost sphere of every set turns westward about the celestial poles once a day. Turn on “Daily rotation of the heavens” under Layers to see it.',
    },
    {
      title: 'The zodiacal sphere',
      text: 'Its equator is the ecliptic, and it turns once in the planet’s zodiacal period: 30 years for Saturn, 12 for Jupiter, 2 for Mars, one year for Venus and Mercury.',
    },
    {
      title: 'The hippopede pair',
      text: 'The third sphere has its poles on the ecliptic; the fourth, tilted to it, turns at the same rate the opposite way. A planet on the fourth sphere’s equator traces a figure-eight along the zodiac once per synodic period.',
    },
    {
      title: 'Sun and Moon',
      text: 'Three spheres each. The Moon’s middle sphere turns slowly backward, carrying the tilted lunar circle around: the regression of the nodes that governs when eclipses can happen.',
    },
  ],
  explained: [
    'Stations and retrograde arcs of Jupiter, Saturn and Mercury from nothing but uniform rotation',
    'The planets’ small excursions north and south of the ecliptic',
    'Venus and Mercury swinging from side to side of the Sun',
  ],
  problems: [
    'Mars and Venus fail: with the reported periods, Mars loops three times per cycle and Venus never retrogrades',
    'Every sphere is centred on the Earth, so distances never change — yet Mars and Venus brighten and fade dramatically',
    'Retrograde loops come out the same everywhere in the zodiac; real loops vary in size',
    'No anomaly for the Sun, so the seasons come out equal',
  ],
  kuhn: 'Chapter 2, “The Problem of the Planets”: the two-sphere universe and Eudoxus’s homocentric spheres.',
  sources: [
    'Simplicius, Commentary on Aristotle’s De caelo II.12',
    'G. V. Schiaparelli, Le sfere omocentriche di Eudosso, di Callippo e di Aristotele (1875)',
    'I. Yavetz, “On the Homocentric Spheres of Eudoxus”, Archive for History of Exact Sciences 52 (1998)',
  ],
  modelNotes: [
    'Periods are those Simplicius reports. Zodiacal: Saturn 30 years, Jupiter 12, Mars 2, Venus and Mercury 1. Synodic: Saturn and Jupiter 13 months, Mars 8 months 20 days, Venus 19 months, Mercury 110 days.',
    'Hippopede inclinations are Schiaparelli’s reconstruction (Saturn 6°, Jupiter 13°, Mars 34°, Venus 46°, Mercury 23°); Eudoxus did not record them.',
    'Each set starts from the real mean longitude of 370 BCE, and the figure-eight is phased so retrograde motion centres on a real opposition or inferior conjunction. From there the model runs on Eudoxus’s own periods, and drifts.',
    'Distances are schematic, in Plato’s order: Moon, Sun, Venus, Mercury, Mars, Jupiter, Saturn.',
    'Eudoxus’s third solar sphere, for a supposed wandering in latitude of unrecorded size, is drawn but not used.',
  ],
  tryThis: [
    'Select Jupiter and let time run at about 5 days per second: its trail on the spheres shows the figure-eight carried around the zodiac.',
    'In the Sky view near opposition, watch Jupiter station and retrograde, then turn on Modern positions and look at Mars.',
    'Choose “Mars at opposition” and let a year pass: the model’s Mars keeps looping where the real one does not.',
  ],
};
