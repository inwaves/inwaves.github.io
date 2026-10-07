/**
 * The progression of worldviews.
 *
 * Each era pairs a kinematic model with the date it belongs to, the things that
 * had and had not yet been discovered, and a commentary. Discovery gating lives
 * here rather than in the renderer: an era's `features` say what a viewer of that
 * time could know, and everything downstream obeys them.
 *
 * Commentary is written to be read beside the simulation. `fidelity` states
 * plainly what on screen is sourced, reconstructed or merely illustrative; the
 * full account is docs/SOURCES.md.
 */
import { calendarToJd } from '../core/time.js';
import { createAnaximanderModel } from '../models/anaximander.js';
import { createHeliocentricModel } from '../models/heliocentric.js';
import { createHomocentricModel } from '../models/homocentric.js';
import { createPtolemaicModel } from '../models/ptolemaic.js';

/** Naked-eye and telescopic limiting magnitudes. The catalogue ends at magnitude 6. */
const NAKED_EYE = 5.0;
const TELESCOPIC = 6.0;

/** Features of an era before the telescope. */
const UNAIDED = {
  /** Planets are seen as discs with phases, not as points of light. */
  telescope: false,
  /** Mountains and craters on the Moon. */
  lunarRelief: false,
  /** 'plain', 'ears' (Galileo's triple Saturn) or 'ring' (Huygens). */
  saturn: 'plain',
  jupiterMoons: false,
  titan: false,
  comet: false,
  magnitudeLimit: NAKED_EYE,
};

export const ERAS = [
  {
    id: 'anaximander',
    title: 'Anaximander',
    subtitle: 'Wheels of fire',
    dateLabel: 'c. 550 BCE',
    place: 'Miletus',
    defaultJd: calendarToJd(-545, 6, 28.25),
    /** Days of simulated time per second. The daily turning is the whole show here. */
    defaultSpeed: 1 / 12,
    createModel: () => createAnaximanderModel({ id: 'anaximander' }),
    features: { ...UNAIDED },
    lede: 'The first mechanical model of the cosmos: a drum-shaped Earth hanging unsupported at the centre of great turning wheels of fire.',
    paragraphs: [
      'Anaximander made the Earth a column drum, three times as wide as it is deep, with people living on its flat upper face. It rests on nothing. Being equally far from everything, it has no reason to move one way rather than another, and so it stays where it is.',
      'The heavenly bodies are not objects but openings. Each is a vent in a vast hollow wheel filled with fire and wrapped in mist, and we see the fire only where the vent lets it out. The wheels turn about a slanting axis once a day. The Moon waxes and wanes as its vent opens and closes.',
      'The order is startling: the stars are nearest, then the Moon, then the Sun, at 9, 18 and 27 times the size of the Earth. There are no planets here at all, and no ecliptic.',
    ],
    achieved: [
      'The Earth floats free in space, so the heavens can pass beneath it.',
      'The cosmos has depth: bodies lie at different distances, given as numbers.',
      'A mechanism, not a myth, accounts for day, night, the seasons and the Moon\'s phases.',
    ],
    troubles: [
      'Nothing is said about the five wandering stars.',
      'Stars nearer than the Moon cannot be squared with the Moon passing in front of them.',
    ],
    lookFor: [
      'Switch to the view from Earth and watch the Sun rise, cross the sky and set.',
      'Speed up time: the daily turning is suppressed and you see the Sun\'s wheel slide along the axis through the year.',
      'Watch the Moon\'s vent close toward new moon.',
    ],
    fidelity: 'The 3:1 drum is well attested. The 9, 18, 27 scheme is the Tannery-Diels reconstruction. The sliding Sun-wheel follows Couprie. The Sun and Moon are placed using later mean motions so that seasons and phases fall on the right dates.',
  },
  {
    id: 'eudoxus',
    title: 'Eudoxus',
    subtitle: 'Spheres within spheres',
    dateLabel: 'c. 370 BCE',
    place: 'Cnidus and Athens',
    defaultJd: calendarToJd(-369, 3, 1),
    defaultSpeed: 20,
    createModel: () => createHomocentricModel({ id: 'eudoxus' }),
    features: { ...UNAIDED },
    lede: 'The first geometrical theory of the planets: every motion in the sky built from spheres turning uniformly about the Earth.',
    paragraphs: [
      'The tradition is that Plato set the problem: what uniform circular motions will account for what the planets are seen to do? Eudoxus answered with nests of concentric spheres. A planet is fixed to the equator of the innermost sphere of its nest, and each sphere turns steadily about an axis set in the one outside it.',
      'Two spheres are easy: one for the daily turning of the sky, one for the slow journey round the zodiac. The stroke of genius is the inner pair. Their axes are tilted to one another and they turn at equal and opposite rates, so the planet traces a figure of eight, the hippopede or horse-fetter. Laid along the zodiac and carried forward, it makes the planet slow, stop, and run backwards.',
      'The model uses 27 spheres in all and says nothing of distances. It could not: every body stays exactly as far from the Earth as it began.',
    ],
    achieved: [
      'Retrograde motion, from nothing but uniform rotation.',
      'Works well for Jupiter and Saturn.',
      'Sets the programme for two thousand years: save the appearances with circles.',
    ],
    troubles: [
      'The planets visibly change brightness, so they must change distance. Here they cannot.',
      'Venus can never be made to retrograde, and Mars only with a false period.',
      'The seasons are of unequal length; the model makes them equal.',
    ],
    lookFor: [
      'Select Jupiter to see its four spheres, their axes and the hippopede.',
      'Select Mars: it retrogrades three times too often.',
      'Select Venus and look from Earth: it never turns back.',
    ],
    fidelity: 'Sphere counts and the hippopede mechanism are attested. No ancient inclinations survive: Saturn and Jupiter follow Schiaparelli, Venus and Mercury are fixed by their greatest elongations, and Mars uses a conjectured 260-day period. Radii are schematic, since the model implies none.',
  },
  {
    id: 'aristotle',
    title: 'Aristotle',
    subtitle: 'The crystalline cosmos',
    dateLabel: 'c. 340 BCE',
    place: 'Athens',
    defaultJd: calendarToJd(-339, 3, 1),
    defaultSpeed: 20,
    createModel: () => createHomocentricModel({ id: 'aristotle', aristotle: true }),
    features: { ...UNAIDED },
    lede: 'Geometry becomes physics. The spheres are real, solid and made of a fifth element, and the universe is a single connected machine.',
    paragraphs: [
      'Eudoxus offered a calculating device. Aristotle asked what the world is actually made of, and took the spheres to be real bodies of aether, nested without any gap. That created a mechanical problem: if the spheres touch, each planet\'s private motions would be passed down to the planet beneath.',
      'His solution was the counteracting spheres. Below each nest he placed spheres turning on the same axes at equal and opposite rates, undoing every motion but the daily one before the next nest begins. With Callippus\'s refinements that makes 55 spheres. They change nothing you can see, which is exactly their job.',
      'Below the Moon everything is different. There the four elements each seek their natural place: earth at the centre, then water, air and fire. Above the Moon nothing is ever born or destroyed. This one picture answered questions in physics, cosmology and theology together, which is why it proved so hard to give up.',
    ],
    achieved: [
      'A complete physical universe, finite, full and centred on the Earth.',
      'Explains why heavy things fall and why the heavens circle forever.',
      'Gives good arguments that the Earth is a sphere and does not move.',
    ],
    troubles: [
      'Inherits every failure of the homocentric spheres.',
      'Forbids any change in the heavens, a claim later overthrown by a new star and a comet.',
    ],
    lookFor: [
      'The cutaway shows the solid shells, packed with no void between them.',
      'Select a planet to see its counteracting spheres beneath its carrying spheres.',
      'Zoom in on the Earth to find the shells of water, air and fire.',
    ],
    fidelity: 'The counts of 33 and 55 are from the Metaphysics. Seventeen counteracting spheres are drawn on their true axes. Callippus\'s seven extra spheres, and the five counteracting spheres paired with them, are counted but not drawn, because what they did is not preserved.',
  },
  {
    id: 'hipparchus',
    title: 'Apollonius and Hipparchus',
    subtitle: 'Epicycles and eccentrics',
    dateLabel: 'c. 200-130 BCE',
    place: 'Alexandria and Rhodes',
    defaultJd: calendarToJd(-129, 3, 1),
    defaultSpeed: 20,
    createModel: () => createPtolemaicModel({ id: 'hipparchus', equant: false, eccentric: false, lunarCrank: false }),
    features: { ...UNAIDED },
    lede: 'Let the planet ride a small circle whose centre rides a large one, and it can approach and recede. The brightness problem is solved at a stroke.',
    paragraphs: [
      'Apollonius of Perga studied two devices. In the first the planet moves on an epicycle, a small circle whose centre travels round a large one, the deferent. When the planet is on the inside of its epicycle it moves backwards against the stars and is also nearest the Earth, which is just when the planets are seen to be brightest. In the second, the eccentric, the body moves on a circle whose centre is not the Earth. He proved the two can be made exactly equivalent.',
      'Hipparchus turned the geometry into numbers. From the unequal lengths of the seasons he found that the Sun\'s circle must be off-centre by one twenty-fourth of its radius, toward the middle of Gemini. He built a theory of the Moon, compiled a star catalogue, and discovered the precession of the equinoxes.',
      'He attempted no theory of the planets, judging the observations insufficient. The planets here therefore ride plain epicycles on circles centred exactly on the Earth.',
    ],
    achieved: [
      'Retrograde motion and changing brightness from a single device.',
      'A quantitative solar theory that predicts the unequal seasons.',
      'Distances now vary, as the appearances demand.',
    ],
    troubles: [
      'Plain epicycles do not fit: real retrograde loops vary in size and spacing round the zodiac.',
      'No numerical planetary theory yet exists.',
    ],
    lookFor: [
      'Select Mars and watch how it retrogrades on the inner side of its epicycle, closest to the Earth.',
      'Notice that each outer planet\'s epicycle arm always points the way the Sun does.',
      'Select the Sun to see the off-centre circle that gives unequal seasons.',
    ],
    fidelity: 'The solar model is Hipparchus\'s own. The planetary epicycle sizes are borrowed from Ptolemy, three centuries later, because Hipparchus left none; treat them as illustrative. Distances follow the later nested scheme.',
  },
  {
    id: 'ptolemy',
    title: 'Ptolemy',
    subtitle: 'The Almagest',
    dateLabel: 'c. 150 CE',
    place: 'Alexandria',
    defaultJd: calendarToJd(137, 7, 20),
    defaultSpeed: 20,
    createModel: () => createPtolemaicModel({ id: 'ptolemy' }),
    features: { ...UNAIDED },
    lede: 'The complete mathematical astronomy of antiquity, able to predict any planet\'s place on any date. It stood for fourteen hundred years.',
    paragraphs: [
      'Ptolemy found that a plain epicycle on a plain eccentric was not enough, and added the equant. The deferent\'s centre lies off the Earth on one side; the equant lies the same distance beyond it. The epicycle\'s centre keeps to the deferent but moves uniformly as seen from the equant, so it really does speed up and slow down. It worked superbly. It also quietly abandoned uniform circular motion, and astronomers never forgot it.',
      'Two bodies needed more. Mercury\'s deferent centre is carried round a small circle. The Moon\'s is too, which drags its epicycle toward the Earth at the quarters; this fits the Moon\'s position well but would make it look almost twice as large as it ever does.',
      'In a later work, the Planetary Hypotheses, Ptolemy packed the models together so that each planet\'s shell just touches the next, with no wasted space. That fixed the size of the universe: the stars lie about twenty thousand Earth radii away. Those nested distances are what you see here.',
    ],
    achieved: [
      'Quantitative prediction of every planet, to within the accuracy of the observations.',
      'Unequal retrograde loops, handled by the equant.',
      'A definite size for the cosmos.',
    ],
    troubles: [
      'The equant breaks the rule of uniform circular motion. This was Copernicus\'s chief complaint.',
      'Every planet\'s model secretly contains the Sun\'s motion, and nothing explains why.',
      'The order of the planets is a convention. The geometry does not determine it.',
      'Venus always lies between us and the Sun, so it could never show a full phase.',
    ],
    lookFor: [
      'Select Mars. Find the deferent\'s centre and the equant, either side of nothing in particular.',
      'Select Mercury to see its deferent centre circling on a crank.',
      'Select the Moon and watch its epicycle pulled inward at the quarters.',
      'Use the focus buttons: the inner spheres are tiny beside Saturn\'s.',
    ],
    fidelity: 'Every parameter is from the Almagest and the Planetary Hypotheses, and the construction is checked against an independent implementation. The Moon\'s small prosneusis correction and the oscillating latitude devices are omitted. The Moon\'s distance scale was recalled, not re-verified, though it reproduces Ptolemy\'s known extremes.',
  },
  {
    id: 'copernicus',
    title: 'Copernicus',
    subtitle: 'The Earth moves',
    dateLabel: '1543',
    place: 'Frombork',
    defaultJd: calendarToJd(1543, 5, 24),
    defaultSpeed: 20,
    createModel: () => createHeliocentricModel({ id: 'copernicus', orbits: 'circles', center: 'sun', starRadius: 2000 }),
    features: { ...UNAIDED },
    lede: 'Put the Sun at the centre and set the Earth in motion, and the great irregularities of the planets turn out to be reflections of our own movement.',
    paragraphs: [
      'In On the Revolutions, Copernicus made the Earth a planet, turning daily on its axis and circling the Sun yearly. Retrograde motion needs no epicycle now. We overtake the outer planets on the inside track, and as we pass, they seem to drift backwards, just as a slower carriage does.',
      'The reward is order. In Ptolemy\'s scheme the sequence and sizes of the planetary spheres were conventions. Here the geometry fixes them. Each planet\'s distance from the Sun follows from its observed motions, and the sizes of the old epicycles turn out to be nothing but the size of the Earth\'s own orbit seen from different distances. The mysterious link between every planet and the Sun is explained.',
      'But Copernicus despised the equant and was determined to use only uniform circles. So his planets still ride small epicyclets, and his system was neither simpler in its details nor more accurate than Ptolemy\'s. Its appeal was harmony, not precision.',
    ],
    achieved: [
      'Retrograde motion explained, not merely reproduced.',
      'The order and relative distances of the planets determined for the first time.',
      'The equant eliminated.',
    ],
    troubles: [
      'No more accurate than Ptolemy, and still full of small circles.',
      'No stellar parallax is seen, so the stars must be absurdly far away.',
      'A moving Earth contradicts all of Aristotle\'s physics, and nothing yet replaces it.',
    ],
    lookFor: [
      'Select Mars and turn on the line of sight. Watch it swing backwards as the Earth overtakes.',
      'Compare with Ptolemy on the same date using Lock date: the sky looks the same.',
      'Zoom in on any planet to find its epicyclet.',
    ],
    fidelity: 'Orbit radii are Copernicus\'s own, to the two decimals that could be sourced. Mean motions are modern, because his parameters were fitted to his own time as these are. The circles are referred to the true Sun rather than his mean Sun, and the inner planets use the same construction as the outer ones; both are simplifications.',
  },
  {
    id: 'tycho',
    title: 'Tycho Brahe',
    subtitle: 'A compromise, and the end of the spheres',
    dateLabel: '1588',
    place: 'Hven',
    defaultJd: calendarToJd(1588, 3, 1),
    defaultSpeed: 20,
    createModel: () => createHeliocentricModel({ id: 'tycho', orbits: 'circles', center: 'earth', starRadius: 12 }),
    features: { ...UNAIDED },
    lede: 'The Earth stands still at the centre. The Sun circles it, and all the other planets circle the Sun.',
    paragraphs: [
      'Tycho was the greatest observer before the telescope, and he could not accept a moving Earth. His instruments should have shown the stars shifting as the Earth went round the Sun, and they showed nothing. Either the stars were inconceivably remote and inconceivably large, or the Earth was at rest.',
      'His system keeps every geometrical advantage of Copernicus. Seen from the Earth, the two are identical: every planet appears in exactly the same direction at exactly the same distance. Only the question of what is really moving differs, and no observation of the time could settle it.',
      'Yet Tycho destroyed the old cosmos all the same. The new star of 1572 showed the heavens could change. The comet of 1577 lay far beyond the Moon and passed straight through where the crystalline spheres should be. In his own system the orbit of Mars cuts across the orbit of the Sun. Solid spheres were finished.',
    ],
    achieved: [
      'All the Copernican harmonies, with no moving Earth and no missing parallax.',
      'Observations accurate to about a minute of arc, ten times better than any before.',
      'The crystalline spheres abolished.',
    ],
    troubles: [
      'With no spheres, nothing carries the planets. What moves them?',
      'It shares every inaccuracy of the circles it is built from.',
    ],
    lookFor: [
      'Switch between this and Copernicus with Lock date on. From Earth, nothing changes.',
      'Watch the orbit of Mars sweep across the path of the Sun.',
      'The stars lie just beyond Saturn, as Tycho believed.',
    ],
    fidelity: 'This is exactly the Copernican model re-expressed about a stationary Earth; the test suite verifies the two agree in every direction and distance to nine decimal places.',
  },
  {
    id: 'kepler',
    title: 'Kepler',
    subtitle: 'The ellipse',
    dateLabel: '1609',
    place: 'Prague',
    defaultJd: calendarToJd(1609, 6, 1),
    defaultSpeed: 20,
    createModel: () => createHeliocentricModel({ id: 'kepler', orbits: 'ellipses', center: 'sun', starRadius: 2000 }),
    features: { ...UNAIDED },
    lede: 'After two thousand years the circle is abandoned. The planets move on ellipses, faster when near the Sun, and every epicycle vanishes.',
    paragraphs: [
      'Kepler inherited Tycho\'s observations of Mars, the planet that fits circles worst. His best circular theory missed Tycho\'s positions by eight minutes of arc. Earlier astronomers would have been delighted. Kepler knew Tycho did not make errors of that size, and wrote that those eight minutes pointed the way to a complete reformation of astronomy.',
      'Years of calculation gave him two laws, published in the New Astronomy. A planet moves on an ellipse with the Sun at one focus. The line from the Sun to the planet sweeps out equal areas in equal times, so the planet hurries near the Sun and dawdles far from it. A third law, relating each planet\'s period to its distance, followed in 1619.',
      'Just as new was his insistence on a physical cause. The Sun is not merely at the centre; it drives the planets. Astronomy was becoming celestial physics.',
    ],
    achieved: [
      'A single curve replaces every eccentric, epicycle and equant.',
      'Predictions dozens of times more accurate than any before.',
      'The Sun made the physical cause of planetary motion.',
    ],
    troubles: [
      'Why an ellipse? The laws describe the motion superbly and explain none of it.',
      'Few contemporaries followed him. Galileo ignored the ellipses entirely.',
    ],
    lookFor: [
      'Select Mars or Mercury to see the swept sector change shape while keeping its area.',
      'Find the empty focus, where there is nothing at all.',
      'Compare with Copernicus using Lock date: Mars differs most, as it did for Kepler.',
    ],
    fidelity: 'Orbits use modern elements from NASA JPL, accurate as astronomy but not Kepler\'s own figures. They are extrapolated well outside JPL\'s stated range of 1800-2050, so positions in this period are approximate.',
  },
  {
    id: 'galileo',
    title: 'Galileo',
    subtitle: 'The telescope',
    dateLabel: '1610',
    place: 'Padua',
    defaultJd: calendarToJd(1610, 1, 7.75),
    defaultSpeed: 1,
    createModel: () =>
      createHeliocentricModel({ id: 'galileo', orbits: 'circles', center: 'sun', starRadius: 5000, features: { jupiterMoons: true } }),
    features: {
      ...UNAIDED,
      telescope: true,
      lunarRelief: true,
      saturn: 'ears',
      jupiterMoons: true,
      magnitudeLimit: TELESCOPIC,
    },
    lede: 'For the first time anyone looks at the sky through an instrument, and sees things no theory had predicted.',
    paragraphs: [
      'On 7 January 1610 Galileo turned his telescope on Jupiter and saw small stars beside it. Night after night they changed places but never left. They were moons, circling Jupiter. Here was a second centre of motion in the universe, and proof that a planet could move without leaving its moons behind, which had been a standing objection to a moving Earth.',
      'The Moon had mountains and craters, and was no perfect aethereal sphere. The Milky Way dissolved into countless stars. Saturn looked as if it had handles or companions, which Galileo could not explain.',
      'Late in 1610 came the decisive one. Venus shows a full set of phases, from a small round disc to a large thin crescent. In Ptolemy\'s arrangement Venus always lies between us and the Sun and could never appear full. That arrangement was now impossible. But the phases fit Tycho\'s system exactly as well as Copernicus\'s, and the telescope alone could not choose between them.',
    ],
    achieved: [
      'Ptolemy\'s arrangement of Venus refuted by direct observation.',
      'A second centre of revolution found at Jupiter.',
      'The heavens shown to be rough, changeable and earthlike.',
    ],
    troubles: [
      'Nothing seen decides between Copernicus and Tycho.',
      'Galileo kept to circles and never adopted Kepler\'s ellipses, which is why this era shows circles again.',
    ],
    lookFor: [
      'Look from Earth, select Jupiter and zoom far in: four moons shuttle from side to side.',
      'Select Venus and zoom in to see its phase, then follow it for a year.',
      'Go back to Ptolemy and turn on the anachronistic telescope: his Venus is only ever a crescent.',
      'Zoom in on Saturn to see what puzzled Galileo.',
    ],
    fidelity: 'The moons\' distances and periods are real; their positions on a given night are not, so this is not a record of what Galileo saw on any date. The catalogue ends at magnitude 6, far short of what his telescope reached, so the extra stars are only a gesture at the real increase.',
  },
  {
    id: 'newton',
    title: 'Newton',
    subtitle: 'Universal gravitation',
    dateLabel: '1687',
    place: 'Cambridge',
    defaultJd: calendarToJd(1687, 7, 5),
    defaultSpeed: 20,
    createModel: () =>
      createHeliocentricModel({
        id: 'newton',
        orbits: 'ellipses',
        center: 'sun',
        starRadius: 5000,
        features: { jupiterMoons: true, titan: true, comet: true },
      }),
    features: {
      ...UNAIDED,
      telescope: true,
      lunarRelief: true,
      saturn: 'ring',
      jupiterMoons: true,
      titan: true,
      comet: true,
      magnitudeLimit: TELESCOPIC,
    },
    lede: 'One law, the same on Earth and in the heavens, accounts for the fall of a stone, the orbit of the Moon, and the path of a comet.',
    paragraphs: [
      'In the Principia Newton showed that a single force, falling off as the square of the distance, makes every planet move on an ellipse with the Sun at a focus, sweep equal areas in equal times, and obey Kepler\'s third law. Kepler\'s three rules stop being brute facts and become consequences.',
      'The same force holds the Moon in its orbit and pulls an apple to the ground. Aristotle\'s division of the world into a corruptible Earth and perfect heavens is gone. So is the question of what carries the planets round: nothing needs to. A body in motion keeps moving, and gravity only bends its path.',
      'Comets, once omens and then Tycho\'s wrecking ball, become ordinary members of the system on very long ellipses. Halley applied the theory to the comet of 1682 and predicted its return. By now the telescope had also resolved Galileo\'s puzzle: Huygens showed Saturn is surrounded by a thin flat ring, and found its moon Titan. The cosmos is no longer a closed set of spheres but bodies moving through boundless space.',
    ],
    achieved: [
      'Kepler\'s laws derived from a single physical principle.',
      'Earthly and celestial physics unified.',
      'Comets, tides and the shape of the Earth brought under the same law.',
    ],
    troubles: [
      'Gravity acts across empty space with no mechanism, which troubled Newton himself.',
      'The planets\' pulls on each other should slowly disturb the system. Is it stable?',
    ],
    lookFor: [
      'Follow the comet: it crawls for decades in the dark, then whips round the Sun.',
      'Look from Earth and zoom in on Saturn to see the ring and Titan.',
      'Select Mars for the swept area: now it has an explanation.',
    ],
    fidelity: 'Planetary orbits use NASA JPL elements. The comet\'s date of perihelion and the size and shape of its orbit are sourced; its orientation, the Moon, the satellites and the orientation of Saturn\'s ring use approximate elements that were recalled rather than re-verified. No forces are computed: the bodies follow Kepler\'s ellipses, which is what Newton\'s law yields for two bodies. That has a visible consequence for the comet. It passes the Sun on 15 September 1682, as it did, but with no pull from the planets it comes back in 1758, the year Halley named, and not in March 1759, when the real comet arrived, held back by Jupiter and Saturn.',
  },
];

const BY_ID = new Map(ERAS.map((era) => [era.id, era]));

export function getEra(id) {
  const era = BY_ID.get(id);
  if (!era) throw new Error(`Unknown era: ${id}`);
  return era;
}

export const ERA_IDS = ERAS.map((era) => era.id);

/** Display names and colours of every body that can appear. */
export const BODIES = {
  sun: { name: 'Sun', color: '#ffd27a' },
  moon: { name: 'Moon', color: '#cdd5e2' },
  mercury: { name: 'Mercury', color: '#b8a48c' },
  venus: { name: 'Venus', color: '#f2dca6' },
  earth: { name: 'Earth', color: '#5fa8ff' },
  mars: { name: 'Mars', color: '#e2684c' },
  jupiter: { name: 'Jupiter', color: '#e3bb8d' },
  saturn: { name: 'Saturn', color: '#dcc892' },
  io: { name: 'Io', color: '#f0e08a' },
  europa: { name: 'Europa', color: '#d9d2c0' },
  ganymede: { name: 'Ganymede', color: '#b9ab98' },
  callisto: { name: 'Callisto', color: '#8f8577' },
  titan: { name: 'Titan', color: '#e0a860' },
  comet: { name: 'Comet of 1682', color: '#a8f0ff' },
};
