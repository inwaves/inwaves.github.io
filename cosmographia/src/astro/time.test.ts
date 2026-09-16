import { describe, expect, it } from 'vitest';
import {
  calendarToJd,
  CALENDAR_REFORM,
  deltaTSeconds,
  formatYear,
  gmstDeg,
  jdToCalendar,
  localCalendarDate,
  localDateToJdTT,
  ttToUt,
  utToTt,
} from './time';
import { formatZodiacal, sex } from './math';

describe('calendar conversions', () => {
  it('round-trips Julian and Gregorian dates', () => {
    for (const [y, m, d, g] of [
      [2000, 1, 1.5, true],
      [1610, 1, 7.75, true],
      [1543, 5, 24.25, false],
      [139, 5, 28.9, false],
      [-546, 6, 21.1, false],
      [-746, 2, 26.5, false],
    ] as const) {
      const jd = calendarToJd(y, m, d, g);
      const c = jdToCalendar(jd, g);
      expect(c.year).toBe(y);
      expect(c.month).toBe(m);
      expect(c.day).toBe(Math.floor(d));
      expect(c.hour + c.minute / 60).toBeCloseTo((d % 1) * 24, 1);
    }
  });

  it('places the Nabonassar epoch (26 Feb 747 BCE, noon) at JD 1448638', () => {
    expect(calendarToJd(-746, 2, 26.5, false)).toBe(1448638);
  });

  it('applies the Gregorian reform by place', () => {
    // 12 January 1700 (Gregorian) in Padua was 2 January 1700 (Julian) in Cambridge: until the
    // Julian leap day of 1700 the calendars differed by ten days.
    const jd = calendarToJd(1700, 1, 12, true);
    expect(localCalendarDate(jd, 11.88, CALENDAR_REFORM.italy).gregorian).toBe(true);
    expect(localCalendarDate(jd, 0.12, CALENDAR_REFORM.england).gregorian).toBe(false);
    expect(localCalendarDate(jd, 0.12, CALENDAR_REFORM.england).day).toBe(2);
  });

  it('converts local mean time at a place to TT and back', () => {
    const jdTT = localDateToJdTT({ year: 1610, month: 1, day: 7, hour: 19, minute: 0 }, 11.88, CALENDAR_REFORM.italy);
    const local = localCalendarDate(ttToUt(jdTT), 11.88, CALENDAR_REFORM.italy);
    expect([local.year, local.month, local.day, local.hour, local.minute]).toEqual([1610, 1, 7, 19, 0]);
  });

  it('formats historical years', () => {
    expect(formatYear(-546)).toBe('547 BCE');
    expect(formatYear(0)).toBe('1 BCE');
    expect(formatYear(1543)).toBe('1543 CE');
  });
});

describe('Delta T and sidereal time', () => {
  it('is continuous across polynomial segment boundaries', () => {
    for (const y of [-500, 500, 1600, 1700, 1800, 1860, 1900, 1920, 1941, 1961, 1986, 2005, 2050, 2150]) {
      expect(Math.abs(deltaTSeconds(y - 1e-6) - deltaTSeconds(y + 1e-6))).toBeLessThan(3);
    }
    expect(deltaTSeconds(2000)).toBeCloseTo(63.86, 2);
    expect(deltaTSeconds(150)).toBeGreaterThan(8000);
  });

  it('inverts TT <-> UT', () => {
    const jd = 1772112.5;
    expect(utToTt(ttToUt(jd))).toBeCloseTo(jd, 6);
  });

  it('matches the Meeus example for GMST (1987 Apr 10, 0h UT)', () => {
    // Meeus example 12.a: 13h10m46.3668s = 197.693195°
    expect(gmstDeg(2446895.5)).toBeCloseTo(197.693195, 4);
  });
});

describe('sexagesimal and zodiacal notation', () => {
  it('evaluates Ptolemaic sexagesimals', () => {
    expect(sex(0, 59, 8, 17, 13, 12, 31)).toBeCloseTo(0.9856352784, 9);
    expect(sex(2, 30)).toBe(2.5);
  });

  it('writes longitudes by sign', () => {
    expect(formatZodiacal(65.5)).toBe('\u264A\uFE0E Gemini 5\u00B030\u2032');
    expect(formatZodiacal(359.9999)).toBe('\u2648\uFE0E Aries 0\u00B000\u2032');
  });
});
