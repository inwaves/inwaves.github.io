// Calendar, epoch and precession utilities. Simulation time t is measured in days
// from J2000.0 (JD 2451545.0), so that the mean elements apply directly.
import * as THREE from 'three';
import { PRECESSION_DEG_PER_CENTURY } from '../data/elements.js';

export const J2000 = 2451545.0;
export const DAY_SIDEREAL = 0.99726957; // mean sidereal day in mean solar days
const DEG = Math.PI / 180;

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

/** Julian Day -> calendar date (Julian calendar before 1582-10-15, Gregorian after). Meeus, ch. 7. */
export function jdToDate(jd) {
  const z = Math.floor(jd + 0.5);
  const f = jd + 0.5 - z;
  let a = z;
  if (z >= 2299161) {
    const alpha = Math.floor((z - 1867216.25) / 36524.25);
    a = z + 1 + alpha - Math.floor(alpha / 4);
  }
  const b = a + 1524;
  const c = Math.floor((b - 122.1) / 365.25);
  const d = Math.floor(365.25 * c);
  const e = Math.floor((b - d) / 30.6001);
  const day = b - d - Math.floor(30.6001 * e) + f;
  const month = e < 14 ? e - 1 : e - 13;
  const year = month > 2 ? c - 4716 : c - 4715;
  return { year, month, day: Math.floor(day) };
}

/** Calendar date -> Julian Day at 0h. Astronomical year numbering (1 BCE = 0, 2 BCE = -1). */
export function dateToJD(year, month, day) {
  let y = year;
  let m = month;
  if (m <= 2) { y -= 1; m += 12; }
  const gregorian = year > 1582 || (year === 1582 && (month > 10 || (month === 10 && day >= 15)));
  let b = 0;
  if (gregorian) {
    const a = Math.floor(y / 100);
    b = 2 - a + Math.floor(a / 4);
  }
  return Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1)) + day + b - 1524.5;
}

export const tToJD = (t) => J2000 + t;
export const jdToT = (jd) => jd - J2000;

export function formatDate(jd) {
  const { year, month, day } = jdToDate(jd);
  const bce = year <= 0;
  const y = bce ? 1 - year : year;
  return `${day} ${MONTHS[month - 1]} ${y}${bce ? ' BCE' : ''}`;
}

export function formatYear(year) {
  return year <= 0 ? `${1 - year} BCE` : `${year}`;
}

/** Accumulated general precession in longitude since J2000, degrees (negative in the past). */
export function precessionShiftDeg(t) {
  return PRECESSION_DEG_PER_CENTURY * (t / 36525);
}

/** Mean obliquity of the ecliptic, degrees (linear term only). */
export function obliquityDeg(t) {
  return 23.439291 - 0.0130042 * (t / 36525);
}

/** Ecliptic longitude (J2000 frame) of the vernal equinox of date. */
export function equinoxLongitudeDeg(t) {
  return -precessionShiftDeg(t);
}

/**
 * Unit vector toward the north celestial pole of date, in scene coordinates
 * (ecliptic plane = XZ, +Y = north ecliptic pole, longitude increases from +X toward -Z).
 * The pole circles the ecliptic pole once per ~25,800 years, 90 degrees ahead of the equinox.
 */
export function celestialPole(t, out = new THREE.Vector3()) {
  const lon = (90 + equinoxLongitudeDeg(t)) * DEG;
  const lat = (90 - obliquityDeg(t)) * DEG;
  const c = Math.cos(lat);
  return out.set(c * Math.cos(lon), Math.sin(lat), -c * Math.sin(lon));
}
