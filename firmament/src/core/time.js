/**
 * Time: Julian days, the historical calendar, and precession.
 *
 * The simulation clock is a Julian day number. Dates are shown in the Julian
 * calendar before 15 October 1582 and the Gregorian calendar from then on,
 * using astronomical year numbering internally (year 0 is 1 BCE).
 */

export const JD_J2000 = 2451545.0;
export const DAYS_PER_CENTURY = 36525;

/** First day of the Gregorian calendar, 15 October 1582, at 0h. */
const JD_GREGORIAN_START = 2299160.5;

/**
 * Epoch of Ptolemy's tables: the era of Nabonassar, as used by the source the
 * Almagest constants were read from (see docs/SOURCES.md).
 */
export const JD_NABONASSAR = 1448637 + (22 - (17 + 34 / 60) / 60) / 24;

/**
 * General precession in longitude, degrees per Julian century (50.29 arcseconds
 * per year). Used to carry ancient tropical longitudes into the J2000 frame in
 * which the stars are fixed.
 */
export const PRECESSION_DEG_PER_CENTURY = (50.29 / 3600) * 100;

/**
 * Degrees to add to a tropical longitude of date to express it in the ecliptic
 * frame of J2000. Positive for dates before J2000.
 */
export function precessionToJ2000(jd) {
  return (PRECESSION_DEG_PER_CENTURY * (JD_J2000 - jd)) / DAYS_PER_CENTURY;
}

/**
 * Julian day of a calendar date (Meeus, Astronomical Algorithms, ch. 7).
 * @param {number} year astronomical year (0 = 1 BCE, -1 = 2 BCE)
 * @param {number} month 1-12
 * @param {number} day day of month, may carry a fraction
 */
export function calendarToJd(year, month, day) {
  let y = year;
  let m = month;
  if (m <= 2) {
    y -= 1;
    m += 12;
  }
  const gregorian = year > 1582 || (year === 1582 && (month > 10 || (month === 10 && day >= 15)));
  let b = 0;
  if (gregorian) {
    const a = Math.floor(y / 100);
    b = 2 - a + Math.floor(a / 4);
  }
  return Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1)) + day + b - 1524.5;
}

/**
 * Calendar date of a Julian day (Meeus, ch. 7).
 * @returns {{year: number, month: number, day: number, hours: number, gregorian: boolean}}
 */
export function jdToCalendar(jd) {
  const shifted = jd + 0.5;
  const z = Math.floor(shifted);
  const f = shifted - z;
  const gregorian = jd >= JD_GREGORIAN_START;
  let a = z;
  if (gregorian) {
    const alpha = Math.floor((z - 1867216.25) / 36524.25);
    a = z + 1 + alpha - Math.floor(alpha / 4);
  }
  const b = a + 1524;
  const c = Math.floor((b - 122.1) / 365.25);
  const d = Math.floor(365.25 * c);
  const e = Math.floor((b - d) / 30.6001);
  const dayWithFraction = b - d - Math.floor(30.6001 * e) + f;
  const month = e < 14 ? e - 1 : e - 13;
  const year = month > 2 ? c - 4716 : c - 4715;
  const day = Math.floor(dayWithFraction);
  return { year, month, day, hours: (dayWithFraction - day) * 24, gregorian };
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** Formats an astronomical year for display: 0 becomes "1 BCE". */
export function formatYear(year) {
  return year <= 0 ? `${1 - year} BCE` : `${year} CE`;
}

/** Human-readable date, e.g. "7 Jan 1610 CE" or "26 Feb 747 BCE". */
export function formatDate(jd, { withTime = false } = {}) {
  const c = jdToCalendar(jd);
  const base = `${c.day} ${MONTHS[c.month - 1]} ${formatYear(c.year)}`;
  if (!withTime) return base;
  const h = Math.floor(c.hours);
  const min = Math.floor((c.hours - h) * 60);
  return `${base} ${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
}
