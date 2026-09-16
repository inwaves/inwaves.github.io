import { describe, expect, it } from 'vitest';
import { Vector3 } from 'three';
import fixtures from '../__fixtures__/horizons.json';
import { geocentricLonLat, type TruthBodyId } from './index';
import { heliocentricOfDate } from './planets';
import { satelliteJ2000, SATELLITES, type SatelliteId } from './satellites';
import { norm180 } from '../math';

interface ObserverRow {
  jd: number;
  label: string;
  lon: number;
  lat: number;
  delta: number;
}

const observer = fixtures.observer as Record<TruthBodyId, ObserverRow[]>;

/** Tolerances in degrees; the Moon's truncated series and ancient extrapolation dominate. */
const TOLERANCE: Record<TruthBodyId, { lon: number; lat: number }> = {
  sun: { lon: 0.05, lat: 0.02 },
  moon: { lon: 0.35, lat: 0.1 },
  mercury: { lon: 0.15, lat: 0.1 },
  venus: { lon: 0.15, lat: 0.1 },
  mars: { lon: 0.15, lat: 0.1 },
  jupiter: { lon: 0.25, lat: 0.1 },
  saturn: { lon: 0.35, lat: 0.1 },
};

describe('modern ephemeris vs JPL Horizons (DE441)', () => {
  for (const body of Object.keys(TOLERANCE) as TruthBodyId[]) {
    it(`${body}: geocentric ecliptic-of-date coordinates from 1000 BCE to 2026`, () => {
      const errors = observer[body].map((row) => {
        const p = geocentricLonLat(body, row.jd);
        return { label: row.label, dLon: norm180(p.lon - row.lon), dLat: p.lat - row.lat, dist: p.r / row.delta };
      });
      for (const e of errors) {
        expect(Math.abs(e.dLon), `${body} longitude at ${e.label}`).toBeLessThan(TOLERANCE[body].lon);
        expect(Math.abs(e.dLat), `${body} latitude at ${e.label}`).toBeLessThan(TOLERANCE[body].lat);
        expect(e.dist, `${body} distance ratio at ${e.label}`).toBeGreaterThan(0.98);
        expect(e.dist, `${body} distance ratio at ${e.label}`).toBeLessThan(1.02);
      }
    });
  }

  it('Earth orbits at about 1 AU', () => {
    const r = heliocentricOfDate('emb', 2451545).length();
    expect(r).toBeGreaterThan(0.98);
    expect(r).toBeLessThan(1.02);
  });
});

describe('satellites vs JPL Horizons', () => {
  const sats = fixtures.satellites as Record<SatelliteId, { jd: number; r: number[] }[]>;
  for (const spec of SATELLITES) {
    it(`${spec.name}: direction within tolerance at every check date`, () => {
      for (const state of sats[spec.id]) {
        const model = satelliteJ2000(spec.id, state.jd, new Vector3());
        const truth = new Vector3(state.r[0], state.r[1], state.r[2]);
        const angle = (model.angleTo(truth) * 180) / Math.PI;
        // Galileo's night (1610) is 390 years from the J2000 fit; Iapetus's inclined orbit precesses.
        const tolerance = spec.id === 'iapetus' ? 20 : spec.planet === 'jupiter' && state.jd < 2400000 ? 12 : 6;
        expect(angle, `${spec.name} at JD ${state.jd}`).toBeLessThan(tolerance);
      }
    });
  }
});
