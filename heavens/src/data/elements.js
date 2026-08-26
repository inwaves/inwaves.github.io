// Mean orbital elements (J2000, ecliptic frame) used both as the "true" reference
// ephemeris and as the source of every historical model's parameters.
// a in AU, angles in degrees, rates in degrees per day.

// General precession in longitude: 5028.796 arcsec per Julian century.
// The planetary rates below (JPL approximate elements) are referred to the fixed J2000
// ecliptic and equinox, so they are used as they stand. The Moon's published mean motion
// is tropical (referred to the moving equinox) and is corrected to the fixed frame so that
// positions stay consistent with the J2000 star field two millennia into the past.
export const PRECESSION_DEG_PER_CENTURY = 1.3969713;
export const PRECESSION_DEG_PER_DAY = PRECESSION_DEG_PER_CENTURY / 36525;

const RAW = {
  mercury: { name: 'Mercury', a: 0.38709893, e: 0.20563069, i: 7.00487, node: 48.33167, peri: 77.45645, L0: 252.25084, n: 4.09233445 },
  venus:   { name: 'Venus',   a: 0.72333199, e: 0.00677323, i: 3.39471, node: 76.68069, peri: 131.53298, L0: 181.97973, n: 1.60213034 },
  earth:   { name: 'Earth',   a: 1.00000011, e: 0.01671022, i: 0.00005, node: -11.26064, peri: 102.94719, L0: 100.46435, n: 0.98560912 },
  mars:    { name: 'Mars',    a: 1.52366231, e: 0.09341233, i: 1.85061, node: 49.57854, peri: 336.04084, L0: 355.45332, n: 0.52402068 },
  jupiter: { name: 'Jupiter', a: 5.20336301, e: 0.04839266, i: 1.30530, node: 100.55615, peri: 14.75385, L0: 34.40438, n: 0.08308529 },
  saturn:  { name: 'Saturn',  a: 9.53707032, e: 0.05415060, i: 2.48446, node: 113.71504, peri: 92.43194, L0: 49.94432, n: 0.03344414 },
  uranus:  { name: 'Uranus',  a: 19.19126393, e: 0.04716771, i: 0.76986, node: 74.22988, peri: 170.96424, L0: 313.23218, n: 0.01173129 },
  neptune: { name: 'Neptune', a: 30.06896348, e: 0.00858587, i: 1.76917, node: 131.72169, peri: 44.97135, L0: 304.88003, n: 0.00598110 },
  pluto:   { name: 'Pluto',   a: 39.48168677, e: 0.24880766, i: 17.14175, node: 110.30347, peri: 224.06676, L0: 238.92881, n: 0.00397557 },
  // Eris (2005): approximate elements; near aphelion in the early 21st century.
  eris:    { name: 'Eris',    a: 67.86, e: 0.4360, i: 44.04, node: 35.95, peri: 187.35, L0: 31.4, n: 0.0017634 },
};

export const norm360 = (x) => ((x % 360) + 360) % 360;

export const ELEMENTS = Object.fromEntries(
  Object.entries(RAW).map(([id, el]) => [id, { id, ...el, period: 360 / el.n, M0: norm360(el.L0 - el.peri) }]),
);

export const PLANET_IDS = ['mercury', 'venus', 'earth', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune'];

// The five asteroids known by 1846 (Ceres 1801, Pallas 1802, Juno 1804, Vesta 1807, Astraea 1845).
// Mean anomalies at J2000 are representative.
export const ASTEROIDS = [
  { id: 'ceres', name: 'Ceres', a: 2.7675, e: 0.0785, i: 10.59, node: 80.33, peri: 153.9, M0: 6.1, color: 0x9a9a9a, size: 0.07 },
  { id: 'pallas', name: 'Pallas', a: 2.7722, e: 0.2313, i: 34.84, node: 173.1, peri: 123.1, M0: 78.0, color: 0x8f8f8f, size: 0.06 },
  { id: 'juno', name: 'Juno', a: 2.6690, e: 0.2569, i: 12.99, node: 169.9, peri: 57.9, M0: 150.0, color: 0x8a8680, size: 0.05 },
  { id: 'vesta', name: 'Vesta', a: 2.3615, e: 0.0887, i: 7.14, node: 103.8, peri: 254.8, M0: 205.0, color: 0xa9a39a, size: 0.06 },
  { id: 'astraea', name: 'Astraea', a: 2.5740, e: 0.1910, i: 5.37, node: 141.6, peri: 140.3, M0: 290.0, color: 0x928c84, size: 0.045 },
].map((a) => ({ ...a, period: 365.256 * a.a ** 1.5 }));

// The Moon: mean longitude and tropical rate (corrected to the fixed frame), eccentricity,
// inclination to the ecliptic, and the J2000 longitudes of node and perigee.
// Node regression (18.6 yr) and perigee advance (8.85 yr) are modelled where a
// historical device represents them; otherwise the J2000 values are held fixed.
const moonN = 13.17639648 - PRECESSION_DEG_PER_DAY;
export const MOON = {
  id: 'moon', name: 'Moon',
  L0: 218.3165, n: moonN, period: 360 / moonN,
  synodic: 29.530589, anomalistic: 27.554550,
  e: 0.0549, i: 5.145, node: 125.08, peri: 83.35,
  apsePeriod: 3232.6, // prograde rotation of the line of apsides, days
};

// The Sun as seen from a fixed Earth: the reflection of the Earth's orbit.
// Its apogee lies in the direction of the Earth's perihelion longitude.
export const SUN = {
  id: 'sun', name: 'Sun',
  L0: norm360(ELEMENTS.earth.L0 + 180),
  n: ELEMENTS.earth.n,
  period: ELEMENTS.earth.period,
  e: ELEMENTS.earth.e,
  apogee: ELEMENTS.earth.peri,
};

// Galilean satellites: periods in days, orbital radii relative to Io's.
// Phases at J2000 are representative rather than ephemeris-accurate.
export const JUPITER_MOONS = [
  { id: 'io', name: 'Io', period: 1.769138, rel: 1.0, phase: 20, color: 0xe6d27a, size: 0.055 },
  { id: 'europa', name: 'Europa', period: 3.551181, rel: 1.59, phase: 140, color: 0xd8d0c0, size: 0.05 },
  { id: 'ganymede', name: 'Ganymede', period: 7.154553, rel: 2.54, phase: 250, color: 0xb8ae9c, size: 0.07 },
  { id: 'callisto', name: 'Callisto', period: 16.689018, rel: 4.47, phase: 80, color: 0x8f8a80, size: 0.065 },
];

export const SATURN_MOONS = [
  { id: 'titan', name: 'Titan', period: 15.945421, rel: 1.0, phase: 200, color: 0xd9a85c, size: 0.07 },
];

// 1P/Halley: elements of the 1682 apparition (perihelion 1682 September 15).
export const HALLEY = {
  id: 'halley', name: "Halley's comet",
  a: 17.834, e: 0.96714, i: 162.26, node: 58.42, peri: 58.42 + 111.33,
  period: 27510,
};

export function synodic(p1, p2) {
  return 1 / Math.abs(1 / p1 - 1 / p2);
}
