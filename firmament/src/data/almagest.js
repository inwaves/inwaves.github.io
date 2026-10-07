/**
 * Constants of Ptolemy's Almagest, kept in their original sexagesimal digits.
 *
 * Read from R. H. van Gent's Almagest Ephemeris Calculator (Utrecht University);
 * see docs/SOURCES.md for the full provenance and the normalisation notes.
 *
 * Lengths are fractions of the deferent radius (the source stores 6;30 parts of
 * 60 as 0;6,30). Angles are degrees; rates are degrees per day. Longitudes are
 * tropical, at the epoch of Nabonassar (JD_NABONASSAR in core/time.js).
 */
import { sexagesimal as sx } from '../core/angles.js';

/** Degrees per day by which Ptolemy's apogees advance: 1 degree per century. */
export const PTOLEMY_PRECESSION_PER_DAY = 1 / 36525;

export const OBLIQUITY = sx(23, 51, 20);

export const SUN = {
  meanMotion: sx(0, 59, 8, 17, 13, 12, 31),
  meanLongitudeAtEpoch: sx(330, 45),
  /** The solar apogee is fixed in tropical longitude in the Almagest. */
  apogee: sx(65, 30),
  eccentricity: sx(0, 2, 30),
  /** Deferent radius in Earth radii, from the Planetary Hypotheses. */
  deferentEarthRadii: 1210,
};

export const MOON = {
  meanMotion: sx(13, 10, 34, 58, 33, 30, 30),
  anomalyMotion: sx(13, 3, 53, 56, 17, 51, 59),
  latitudeArgumentMotion: sx(13, 13, 45, 39, 48, 56, 37),
  elongationMotion: sx(12, 11, 26, 41, 20, 17, 59),
  meanLongitudeAtEpoch: sx(41, 22),
  anomalyAtEpoch: sx(268, 49),
  /** Counted from the northern limit, not the node (latitude = inclination x cosine). */
  latitudeArgumentAtEpoch: sx(354, 15),
  elongationAtEpoch: sx(70, 37),
  epicycle: sx(0, 6, 20),
  eccentricity: sx(0, 12, 29),
  inclination: sx(5, 0),
  /**
   * Distance of the epicycle centre at syzygy, Earth radii. Recalled from
   * Almagest V.13 and not re-verified; see docs/SOURCES.md.
   */
  syzygyDistanceEarthRadii: 59,
};

/**
 * The five planets. For Venus and Mercury the epicycle centre has the mean
 * Sun's longitude, so they carry no mean motion in longitude of their own.
 *
 * `northernLimitOffset` is the constant the source calls "node": the northern
 * limit of the deferent lies at longitude (apogee - northernLimitOffset).
 */
export const PLANETS = {
  saturn: {
    meanMotion: sx(0, 2, 0, 33, 31, 28, 51),
    anomalyMotion: sx(0, 57, 7, 43, 41, 43, 40),
    meanLongitudeAtEpoch: sx(296, 43),
    anomalyAtEpoch: sx(34, 2),
    apogeeAtEpoch: sx(224, 10),
    epicycle: sx(0, 6, 30),
    eccentricity: sx(0, 3, 25),
    deferentInclination: sx(2, 30),
    northernLimitOffset: 50,
    deferentEarthRadii: 17026,
  },
  jupiter: {
    meanMotion: sx(0, 4, 59, 14, 26, 46, 31),
    anomalyMotion: sx(0, 54, 9, 2, 46, 26, 0),
    meanLongitudeAtEpoch: sx(184, 41),
    anomalyAtEpoch: sx(146, 4),
    apogeeAtEpoch: sx(152, 9),
    epicycle: sx(0, 11, 30),
    eccentricity: sx(0, 2, 45),
    deferentInclination: sx(1, 30),
    northernLimitOffset: 340,
    deferentEarthRadii: 11503.5,
  },
  mars: {
    meanMotion: sx(0, 31, 26, 36, 53, 51, 33),
    anomalyMotion: sx(0, 27, 41, 40, 19, 20, 58),
    meanLongitudeAtEpoch: sx(3, 32),
    anomalyAtEpoch: sx(327, 13),
    apogeeAtEpoch: sx(106, 40),
    epicycle: sx(0, 39, 30),
    eccentricity: sx(0, 6, 0),
    deferentInclination: sx(1, 0),
    northernLimitOffset: 0,
    deferentEarthRadii: 5040,
  },
  venus: {
    followsMeanSun: true,
    anomalyMotion: sx(0, 36, 59, 25, 53, 11, 28),
    anomalyAtEpoch: sx(71, 7),
    apogeeAtEpoch: sx(46, 10),
    epicycle: sx(0, 43, 10),
    eccentricity: sx(0, 1, 15),
    epicycleInclination: sx(3, 30),
    deferentEarthRadii: 622.5,
  },
  mercury: {
    followsMeanSun: true,
    /** Mercury alone uses the crank mechanism: its deferent centre revolves. */
    crank: true,
    anomalyMotion: sx(3, 6, 24, 6, 59, 35, 50),
    anomalyAtEpoch: sx(21, 55),
    apogeeAtEpoch: sx(181, 10),
    epicycle: sx(0, 22, 30),
    eccentricity: sx(0, 3, 0),
    epicycleInclination: sx(7, 0),
    deferentEarthRadii: 115,
  },
};

/** Ptolemy's order of the spheres outward from the Earth. */
export const PTOLEMAIC_ORDER = ['moon', 'mercury', 'venus', 'sun', 'mars', 'jupiter', 'saturn'];
