import { calendarToJd } from '../../astro/time';
import { sex } from '../../astro/math';
import type { TimeContext } from '../types';

/**
 * Parameters of Ptolemy's *Almagest* (after Toomer's translation), with mean positions at the
 * era of Nabonassar: Thoth 1, year 1 = 26 February 747 BCE, noon at Alexandria.
 * Mean motions are per Egyptian day, written as Ptolemy's sexagesimal fractions.
 */

export const ALEXANDRIA_LONGITUDE = 29.92;

/** Epoch as a UT Julian Date (local noon at Alexandria). */
export const NABONASSAR_EPOCH_UT = calendarToJd(-746, 2, 26.5, false) - ALEXANDRIA_LONGITUDE / 360;

/** Days since the Nabonassar epoch. */
export function nabonassarDays(t: TimeContext): number {
  return t.ut - NABONASSAR_EPOCH_UT;
}

/** Ptolemy's precession: 1° per century (of 365-day Egyptian years). Apogees are fixed to the stars. */
export const PTOLEMAIC_PRECESSION_PER_DAY = 1 / 36500;

export const ALMAGEST = {
  sun: {
    e: 2.5,
    apogee: sex(65, 30),
    lambda0: sex(330, 45),
    rate: sex(0, 59, 8, 17, 13, 12, 31),
  },
  moon: {
    lambda0: sex(41, 22),
    rate: sex(13, 10, 34, 58, 33, 30, 30),
    alpha0: sex(268, 49),
    alphaRate: sex(13, 3, 53, 56, 17, 51, 59),
    eta0: sex(70, 37),
    etaRate: sex(12, 11, 26, 41, 20, 17, 59),
    /** argument of latitude, counted from the northern limit */
    omega0: sex(354, 15),
    omegaRate: sex(13, 13, 45, 39, 48, 56, 37),
  },
  mercury: { e: 3, r: 22.5, apogee0: sex(181, 10), alpha0: sex(21, 55), alphaRate: sex(3, 6, 24, 6, 59, 35, 50) },
  venus: { e: 1.25, r: sex(43, 10), apogee0: sex(46, 10), alpha0: sex(71, 7), alphaRate: sex(0, 36, 59, 25, 53, 11, 28) },
  mars: {
    e: 6,
    r: 39.5,
    apogee0: sex(106, 40),
    lambda0: sex(3, 32),
    rate: sex(0, 31, 26, 36, 53, 51, 33),
    alpha0: sex(327, 13),
    alphaRate: sex(0, 27, 41, 40, 19, 20, 58),
  },
  jupiter: {
    e: 2.75,
    r: 11.5,
    apogee0: sex(152, 9),
    lambda0: sex(184, 41),
    rate: sex(0, 4, 59, 14, 26, 46, 31),
    alpha0: sex(146, 4),
    alphaRate: sex(0, 54, 9, 2, 46, 26, 0),
  },
  saturn: {
    e: sex(3, 25),
    r: 6.5,
    apogee0: sex(224, 10),
    lambda0: sex(296, 43),
    rate: sex(0, 2, 0, 33, 31, 28, 51),
    alpha0: sex(34, 2),
    alphaRate: sex(0, 57, 7, 43, 41, 43, 40),
  },
} as const;

/**
 * Earth radii per "part" for each body, chosen so the nested shells reproduce the distances of
 * Ptolemy's *Planetary Hypotheses* (each shell's greatest distance = the next shell's least).
 */
export const PLANETARY_HYPOTHESES = {
  moon: 59 / 60,
  mercury: 166 / 91.5,
  venus: 1079 / (60 + 1.25 + sex(43, 10)),
  sun: 1260 / 62.5,
  mars: 8820 / 105.5,
  jupiter: 14187 / 74.25,
  saturn: 19865 / (60 + sex(3, 25) + 6.5),
  stars: 20000,
} as const;
