import { describe, expect, it } from 'vitest';
import { sexagesimal, wrap180, wrap360 } from '../src/core/angles.js';
import { add, cross, dot, fromLonLat, length, polar, rotateAbout, tilt, toLonLat } from '../src/core/vec.js';
import {
  JD_J2000,
  JD_NABONASSAR,
  calendarToJd,
  formatDate,
  formatYear,
  jdToCalendar,
  precessionToJ2000,
} from '../src/core/time.js';

describe('sexagesimal', () => {
  it('converts successive sixtieths', () => {
    expect(sexagesimal(65, 30)).toBeCloseTo(65.5, 12);
    expect(sexagesimal(0, 2, 30)).toBeCloseTo(2.5 / 60, 12);
    expect(sexagesimal(23, 51, 20)).toBeCloseTo(23 + 51 / 60 + 20 / 3600, 12);
  });

  it('reproduces the Almagest tropical year from the solar mean motion', () => {
    // Ptolemy's year of 365;14,48 days and his daily motion must describe the
    // same thing: 360 degrees divided by one equals the other.
    const dailyMotion = sexagesimal(0, 59, 8, 17, 13, 12, 31);
    const year = sexagesimal(365, 14, 48);
    expect(360 / dailyMotion).toBeCloseTo(year, 6);
  });
});

describe('angle wrapping', () => {
  it('wraps into [0, 360)', () => {
    expect(wrap360(370)).toBeCloseTo(10, 12);
    expect(wrap360(-10)).toBeCloseTo(350, 12);
    expect(wrap360(720)).toBeCloseTo(0, 12);
  });

  it('wraps into (-180, 180]', () => {
    expect(wrap180(190)).toBeCloseTo(-170, 12);
    expect(wrap180(-190)).toBeCloseTo(170, 12);
    expect(wrap180(180)).toBeCloseTo(180, 12);
  });
});

describe('vectors', () => {
  it('round-trips longitude and latitude', () => {
    const v = fromLonLat(123.4, -17.5, 3);
    const back = toLonLat(v);
    expect(back.lon).toBeCloseTo(123.4, 9);
    expect(back.lat).toBeCloseTo(-17.5, 9);
    expect(back.dist).toBeCloseTo(3, 9);
  });

  it('increasing longitude is counter-clockwise seen from the north', () => {
    const north = cross(polar(0), polar(90));
    expect(north[2]).toBeCloseTo(1, 12);
  });

  it('rotateAbout preserves length and the component along the axis', () => {
    const v = [1, 2, 3];
    const axis = [0, 0, 1];
    const r = rotateAbout(v, axis, 73);
    expect(length(r)).toBeCloseTo(length(v), 12);
    expect(dot(r, axis)).toBeCloseTo(dot(v, axis), 12);
  });

  it('tilt leaves the node line fixed and raises the point 90 degrees past it', () => {
    const onNode = tilt(polar(40), 40, 5);
    expect(onNode[2]).toBeCloseTo(0, 12);
    expect(toLonLat(onNode).lon).toBeCloseTo(40, 9);

    const pastNode = toLonLat(tilt(polar(130), 40, 5));
    expect(pastNode.lat).toBeCloseTo(5, 9);

    const beforeNode = toLonLat(tilt(polar(310), 40, 5));
    expect(beforeNode.lat).toBeCloseTo(-5, 9);
  });

  it('adds componentwise', () => {
    expect(add([1, 2, 3], [4, 5, 6])).toEqual([5, 7, 9]);
  });
});

describe('calendar', () => {
  it('places J2000 at noon on 1 January 2000', () => {
    expect(calendarToJd(2000, 1, 1.5)).toBeCloseTo(JD_J2000, 9);
  });

  it('starts the Julian day count at noon on 1 January 4713 BCE', () => {
    expect(calendarToJd(-4712, 1, 1.5)).toBeCloseTo(0, 9);
  });

  it('makes 4 October 1582 (Julian) and 15 October 1582 (Gregorian) consecutive days', () => {
    expect(calendarToJd(1582, 10, 15) - calendarToJd(1582, 10, 4)).toBeCloseTo(1, 9);
  });

  it('puts the era of Nabonassar on 26 February 747 BCE', () => {
    const c = jdToCalendar(JD_NABONASSAR);
    expect([c.year, c.month, c.day]).toEqual([-746, 2, 26]);
    expect(c.gregorian).toBe(false);
  });

  it('round-trips dates on both sides of the calendar reform and before year zero', () => {
    const cases = [
      [2026, 9, 17],
      [1610, 1, 7],
      [1543, 5, 24],
      [137, 7, 20],
      [-369, 3, 1],
      [-545, 11, 30],
    ];
    for (const [y, m, d] of cases) {
      const c = jdToCalendar(calendarToJd(y, m, d + 0.5));
      expect([c.year, c.month, c.day]).toEqual([y, m, d]);
      expect(c.hours).toBeCloseTo(12, 6);
    }
  });

  it('uses the Julian calendar before the reform and the Gregorian after it', () => {
    expect(jdToCalendar(calendarToJd(1543, 5, 24)).gregorian).toBe(false);
    expect(jdToCalendar(calendarToJd(1610, 1, 7)).gregorian).toBe(true);
  });

  it('formats years without a year zero', () => {
    expect(formatYear(0)).toBe('1 BCE');
    expect(formatYear(-746)).toBe('747 BCE');
    expect(formatYear(1610)).toBe('1610 CE');
    expect(formatDate(calendarToJd(1610, 1, 7.5))).toBe('7 Jan 1610 CE');
  });
});

describe('precession', () => {
  it('is zero at J2000 and positive for earlier dates', () => {
    expect(precessionToJ2000(JD_J2000)).toBeCloseTo(0, 12);
    expect(precessionToJ2000(JD_J2000 - 36525)).toBeGreaterThan(0);
  });

  it('amounts to roughly 26 degrees between Ptolemy and J2000', () => {
    const ptolemy = calendarToJd(137, 7, 20);
    const p = precessionToJ2000(ptolemy);
    expect(p).toBeGreaterThan(25);
    expect(p).toBeLessThan(27);
  });
});
