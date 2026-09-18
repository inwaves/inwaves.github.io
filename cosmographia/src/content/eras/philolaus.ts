import type { EraContent } from '../types';

export const philolausContent: EraContent = {
  headline:
    'The first moving Earth: a planet that circles a hidden Central Fire once a day, beside an invisible Counter-Earth, in a cosmos of ten divine bodies.',
  overview: [
    'Philolaus of Croton, a Pythagorean writing in the late fifth century BCE, is the first person known to have taken the Earth out of the centre of the universe. Aristotle, who disagreed, preserves the scheme: at the centre burns a fire, the hearth of the universe; around it circle the Counter-Earth, the Earth, the Moon, the Sun, the five planets and the sphere of the stars.',
    'The Earth goes around the Central Fire once a day with its inhabited face always turned outward, so the Fire is never seen, and the daily turning of the sky is the Earth’s own motion. Ten bodies in all, because ten was the perfect number: for the Pythagoreans, number and harmony were the essence of the cosmos.',
  ],
  mechanism: [
    {
      title: 'The Central Fire',
      text: 'Hestia, the hearth, at the true centre of everything. We live on the side of the Earth facing away from it and so never see it.',
    },
    {
      title: 'The Earth’s daily circuit',
      text: 'One circuit per day produces the rising and setting of everything in the sky. The sphere of the stars is at rest.',
    },
    {
      title: 'The Counter-Earth',
      text: 'Antichthon circles between the Earth and the Fire, keeping step with the Earth and forever hidden. Aristotle scoffed that it was invented to make the count ten; some thought it helped explain why eclipses of the Moon are so common.',
    },
    {
      title: 'The Sun as a lens',
      text: 'The Sun has no fire of its own. Like a glass, it gathers the light of the fire and passes it on to us.',
    },
    {
      title: 'Uniform circles',
      text: 'The Moon, the Sun and the planets each circle the Fire at their own speed. Nothing in the scheme stops a planet or turns it back.',
    },
  ],
  explained: [
    'Daily motion as a motion of the Earth, two thousand years before Copernicus',
    'The monthly and yearly cycles and the periods of the planets through the zodiac',
    'A universe ordered by number and harmony',
  ],
  problems: [
    'No retrograde motion, no stations, no changes in the planets’ brightness',
    'An unseen Fire and an unseen Counter-Earth: nothing that could ever be observed',
    'A daily circuit should shift the nearer bodies against the stars every night, and no such shift is seen',
  ],
  kuhn: 'Chapter 2, on early alternatives to the Earth-centred universe, and Chapter 5, where Copernicus cites Philolaus as a precedent for the Earth’s motion.',
  sources: [
    'Aristotle, De caelo II.13; Metaphysics I.5',
    'C. A. Huffman, Philolaus of Croton: Pythagorean and Presocratic (1993)',
    'Stanford Encyclopedia of Philosophy, “Philolaus”',
  ],
  modelNotes: [
    'No distances survive. The radii here are illustrative, chosen so the Earth’s daily circle is small beside the rest and the daily parallax of the Moon (up to 2°) and Sun (1°) stays modest.',
    'The Earth’s circuit lies in the plane of the celestial equator, with its angle set to the sidereal time at Croton, so its outward face shows the real sky of that night.',
    'The Moon, the Sun and the outer planets move uniformly at their real mean rates of 430 BCE; Mercury and Venus keep company with the mean Sun.',
    'The circuit of the Earth and Counter-Earth is enlarged so it can be seen; choose “To scale” under Layers to see it in proportion.',
  ],
  tryThis: [
    'Watch the Earth run around the Fire once a day while the stars stay put, then open the Sky view: from the Earth, it is the heavens that seem to turn.',
    'In the Sky view, speed up to a week per second and follow Mars: it never stops or turns back. Turn on Modern positions to see the real Mars do both.',
    'Select the Counter-Earth, then try to find it from the Earth. You cannot: it stays on the far side.',
  ],
};
