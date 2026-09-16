import type { EraContent } from '../types';

export const medievalContent: EraContent = {
  headline:
    'Ptolemy’s circles inside Aristotle’s spheres and Christian heavens: the Earth at the bottom of the universe, the Empyrean at its edge, and astronomers from Maragha to Toledo refining the machinery in between.',
  overview: [
    'From the ninth century astronomers writing in Arabic translated the Almagest, found that the Sun’s apogee moves, re-fitted the tables and objected to Ptolemy’s equant. At the observatory of Maragha in the thirteenth century Nasir al-Din al-Tusi devised the Tusi couple, and around 1350 Ibn al-Shatir of Damascus built planetary models entirely from uniformly turning circles — the very constructions Copernicus would later use.',
    'In Latin Europe the universities taught Sacrobosco’s De sphaera (c. 1230) and computed with the Alfonsine Tables (epoch 1252). The cosmos was Aristotle’s made Christian: earth, water, air and fire below the Moon; seven planetary heavens; the eighth sphere of the stars; a crystalline ninth; the Primum Mobile that turns everything once a day; and beyond it, the motionless Empyrean. Dante climbs through exactly these heavens in the Paradiso, set at Easter 1300.',
  ],
  mechanism: [
    {
      title: 'Solid orbs',
      text: 'Following Ptolemy’s Planetary Hypotheses, each planet’s machinery lives inside a thick shell of aether. In Peurbach’s Theoricae novae planetarum (1454) the shell holds eccentric orbs and a channel in which the epicycle turns.',
    },
    {
      title: 'Ptolemy re-tabulated',
      text: 'The equants, epicycles and crank of the Almagest, with mean motions corrected by centuries of observation and a solar apogee that moves.',
    },
    {
      title: 'Ibn al-Shatir’s alternative',
      text: 'A concentric deferent carries two small epicyclets of radii 3e/2 and e/2, reproducing the equant with uniform circular motion only. Choose “Ibn al-Shatir” under Layers.',
    },
    {
      title: 'The Primum Mobile',
      text: 'The outermost moving sphere turns once a day and carries all the others with it: the daily rotation of the heavens, moved by love of God.',
    },
  ],
  explained: [
    'A single picture uniting astronomy, physics and theology',
    'Planetary positions to a degree or two for the tables’ own centuries',
    'A physical account of the planets: solid orbs that turn',
  ],
  problems: [
    'The equant still broke uniform motion about a centre; the Maragha models removed it but stayed centred on the Earth',
    'Errors accumulated in the tables and a better year was needed to reform the calendar',
    'Every planet still carried a yearly motion tied to the Sun, and no one could say why',
  ],
  kuhn: 'Chapter 4, “Recasting the Tradition: Aristotelian Cosmology from the Middle Ages to Copernicus”.',
  sources: [
    'Sacrobosco, De sphaera mundi (c. 1230)',
    'G. Saliba, Islamic Science and the Making of the European Renaissance (2007)',
    'E. Grant, Planets, Stars, and Orbs: The Medieval Cosmos, 1200–1687 (1994)',
    'Dante Alighieri, Paradiso',
  ],
  modelNotes: [
    'The geometry is Ptolemy’s (or Ibn al-Shatir’s), but mean motions and apogees are re-fitted to the real mean motions of the date, as the Toledan and Alfonsine Tables re-fitted Ptolemy’s. The remaining errors come from the structure of the models, not from accumulated drift.',
    'Solar eccentricity 2;6 parts in place of Ptolemy’s 2;30, with a moving apogee, after the Arabic revisions.',
    'The heavens are drawn as evenly spaced cutaway shells named after Dante’s spheres. The planetary machinery keeps its schematic size and is off by default; turn on Mechanism under Layers.',
    'At Easter dawn 1300 Dante sees Venus as the morning star in Pisces; in the real sky Venus was an evening star close to the Sun.',
  ],
  tryThis: [
    'Turn on Mechanism, select Mars, and switch between “Latin (Ptolemaic)” and “Ibn al-Shatir” under Layers: different machinery, nearly the same Mars.',
    'Choose “Easter dawn” and look east in the Sky view with Modern positions on.',
    'Zoom out past the Primum Mobile to see the nested heavens in cutaway.',
  ],
};
