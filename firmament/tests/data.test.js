import { describe, expect, it } from 'vitest';
import { wrap360 } from '../src/core/angles.js';
import { MOON, PLANETS, PTOLEMAIC_ORDER, SUN } from '../src/data/almagest.js';
import { COPERNICAN_RADII, JPL_ELEMENTS } from '../src/data/elements.js';

/**
 * These tests check the internal consistency of the transcribed tables. A
 * transcription slip in any one digit would break a relation that Ptolemy's
 * model requires to hold exactly, so they guard the data as well as document
 * the structure of the theory.
 */
describe('Almagest tables', () => {
  const outer = ['saturn', 'jupiter', 'mars'];

  it('gives every outer planet a longitude and anomaly motion that sum to the solar motion', () => {
    for (const name of outer) {
      const p = PLANETS[name];
      expect(p.meanMotion + p.anomalyMotion).toBeCloseTo(SUN.meanMotion, 7);
    }
  });

  it('gives every outer planet epoch values that sum to the solar epoch longitude', () => {
    for (const name of outer) {
      const p = PLANETS[name];
      expect(wrap360(p.meanLongitudeAtEpoch + p.anomalyAtEpoch)).toBeCloseTo(SUN.meanLongitudeAtEpoch, 9);
    }
  });

  it('ties the inner planets to the mean Sun', () => {
    for (const name of ['venus', 'mercury']) {
      expect(PLANETS[name].followsMeanSun).toBe(true);
      expect(PLANETS[name].meanMotion).toBeUndefined();
    }
  });

  it('relates the lunar motions: elongation is lunar minus solar longitude', () => {
    expect(MOON.meanMotion - SUN.meanMotion).toBeCloseTo(MOON.elongationMotion, 7);
    expect(wrap360(MOON.meanLongitudeAtEpoch - SUN.meanLongitudeAtEpoch)).toBeCloseTo(MOON.elongationAtEpoch, 9);
  });

  it('adopts the solar eccentricity Hipparchus found, one twenty-fourth', () => {
    expect(SUN.eccentricity).toBeCloseTo(1 / 24, 12);
  });

  it('orders the spheres as Ptolemy did, with increasing deferent radii', () => {
    const radii = PTOLEMAIC_ORDER.filter((b) => b !== 'moon').map((b) =>
      b === 'sun' ? SUN.deferentEarthRadii : PLANETS[b].deferentEarthRadii,
    );
    const sorted = [...radii].sort((a, b) => a - b);
    expect(radii).toEqual(sorted);
  });
});

describe('modern elements', () => {
  it('has Copernican radii within a few percent of the modern semi-major axes', () => {
    for (const [name, radius] of Object.entries(COPERNICAN_RADII)) {
      const modern = JPL_ELEMENTS[name].a[0];
      expect(Math.abs(radius - modern) / modern).toBeLessThan(0.04);
    }
  });

  it('satisfies Kepler\'s third law between mean motion and semi-major axis', () => {
    const earthRate = JPL_ELEMENTS.earth.L[1];
    for (const [name, el] of Object.entries(JPL_ELEMENTS)) {
      const periodYears = earthRate / el.L[1];
      expect(periodYears ** 2 / el.a[0] ** 3).toBeCloseTo(1, 2);
    }
  });
});
