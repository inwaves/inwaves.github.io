/**
 * Time scales, calendars and sidereal time.
 *
 * Conventions: `jd` without qualification is Terrestrial Time (TT). Universal Time is derived
 * with the Espenak & Meeus (2006) polynomial expressions for Delta T. Dates use astronomical
 * year numbering (1 BCE = year 0) and the proleptic Julian calendar before each place's
 * Gregorian reform.
 */

export const J2000 = 2451545.0;
export const DAYS_PER_JULIAN_CENTURY = 36525;

/** Julian Date of a calendar date and fractional day (Meeus, ch. 7). */
export function calendarToJd(year: number, month: number, day: number, gregorian: boolean): number {
  let y = year;
  let m = month;
  if (m <= 2) {
    y -= 1;
    m += 12;
  }
  let b = 0;
  if (gregorian) {
    const a = Math.floor(y / 100);
    b = 2 - a + Math.floor(a / 4);
  }
  return Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1)) + day + b - 1524.5;
}

export interface CalendarDate {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
  gregorian: boolean;
}

/** Calendar date of a Julian Date (Meeus, ch. 7), in the requested calendar. */
export function jdToCalendar(jd: number, gregorian: boolean): CalendarDate {
  const jd5 = jd + 0.5;
  const z = Math.floor(jd5);
  let f = jd5 - z;
  let a = z;
  if (gregorian) {
    const alpha = Math.floor((z - 1867216.25) / 36524.25);
    a = z + 1 + alpha - Math.floor(alpha / 4);
  }
  const b = a + 1524;
  const c = Math.floor((b - 122.1) / 365.25);
  const d = Math.floor(365.25 * c);
  const e = Math.floor((b - d) / 30.6001);
  let day = b - d - Math.floor(30.6001 * e);
  let month = e < 14 ? e - 1 : e - 13;
  let year = month > 2 ? c - 4716 : c - 4715;
  // Round to whole seconds so that 23:59:59.9999 does not print as 23:59:60.
  let seconds = Math.round(f * 86400);
  if (seconds >= 86400) {
    const next = jdToCalendar(Math.floor(jd5) + 0.5, gregorian);
    ({ year, month, day } = next);
    seconds = 0;
    f = 0;
  }
  const hour = Math.floor(seconds / 3600);
  const minute = Math.floor((seconds - hour * 3600) / 60);
  const second = seconds - hour * 3600 - minute * 60;
  return { year, month, day, hour, minute, second, gregorian };
}

/** Approximate decimal year of a Julian Date (adequate for Delta T and labels). */
export function decimalYear(jd: number): number {
  return 2000 + (jd - J2000) / 365.25;
}

/** Julian centuries of TT since J2000.0. */
export function centuriesSinceJ2000(jd: number): number {
  return (jd - J2000) / DAYS_PER_JULIAN_CENTURY;
}

/** Delta T = TT - UT in seconds (Espenak & Meeus 2006 polynomial expressions). */
export function deltaTSeconds(y: number): number {
  if (y < -500) {
    const u = (y - 1820) / 100;
    return -20 + 32 * u * u;
  }
  if (y < 500) {
    const u = y / 100;
    return poly(u, [10583.6, -1014.41, 33.78311, -5.952053, -0.1798452, 0.022174192, 0.0090316521]);
  }
  if (y < 1600) {
    const u = (y - 1000) / 100;
    return poly(u, [1574.2, -556.01, 71.23472, 0.319781, -0.8503463, -0.005050998, 0.0083572073]);
  }
  if (y < 1700) {
    const t = y - 1600;
    return 120 - 0.9808 * t - 0.01532 * t * t + (t * t * t) / 7129;
  }
  if (y < 1800) {
    const t = y - 1700;
    return poly(t, [8.83, 0.1603, -0.0059285, 0.00013336, -1 / 1174000]);
  }
  if (y < 1860) {
    const t = y - 1800;
    return poly(t, [13.72, -0.332447, 0.0068612, 0.0041116, -0.00037436, 0.0000121272, -0.0000001699, 0.000000000875]);
  }
  if (y < 1900) {
    const t = y - 1860;
    return poly(t, [7.62, 0.5737, -0.251754, 0.01680668, -0.0004473624, 1 / 233174]);
  }
  if (y < 1920) {
    const t = y - 1900;
    return poly(t, [-2.79, 1.494119, -0.0598939, 0.0061966, -0.000197]);
  }
  if (y < 1941) {
    const t = y - 1920;
    return poly(t, [21.2, 0.84493, -0.0761, 0.0020936]);
  }
  if (y < 1961) {
    const t = y - 1950;
    return 29.07 + 0.407 * t - (t * t) / 233 + (t * t * t) / 2547;
  }
  if (y < 1986) {
    const t = y - 1975;
    return 45.45 + 1.067 * t - (t * t) / 260 - (t * t * t) / 718;
  }
  if (y < 2005) {
    const t = y - 2000;
    return poly(t, [63.86, 0.3345, -0.060374, 0.0017275, 0.000651814, 0.00002373599]);
  }
  if (y < 2050) {
    const t = y - 2000;
    return 62.92 + 0.32217 * t + 0.005589 * t * t;
  }
  const u = (y - 1820) / 100;
  if (y < 2150) return -20 + 32 * u * u - 0.5628 * (2150 - y);
  return -20 + 32 * u * u;
}

function poly(x: number, coefficients: number[]): number {
  let result = 0;
  for (let i = coefficients.length - 1; i >= 0; i--) result = result * x + coefficients[i];
  return result;
}

/** UT Julian Date from a TT Julian Date. */
export function ttToUt(jdTT: number): number {
  return jdTT - deltaTSeconds(decimalYear(jdTT)) / 86400;
}

/** TT Julian Date from a UT Julian Date (one fixed-point iteration is ample). */
export function utToTt(jdUT: number): number {
  const first = jdUT + deltaTSeconds(decimalYear(jdUT)) / 86400;
  return jdUT + deltaTSeconds(decimalYear(first)) / 86400;
}

/** Greenwich mean sidereal time in degrees (Meeus 12.4). Argument is a UT Julian Date. */
export function gmstDeg(jdUT: number): number {
  const T = (jdUT - J2000) / DAYS_PER_JULIAN_CENTURY;
  const theta = 280.46061837 + 360.98564736629 * (jdUT - J2000) + 0.000387933 * T * T - (T * T * T) / 38710000;
  const r = theta % 360;
  return r < 0 ? r + 360 : r;
}

/** Local mean sidereal time in degrees for an east-positive longitude. */
export function lstDeg(jdUT: number, longitudeEastDeg: number): number {
  const r = (gmstDeg(jdUT) + longitudeEastDeg) % 360;
  return r < 0 ? r + 360 : r;
}

/** First Gregorian Julian Dates of civil calendar reforms relevant to the eras. */
export const CALENDAR_REFORM = {
  italy: calendarToJd(1582, 10, 15, true),
  bohemia: calendarToJd(1584, 1, 17, true),
  denmark: calendarToJd(1700, 3, 1, true),
  england: calendarToJd(1752, 9, 14, true),
} as const;

export const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
] as const;

/** Astronomical year to a historical label ("550 BCE", "1543 CE"). */
export function formatYear(year: number): string {
  return year <= 0 ? `${1 - year} BCE` : `${year} CE`;
}

/**
 * Local mean time calendar date at a place, choosing the calendar in civil use there.
 * @param jdUT Universal Time Julian Date
 * @param longitudeEastDeg observer longitude (east positive)
 * @param reformJd first JD on which the place used the Gregorian calendar
 */
export function localCalendarDate(jdUT: number, longitudeEastDeg: number, reformJd: number): CalendarDate {
  const jdLocal = jdUT + longitudeEastDeg / 360;
  return jdToCalendar(jdLocal, jdLocal >= reformJd);
}

/** Inverse of `localCalendarDate`: TT Julian Date of a local mean time civil date. */
export function localDateToJdTT(
  date: { year: number; month: number; day: number; hour?: number; minute?: number },
  longitudeEastDeg: number,
  reformJd: number,
): number {
  const fraction = ((date.hour ?? 0) + (date.minute ?? 0) / 60) / 24;
  const gregorianGuess = calendarToJd(date.year, date.month, date.day + fraction, true);
  const gregorian = gregorianGuess >= reformJd;
  const jdLocal = calendarToJd(date.year, date.month, date.day + fraction, gregorian);
  return utToTt(jdLocal - longitudeEastDeg / 360);
}

/** "24 May 1543" with an explicit calendar note when requested. */
export function formatCalendarDate(d: CalendarDate): string {
  return `${d.day} ${MONTH_NAMES[d.month - 1]} ${formatYear(d.year)}`;
}

export function formatClock(d: CalendarDate): string {
  return `${String(d.hour).padStart(2, '0')}:${String(d.minute).padStart(2, '0')}`;
}
