import type { EraContent } from '../types';

export const anaximanderContent: EraContent = {
  headline:
    'The first attempt to picture the universe as a machine: a drum-shaped Earth hanging at the centre, and the Sun, Moon and stars as fire seen through holes in turning wheels of mist.',
  overview: [
    'Anaximander of Miletus, a pupil of Thales, wrote the first Greek prose book on nature around 550 BCE. Only fragments and later reports survive, but they describe something new: a cosmos explained by geometry and physical parts rather than by the whims of gods.',
    'The Earth is a squat cylinder, like the drum of a column, three times as wide as it is deep. It rests on nothing: being at the centre and equally far from everything, it has no reason to move one way rather than another. Around it lie great wheels of fire wrapped in tubes of mist. Where the mist is pierced the fire shows through — those openings are the stars, the Moon and the Sun, with the stars nearest and the Sun farthest.',
  ],
  mechanism: [
    {
      title: 'Wheels of fire',
      text: 'Hippolytus reports the Sun’s wheel as 27 times the size of the Earth and the Moon’s as 18 times; reconstructions add the star wheels at 9. The sizes step up in multiples of the Earth’s width, echoing the drum’s own three-to-one proportions.',
    },
    {
      title: 'Vents',
      text: 'The Sun is an opening in its wheel as wide as the Earth. When the opening closes, the Sun is eclipsed; the Moon’s phases are its vent opening and closing.',
    },
    {
      title: 'Turning wheels',
      text: 'The wheels turn about the pole of the sky, carrying the vents across the sky and below the rim of the drum each day, while the Sun and Moon also creep slowly eastward around the zodiac.',
    },
    {
      title: 'The stars nearest',
      text: 'Odd to us, but not unreasonable: the stars are small and faint, so they sit close; the Sun is the brightest and purest fire, so it is the farthest.',
    },
  ],
  explained: [
    'Why the Earth does not fall: there is nothing for it to fall toward',
    'Daily risings and settings as the turning of great wheels',
    'The Sun’s and Moon’s own slow journeys around the sky',
    'Eclipses and phases as the covering of openings',
  ],
  problems: [
    'No account of the planets as wanderers distinct from the stars',
    'Stars nearer than the Moon, although the Moon is seen to pass in front of stars',
    'A flat-topped Earth cannot explain why travellers going south see new stars rise',
    'A picture without numbers: it predicts nothing',
  ],
  kuhn: 'Chapter 1, “The Ancient Two-Sphere Universe”, on the early cosmologies from which the two-sphere universe grew.',
  sources: [
    'Hippolytus, Refutation of All Heresies I.6; Aëtius II.20–25',
    'C. H. Kahn, Anaximander and the Origins of Greek Cosmology (1960)',
    'D. L. Couprie, Heaven and Earth in Ancient Greek Cosmology (2011)',
  ],
  modelNotes: [
    'Proportions after Hippolytus and modern reconstructions: the drum’s diameter three times its height; wheels at 9, 18 and 27 Earth diameters, each one Earth diameter thick.',
    'Anaximander gave no rates, so the Sun’s and Moon’s vents move uniformly at the real mean rates of 547 BCE. The Moon has no anomaly and can be several degrees from its true place.',
    'The star wheels are drawn as a misty shell pierced by the real stars; how Anaximander arranged them is not known.',
    'With daily rotation on, the view keeps the drum level and turns the wheels about the pole at the latitude of Miletus.',
    'The planets are absent from this worldview. Under Modern positions they appear in the Sky view as unexplained lights.',
  ],
  tryThis: [
    'Let time run at an hour per second: the wheels turn about the tilted pole while the drum stays still, and the vents dip below its rim.',
    'Open the Sky view: midsummer night over Miletus in 547 BCE, with no planets in the worldview.',
    'Turn on Modern positions to see where the real Sun and Moon were beside the uniformly turning vents.',
  ],
};
