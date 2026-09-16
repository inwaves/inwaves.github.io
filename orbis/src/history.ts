export type ModelId =
  | "anaximander"
  | "eudoxus"
  | "aristotle"
  | "hipparchus"
  | "ptolemy"
  | "copernicus"
  | "tycho"
  | "kepler"
  | "galileo"
  | "harmony";
export interface Source {
  title: string;
  author: string;
  url: string;
}
export interface Era {
  id: ModelId;
  name: string;
  date: string;
  year: number;
  place: string;
  title: string;
  subtitle: string;
  description: string;
  center: string;
  motion: string;
  idea: string;
  change: string;
  limitation: string;
  evidence: string;
  experiment: string;
  experimentText: string;
  sourceIds: string[];
}
export const sources: Record<string, Source> = {
  anaximander: {
    title: "Anaximander: astronomy and the celestial wheels",
    author: "Dirk L. Couprie · Internet Encyclopedia of Philosophy",
    url: "https://iep.utm.edu/anaximander/#H6",
  },
  systems: {
    title: "Astronomical systems",
    author: "Museo Galileo · Institute and Museum of the History of Science",
    url: "https://catalogue.museogalileo.it/indepth/AstronomicalSystems.html",
  },
  hipparchus: {
    title: "Ptolemy, Almagest III.4: the eccentric solar model",
    author: "Henry Mendell · California State University, Los Angeles",
    url: "https://web.calstatela.edu/faculty/hmendel/Ancient%20Mathematics/Astronomy/Ptolemy/Sun/Eccenter/Ptol.Alm.iii.4.html",
  },
  epicycle: {
    title: "Ptolemaic epicycle machine",
    author: "Harvard Natural Sciences Lecture Demonstrations",
    url: "https://sciencedemonstrations.fas.harvard.edu/presentations/ptolemaic-epicycle-machine",
  },
  kepler: {
    title: "Orbits and Kepler’s laws",
    author: "NASA Science",
    url: "https://science.nasa.gov/solar-system/orbits-and-keplers-laws/",
  },
  galileo: {
    title: "Satellites of Jupiter",
    author: "Albert Van Helden · The Galileo Project, Rice University",
    url: "https://galileo.library.rice.edu/sci/observations/jupiter_satellites.html",
  },
};
export const eras: Era[] = [
  {
    id: "anaximander",
    name: "Anaximander",
    date: "c. 550 BCE",
    year: -550,
    place: "Miletus · Ancient Greece",
    title: "Fire beyond the familiar.",
    subtitle: "THE COSMOS OF WHEELS",
    description:
      "An unsupported Earth hangs in space. Around it, great wheels of fire turn inside dark, hollow rims. Their openings are what we call the Sun, Moon, and stars.",
    center: "A drum-shaped Earth",
    motion: "Revolving wheels of fire",
    idea: "A world without supports",
    change:
      "The heavens continue beneath the Earth. A complete circle replaces the familiar vault overhead.",
    limitation:
      "A conjectural reconstruction from later testimonies. The stars are nearer than the Moon, and the Sun is farthest away. Wheel inclinations and speeds here are illustrative; the fire is revealed as a visual cutaway, not exposed in the original conception.",
    evidence: "Later testimonies",
    experiment: "Reveal the celestial wheels",
    experimentText:
      "The bright points are apertures, not modern spherical worlds. The cylindrical Earth floats at the center. The inner star wheels, middle Moon wheel, and outer Sun wheel turn around it.",
    sourceIds: ["anaximander"],
  },
  {
    id: "eudoxus",
    name: "Eudoxus",
    date: "c. 350 BCE",
    year: -350,
    place: "Cnidus · Ancient Greece",
    title: "Circles within spheres.",
    subtitle: "THE HOMOCENTRIC COSMOS",
    description:
      "What if every wandering light belonged to a set of turning spheres? Tilt their axes and combine their rotations: a planet can hesitate, reverse, and continue on its way.",
    center: "An immobile Earth",
    motion: "Nested, concentric spheres",
    idea: "Order from combined rotations",
    change:
      "A geometrical mechanism begins to account for the wandering planets without abandoning circular motion.",
    limitation:
      "Three representative rotations per planet are shown, not a reconstruction of all 27 spheres. Distances from Earth stay constant. Whether Eudoxus intended physical spheres is uncertain; his writings survive only through later accounts.",
    evidence: "Reconstructed geometry",
    experiment: "Follow the nested rotations",
    experimentText:
      "Watch Mars weave above and below the ecliptic while staying the same distance from Earth. These coupled rotations illustrate the homocentric principle, not a fit to Eudoxus’s lost parameters.",
    sourceIds: ["systems"],
  },
  {
    id: "aristotle",
    name: "Aristotle",
    date: "c. 330 BCE",
    year: -330,
    place: "Athens · Ancient Greece",
    title: "A machinery of perfection.",
    subtitle: "THE FINITE, ORDERED COSMOS",
    description:
      "Earth rests at the center of a finite universe. Above the changing world below the Moon, the heavens are made of aether: perfect bodies carried by physical spheres.",
    center: "An immobile Earth",
    motion: "Interlocking celestial spheres",
    idea: "A physical order of the heavens",
    change:
      "The spheres become a connected physical mechanism, transmitting motion inward from the outermost heavens.",
    limitation:
      "Representative translucent shells stand in for the much larger system, often counted as 55 spheres. The added counter-rotating “unwinding” spheres are not individually modeled. Surface colors are symbolic.",
    evidence: "Textual model · schematic",
    experiment: "Look inside the spheres",
    experimentText:
      "The translucent shells are meant to be physical carriers. Unlike an epicycle, every sphere shares Earth’s center; a planet cannot become closer to Earth in this model.",
    sourceIds: ["systems"],
  },
  {
    id: "hipparchus",
    name: "Hipparchus",
    date: "c. 150 BCE",
    year: -150,
    place: "Rhodes · Ancient Greece",
    title: "A circle, slightly off-center.",
    subtitle: "THE ECCENTRIC SUN",
    description:
      "The seasons are not equally long. Hipparchus explains this by letting the Sun move uniformly on a circle whose center is not quite the Earth.",
    center: "Earth, offset from the circle",
    motion: "An eccentric solar circle",
    idea: "Geometry meets measurement",
    change:
      "Uniform motion around an offset center creates a changing apparent speed when seen from Earth.",
    limitation:
      "This chapter deliberately shows the solar model, not an invented complete planetary system. The offset is 1/24 of the radius, following the value attributed to Hipparchus by Ptolemy. The initial direction is arbitrary.",
    evidence: "Solar theory via Ptolemy",
    experiment: "Find the offset center",
    experimentText:
      "The small cross marks the circle’s center. Earth is slightly displaced from it. The Sun travels equal arcs in equal times, but the angles seen from Earth are unequal.",
    sourceIds: ["hipparchus"],
  },
  {
    id: "ptolemy",
    name: "Ptolemy",
    date: "c. 150 CE",
    year: 150,
    place: "Alexandria · Roman Egypt",
    title: "Everything revolves around us.",
    subtitle: "THE GEOCENTRIC COSMOS",
    description:
      "A still Earth. A turning heaven. The Sun, Moon, and five known planets circle our world, their wandering paths explained by an intricate dance of circles upon circles.",
    center: "An immobile Earth",
    motion: "Deferents & epicycles",
    idea: "The wandering stars, explained",
    change:
      "A small circle rides on a larger one. Add an offset center and an equant, and the geometry can account for a planet’s uneven pace and backward turns.",
    limitation:
      "A teaching model, not the full Almagest. Representative epicycles and eccentric deferents include an equant for each planet. Mercury’s special machinery and latitude corrections are omitted. The daily rotation is factored out.",
    evidence: "Documented model · simplified",
    experiment: "Explore an epicycle",
    experimentText:
      "Follow Mars on the small circle, the epicycle. Its center travels on the larger deferent. Angular motion is uniform as seen from the equant, not from Earth or the circle’s center. The dotted trail shows the resulting path.",
    sourceIds: ["epicycle", "systems"],
  },
  {
    id: "copernicus",
    name: "Copernicus",
    date: "1543",
    year: 1543,
    place: "Frombork · Royal Prussia",
    title: "What if the Earth moves?",
    subtitle: "THE HELIOCENTRIC TURN",
    description:
      "The Sun takes a central place, and Earth joins the planets. The heavens seem to turn because we turn. Mars appears to move backward when our moving viewpoint overtakes it.",
    center: "The Sun, near the center",
    motion: "Uniform compounded circles",
    idea: "We become one of the planets",
    change:
      "Earth’s annual journey makes the planets’ ordering intelligible. The Moon still circles Earth: not everything needs the same center.",
    limitation:
      "Copernicus retained epicycles and eccentric circles. Small illustrative epicycles are shown here, not his exact multi-circle construction. The Sun is centered for clarity; orbit sizes are compressed.",
    evidence: "Documented model · simplified",
    experiment: "Trace a wandering planet",
    experimentText:
      "The geometry is now centered near the Sun, but the retrograde pattern survives in the Earth-relative chart. The small secondary circles remind us that Copernicus did not yet use Kepler’s ellipses.",
    sourceIds: ["systems", "kepler"],
  },
  {
    id: "tycho",
    name: "Tycho Brahe",
    date: "1588",
    year: 1588,
    place: "Hven · Kingdom of Denmark",
    title: "Two centers. One compromise.",
    subtitle: "THE GEOHELIOCENTRIC COSMOS",
    description:
      "Keep the Earth still, but let the other planets follow the Sun. As the Sun travels around Earth, it carries the planetary system with it.",
    center: "Earth — and the moving Sun",
    motion: "Planets orbit the orbiting Sun",
    idea: "The same sky, another framework",
    change:
      "The intersecting paths challenge solid celestial spheres. A fixed Earth can still coexist with planets that circle the Sun.",
    limitation:
      "A circular kinematic schematic of Tycho’s arrangement. Detailed solar eccentricity and lunar corrections are omitted. Its shared geometry with the heliocentric models is deliberate; apparent positions alone do not settle the choice.",
    evidence: "Documented model · simplified",
    experiment: "Follow the moving Sun",
    experimentText:
      "Earth remains at the origin. The Sun carries the centers of the five planetary orbits around Earth, while our Moon continues to circle Earth itself.",
    sourceIds: ["systems", "kepler"],
  },
  {
    id: "kepler",
    name: "Kepler",
    date: "1609",
    year: 1609,
    place: "Prague · Holy Roman Empire",
    title: "Let go of the perfect circle.",
    subtitle: "THE ELLIPTICAL COSMOS",
    description:
      "Tycho’s observations of Mars resist the old circles. Kepler finds a different shape: an ellipse, with the Sun at one focus. Near the Sun, a planet moves faster.",
    center: "The Sun at one focus",
    motion: "Ellipses & equal areas",
    idea: "The observations reshape the orbit",
    change:
      "Two laws replace the old circular machinery: elliptical paths and equal areas swept in equal times.",
    limitation:
      "Kepler’s equation governs the animation. Modern approximate eccentricities and periods illustrate the laws, not a historical ephemeris. Distances are compressed. No Jupiter moons appear: this chapter precedes the 1610 observations.",
    evidence: "Published laws · 1609",
    experiment: "Watch the changing speed",
    experimentText:
      "The Sun is at a focus, not the geometric center of each ellipse. Follow Mercury, whose eccentricity makes the changing speed easiest to see. The radius line sweeps equal areas in equal times.",
    sourceIds: ["kepler"],
  },
  {
    id: "galileo",
    name: "Galileo",
    date: "1610",
    year: 1610,
    place: "Padua · Republic of Venice",
    title: "Other worlds have moons.",
    subtitle: "THE TELESCOPIC REVELATION",
    description:
      "A telescope turns points of light beside Jupiter into a small orbiting system. The Earth is not the only center of motion. The heavens contain more than naked eyes can see.",
    center: "More than one center of motion",
    motion: "Four satellites orbit Jupiter",
    idea: "New eyes, a larger universe",
    change:
      "Four Jovian satellites enter the known heavens in January 1610. The phases of Venus, observed later that year, challenge the traditional Ptolemaic arrangement.",
    limitation:
      "An observational chapter over a circular heliocentric scaffold, not a unique “Galilean system.” The moons did not prove Earth’s motion; Tycho’s system could accommodate them too. Modern moon names are supplied for orientation; Galileo called them Medicean stars.",
    evidence: "Telescopic observations · 1610",
    experiment: "Visit Jupiter’s four moons",
    experimentText:
      "Io, Europa, Ganymede, and Callisto now circle Jupiter. Their orbits are enlarged for visibility. Galileo first mistook these points for stars; repeated observations revealed that they accompanied Jupiter.",
    sourceIds: ["galileo", "systems"],
  },
  {
    id: "harmony",
    name: "Kepler’s harmony",
    date: "1619",
    year: 1619,
    place: "Linz · Holy Roman Empire",
    title: "A pattern across the heavens.",
    subtitle: "THE HARMONY OF THE WORLDS",
    description:
      "The farther a planet lies from the Sun, the longer its year. Kepler links distance and period in a third law, bringing the motions of different worlds into one mathematical relation.",
    center: "The Sun at one focus",
    motion: "Three laws of planetary motion",
    idea: "One relation across many orbits",
    change:
      "The square of an orbital period is proportional to the cube of its semimajor axis. The new relation joins the elliptical and equal-area laws.",
    limitation:
      "A retrospective synthesis of Kepler’s laws with the four already observed Jovian moons. Approximate modern orbital elements are used. Compressed display radii do not visually preserve the third-law distance ratio; the periods do preserve the ordering.",
    evidence: "Published law · 1619",
    experiment: "Explore the Jovian system",
    experimentText:
      "Kepler’s ellipses and Galileo’s observed moons can now share a picture of the heavens. This is a historical synthesis, not a claim that everyone adopted one worldview in 1619.",
    sourceIds: ["kepler", "galileo"],
  },
];
export const getEra = (id: string | null): Era =>
  eras.find((era) => era.id === id) ?? eras[4];
export const hasJovianMoons = (id: ModelId) =>
  id === "galileo" || id === "harmony";
