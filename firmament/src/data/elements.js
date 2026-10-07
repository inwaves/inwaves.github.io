/**
 * Modern orbital elements.
 *
 * Planets: NASA JPL, "Approximate Positions of the Planets", Table 1 (mean
 * ecliptic and equinox of J2000; JPL states validity 1800-2050). Each entry is
 * [value at J2000, rate per Julian century]. Digits are exactly as published.
 * https://ssd.jpl.nasa.gov/planets/approx_pos.html
 *
 * a: semi-major axis (au), e: eccentricity, I: inclination (deg),
 * L: mean longitude (deg), peri: longitude of perihelion (deg),
 * node: longitude of the ascending node (deg).
 */
import { calendarToJd } from '../core/time.js';

export const JPL_ELEMENTS = {
  mercury: {
    a: [0.38709927, 0.00000037],
    e: [0.20563593, 0.00001906],
    I: [7.00497902, -0.00594749],
    L: [252.2503235, 149472.67411175],
    peri: [77.45779628, 0.16047689],
    node: [48.33076593, -0.12534081],
  },
  venus: {
    a: [0.72333566, 0.0000039],
    e: [0.00677672, -0.00004107],
    I: [3.39467605, -0.0007889],
    L: [181.9790995, 58517.81538729],
    peri: [131.60246718, 0.00268329],
    node: [76.67984255, -0.27769418],
  },
  /** Earth-Moon barycentre, used as the Earth. */
  earth: {
    a: [1.00000261, 0.00000562],
    e: [0.01671123, -0.00004392],
    I: [-0.00001531, -0.01294668],
    L: [100.46457166, 35999.37244981],
    peri: [102.93768193, 0.32327364],
    node: [0.0, 0.0],
  },
  mars: {
    a: [1.52371034, 0.00001847],
    e: [0.0933941, 0.00007882],
    I: [1.84969142, -0.00813131],
    L: [-4.55343205, 19140.30268499],
    peri: [-23.94362959, 0.44441088],
    node: [49.55953891, -0.29257343],
  },
  jupiter: {
    a: [5.202887, -0.00011607],
    e: [0.04838624, -0.00013253],
    I: [1.30439695, -0.00183714],
    L: [34.39644051, 3034.74612775],
    peri: [14.72847983, 0.21252668],
    node: [100.47390909, 0.20469106],
  },
  saturn: {
    a: [9.53667594, -0.0012506],
    e: [0.05386179, -0.00050991],
    I: [2.48599187, 0.00193609],
    L: [49.95424423, 1222.49362201],
    peri: [92.59887831, -0.41897216],
    node: [113.66242448, -0.28867794],
  },
};

/**
 * Orbit radii Copernicus derived, in units of the Earth-Sun distance, to the
 * two decimals that could be sourced (see docs/SOURCES.md).
 */
export const COPERNICAN_RADII = {
  mercury: 0.38,
  venus: 0.72,
  earth: 1.0,
  mars: 1.52,
  jupiter: 5.22,
  saturn: 9.17,
};

/** Kilometres per astronomical unit and per Earth radius, for body sizes. */
export const KM_PER_AU = 149597870.7;
export const KM_PER_EARTH_RADIUS = 6371;
export const EARTH_RADII_PER_AU = KM_PER_AU / KM_PER_EARTH_RADIUS;

/** Mean physical radii in kilometres. */
export const BODY_RADIUS_KM = {
  sun: 696000,
  moon: 1737.4,
  mercury: 2439.7,
  venus: 6051.8,
  earth: 6371,
  mars: 3389.5,
  jupiter: 69911,
  saturn: 58232,
};

/**
 * The Moon's mean elements (degrees, and degrees per day from J2000), referred
 * to the mean equinox of date. Approximate, recalled rather than re-verified;
 * flagged Illustrative in docs/SOURCES.md.
 */
export const MOON_MEAN = {
  L: [218.3164477, 13.17639648],
  /** Mean anomaly, counted from perigee. */
  M: [134.9633964, 13.06499295],
  /** Argument of latitude, counted from the ascending node. */
  F: [93.272095, 13.22935024],
  semiMajorAxisAu: 0.00256955,
  eccentricity: 0.0549,
  inclination: 5.145,
};

/**
 * Satellites revealed by the telescope. Distances in kilometres, periods in
 * days. Orbital phases are arbitrary: the simulation does not claim to predict
 * where each moon was on a given night. Flagged Illustrative.
 */
export const SATELLITES = {
  jupiter: [
    { id: 'io', name: 'Io', distanceKm: 421700, periodDays: 1.769138, phase: 20 },
    { id: 'europa', name: 'Europa', distanceKm: 671034, periodDays: 3.551181, phase: 140 },
    { id: 'ganymede', name: 'Ganymede', distanceKm: 1070412, periodDays: 7.154553, phase: 250 },
    { id: 'callisto', name: 'Callisto', distanceKm: 1882709, periodDays: 16.689018, phase: 80 },
  ],
  saturn: [{ id: 'titan', name: 'Titan', distanceKm: 1221870, periodDays: 15.945, phase: 200 }],
};

/** Approximate orientation of Saturn's ring plane: ecliptic coordinates of its north pole. */
export const SATURN_RING = {
  poleLongitude: 79.5,
  poleLatitude: 61.9,
  innerKm: 74500,
  outerKm: 140220,
};

/**
 * The comet of 1682 (Halley's), shown in the Newtonian era to illustrate that
 * the same law governs a body on a very elongated orbit. Provenance is set out
 * in full in docs/SOURCES.md; in brief:
 *
 * - Perihelion, 15 September 1682 (Gregorian): Wikipedia, "Halley's Comet", list
 *   of apparitions. A single, secondary source. Good to about a day, since the
 *   time of day is not given.
 * - Perihelion distance and eccentricity: D. K. Yeomans, "The Dynamical History
 *   of Comet Halley" (1985), a primary source. They are the osculating values
 *   for the 1986 apparition, not 1682, for which no elements could be sourced.
 * - Inclination, node and argument of perihelion: recalled, not re-verified,
 *   and referred to the equinox of J2000 like the rest of the scene. Flagged
 *   Illustrative. Yeomans gives these angles for the equinox of 1950. Carried to
 *   J2000, his orientation agrees with this one to 0.12 degrees in the direction
 *   of perihelion and 0.13 degrees in the plane of the orbit. That is about a
 *   pixel at aphelion, but it is ten times what rounding could explain, and the
 *   cause is not known, so the two are not claimed to be the same orbit.
 *
 * It matters which apparition anchors the perihelion. No perturbations are
 * modelled, so the comet keeps a fixed two-body period, here 75.98 years, while
 * its real returns have come 74.4 to 76.7 years apart. Anchored at the 1986
 * perihelion and stepped back four revolutions it reached the Sun in late 1684,
 * two years late for the very era it is labelled for.
 */
const COMET_PERIHELION_DISTANCE = 0.5870992;
const COMET_ECCENTRICITY = 0.9672724;

export const COMET = {
  id: 'comet',
  q: COMET_PERIHELION_DISTANCE,
  e: COMET_ECCENTRICITY,
  /** Semi-major axis, au. Derived, so that the two sourced figures appear above exactly as published. */
  a: COMET_PERIHELION_DISTANCE / (1 - COMET_ECCENTRICITY),
  I: 162.26,
  node: 58.42,
  argPeri: 111.33,
  perihelionJd: calendarToJd(1682, 9, 15),
};
