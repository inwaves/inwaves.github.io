import { describe, expect, it } from 'vitest';
import fixtures from '../../astro/__fixtures__/horizons.json';
import { norm180 } from '../../astro/math';
import { evaluateLongitudes } from '../observe';
import { Mechanism, timeContext } from '../mechanism';
import { PLANETARY_HYPOTHESES } from '../shared/almagest';
import { ptolemy } from './ptolemy';
import { resolveOptions } from '../era';

const row = (body: string, label: string) =>
  (fixtures.observer as Record<string, { label: string; jd: number; lon: number }[]>)[body].find((r) => r.label.startsWith(label))!;

describe('Ptolemy (Almagest) against the real sky of 28 May 139 CE', () => {
  const jd = row('sun', '139 CE').jd;

  for (const scale of ['schematic', 'proportional']) {
    it(`predicts every body within the accuracy historians report (${scale} layout)`, () => {
      const model = ptolemy.build(resolveOptions(ptolemy, { scale }));
      const lon = evaluateLongitudes(model, jd);
      // Almagest errors in Ptolemy's own time: a degree or so for the Sun and superior planets,
      // several degrees for Mercury, Venus and Mars at unfavourable configurations.
      const tolerance: Record<string, number> = { sun: 2, moon: 4, mercury: 6, venus: 5, mars: 5, jupiter: 3, saturn: 3 };
      for (const body of Object.keys(tolerance)) {
        const err = norm180(lon[body].lon - row(body, '139 CE').lon);
        expect(Math.abs(err), `${body} error ${err.toFixed(2)}°`).toBeLessThan(tolerance[body]);
      }
    });
  }

  it('places Mars at opposition in the evening of the Mars opposition Ptolemy recorded', () => {
    const lon = evaluateLongitudes(ptolemy.build(resolveOptions(ptolemy, {})), jd);
    expect(Math.abs(norm180(lon.mars.lon - lon.sun.lon - 180))).toBeLessThan(3);
  });

  it('keeps shells nested as in the Planetary Hypotheses', () => {
    const lon = evaluateLongitudes(ptolemy.build(resolveOptions(ptolemy, { scale: 'proportional' })), jd);
    expect(lon.moon.r).toBeLessThan(65);
    expect(lon.mercury.r).toBeGreaterThan(60);
    expect(lon.sun.r).toBeGreaterThan(1150);
    expect(lon.sun.r).toBeLessThan(1265);
    expect(lon.saturn.r).toBeGreaterThan(14000);
    expect(lon.saturn.r).toBeLessThan(19900);
  });

  it('carries the Moon on its epicycle in an inclined lunar plane', () => {
    const model = ptolemy.build(resolveOptions(ptolemy, { scale: 'proportional' }));
    const m = new Mechanism(model);
    for (const offset of [0, 3.1, 7.7, 11.3, 19.9]) {
      m.evaluate(timeContext(jd + offset));
      const radius = m.node('moon.body').worldPos.distanceTo(m.node('moon.epicycle').worldPos);
      expect(radius).toBeCloseTo(5.25 * PLANETARY_HYPOTHESES.moon, 9);
    }
    const lat = evaluateLongitudes(model, jd).moon.lat;
    const truthLat = (fixtures.observer as Record<string, { label: string; lat: number }[]>).moon.find((r) =>
      r.label.startsWith('139 CE'),
    )!.lat;
    expect(Math.abs(lat - truthLat)).toBeLessThan(1.5);
  });
});
