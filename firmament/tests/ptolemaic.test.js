import { describe, expect, it } from 'vitest';
import { atan2d, cosd, sind, wrap180, wrap360 } from '../src/core/angles.js';
import { JD_NABONASSAR, calendarToJd, precessionToJ2000 } from '../src/core/time.js';
import { add, length, toLonLat } from '../src/core/vec.js';
import { PLANETS } from '../src/data/almagest.js';
import {
  createPtolemaicModel,
  meanSunLongitude,
  moonGeometry,
  planetGeometry,
  planetPlaneGeometry,
  sunGeometry,
} from '../src/models/ptolemaic.js';

const atand = (x) => (Math.atan(x) * 180) / Math.PI;

/**
 * Independent reference: a direct port of the closed-form routines `eqplan` and
 * `eqme` from R. H. van Gent's Almagest Ephemeris Calculator. They reach the
 * longitude by trigonometric reduction, whereas the model under test builds the
 * figure geometrically, so agreement is a genuine cross-check of both.
 * Lengths are in units of the deferent radius; angles in degrees.
 */
function referencePlanet(ecc, epi, k, anomaly) {
  const esin = ecc * sind(k);
  const ecos = ecc * cosd(k);
  const a = ecos + Math.sqrt(1 - esin * esin);
  const pros = -atand((2 * esin) / a);
  const b = Math.sqrt(a * a + 4 * esin * esin);
  const fsin = epi * sind(anomaly - pros);
  const fcos = epi * cosd(anomaly - pros);
  const eq = atand(fsin / (b + fcos));
  const px = epi * cosd(anomaly) + a;
  const py = epi * sind(anomaly) - 2 * esin;
  return { equation: pros + eq, distance: Math.hypot(px, py) };
}

function referenceMercury(ecc, epi, k, anomaly) {
  const ecos = ecc * cosd(k);
  const esin = ecc * sind(k);
  const ecoscos = 2 * ecc * cosd(k / 2) * cosd((3 * k) / 2);
  const ecossin = 2 * ecc * cosd(k / 2) * sind((3 * k) / 2);
  const a = ecos + ecoscos + Math.sqrt(1 - ecossin * ecossin);
  const pros = -atand(esin / a);
  const b = Math.sqrt(a * a + esin * esin);
  const fcos = epi * cosd(anomaly - pros);
  const fsin = epi * sind(anomaly - pros);
  const eq = atand(fsin / (b + fcos));
  return { equation: pros + eq, distance: Math.hypot(b + fcos, fsin) };
}

/** Tropical longitude and distance (in deferent radii) from the model's plane geometry. */
function modelPlane(name, jd) {
  const g = planetPlaneGeometry(name, jd);
  const p = add(g.epicycleCentre, g.epicycleVector);
  return { g, longitude: wrap360(atan2d(p[1], p[0])), distance: Math.hypot(p[0], p[1]) / g.R };
}

/** Sample dates spread over several centuries so every anomaly is exercised. */
const SAMPLE_DATES = Array.from({ length: 60 }, (_, i) => JD_NABONASSAR + 300000 + i * 1237.31);

describe('Ptolemaic planets against the closed-form reference', () => {
  for (const name of ['saturn', 'jupiter', 'mars', 'venus']) {
    it(`${name}: geometric construction matches the equant formulae`, () => {
      const p = PLANETS[name];
      for (const jd of SAMPLE_DATES) {
        const { g, longitude, distance } = modelPlane(name, jd);
        const ref = referencePlanet(p.eccentricity, p.epicycle, g.k, g.anomaly);
        const expected = wrap360(g.apogee + g.k + ref.equation);
        expect(wrap180(longitude - expected)).toBeCloseTo(0, 8);
        expect(distance).toBeCloseTo(ref.distance, 9);
      }
    });
  }

  it('mercury: crank mechanism matches the dedicated formulae', () => {
    const p = PLANETS.mercury;
    for (const jd of SAMPLE_DATES) {
      const { g, longitude, distance } = modelPlane('mercury', jd);
      const ref = referenceMercury(p.eccentricity, p.epicycle, g.k, g.anomaly);
      const expected = wrap360(g.apogee + g.k + ref.equation);
      expect(wrap180(longitude - expected)).toBeCloseTo(0, 8);
      expect(distance).toBeCloseTo(ref.distance, 9);
    }
  });

  it('keeps the epicycle centre exactly on the deferent, including Mercury\'s moving one', () => {
    for (const name of Object.keys(PLANETS)) {
      for (const jd of SAMPLE_DATES) {
        const g = planetPlaneGeometry(name, jd);
        const fromCentre = [g.epicycleCentre[0] - g.deferentCentre[0], g.epicycleCentre[1] - g.deferentCentre[1], 0];
        expect(length(fromCentre) / g.R).toBeCloseTo(1, 10);
      }
    }
  });
});

describe('structure of the Ptolemaic theory', () => {
  it('holds each outer planet\'s epicycle radius parallel to the line from Earth to the mean Sun', () => {
    for (const name of ['saturn', 'jupiter', 'mars']) {
      for (const jd of SAMPLE_DATES) {
        const g = planetPlaneGeometry(name, jd);
        const direction = atan2d(g.epicycleVector[1], g.epicycleVector[0]);
        expect(wrap180(direction - meanSunLongitude(jd))).toBeCloseTo(0, 6);
      }
    }
  });

  it('moves the epicycle centre uniformly as seen from the equant, not from the Earth', () => {
    const dt = 40;
    const angleFrom = (origin, g) => atan2d(g.epicycleCentre[1] - origin[1], g.epicycleCentre[0] - origin[0]);
    const steps = Array.from({ length: 12 }, (_, i) => planetPlaneGeometry('mars', SAMPLE_DATES[0] + i * dt));
    const fromEquant = [];
    const fromEarth = [];
    for (let i = 1; i < steps.length; i += 1) {
      // The apsidal line drifts by a negligible amount over these intervals.
      fromEquant.push(wrap180(angleFrom(steps[i].equantPoint, steps[i]) - angleFrom(steps[i - 1].equantPoint, steps[i - 1])));
      fromEarth.push(wrap180(angleFrom([0, 0], steps[i]) - angleFrom([0, 0], steps[i - 1])));
    }
    const spread = (xs) => Math.max(...xs) - Math.min(...xs);
    expect(spread(fromEquant)).toBeLessThan(1e-3);
    expect(spread(fromEarth)).toBeGreaterThan(1);
  });
});

/** Geocentric J2000 longitude of a body in the full spatial model. */
const longitudeOf = (name, jd) => toLonLat(planetGeometry(name, jd).pos).lon;

/** Counts the separate retrograde episodes in [start, start + span]. */
function countRetrogrades(name, start, span, step = 1) {
  let count = 0;
  let wasRetrograde = false;
  let previous = longitudeOf(name, start);
  for (let t = step; t <= span; t += step) {
    const current = longitudeOf(name, start + t);
    const retrograde = wrap180(current - previous) < 0;
    if (retrograde && !wasRetrograde) count += 1;
    wasRetrograde = retrograde;
    previous = current;
  }
  return count;
}

describe('apparent motions the model was built to save', () => {
  const start = calendarToJd(137, 1, 1);

  it('makes each planet retrograde once per synodic period', () => {
    const synodicDays = { mercury: 115.88, venus: 583.92, mars: 779.94, jupiter: 398.88, saturn: 378.09 };
    for (const [name, synodic] of Object.entries(synodicDays)) {
      const periods = 10;
      const count = countRetrogrades(name, start, synodic * periods);
      expect(Math.abs(count - periods)).toBeLessThanOrEqual(1);
    }
  });

  it('keeps Venus and Mercury within their greatest elongations from the Sun', () => {
    const greatest = { venus: 0, mercury: 0 };
    for (let t = 0; t < 3000; t += 1) {
      const jd = start + t;
      const sunLon = toLonLat(sunGeometry(jd).pos).lon;
      for (const name of Object.keys(greatest)) {
        greatest[name] = Math.max(greatest[name], Math.abs(wrap180(longitudeOf(name, jd) - sunLon)));
      }
    }
    expect(greatest.venus).toBeGreaterThan(44);
    expect(greatest.venus).toBeLessThan(49);
    expect(greatest.mercury).toBeGreaterThan(17);
    expect(greatest.mercury).toBeLessThan(30);
  });

  it('reproduces the unequal seasons Hipparchus measured', () => {
    // Spring 94 1/2 days and summer 92 1/2 days are the observations from which
    // the solar eccentricity and apogee were derived.
    const tropicalSun = (jd) => wrap360(toLonLat(sunGeometry(jd).pos).lon - precessionToJ2000(jd));
    const crossing = (target, from) => {
      let lo = from;
      let hi = from + 1;
      while (wrap180(tropicalSun(hi) - target) < 0) hi += 1;
      lo = hi - 1;
      for (let i = 0; i < 50; i += 1) {
        const mid = (lo + hi) / 2;
        if (wrap180(tropicalSun(mid) - target) < 0) lo = mid;
        else hi = mid;
      }
      return (lo + hi) / 2;
    };
    const base = calendarToJd(-145, 1, 1);
    const equinox = crossing(0, base);
    const solstice = crossing(90, equinox + 1);
    const autumn = crossing(180, solstice + 1);
    expect(solstice - equinox).toBeCloseTo(94.5, 1);
    expect(autumn - solstice).toBeCloseTo(92.5, 1);
  });
});

describe('nested spheres of the Planetary Hypotheses', () => {
  const model = createPtolemaicModel({ id: 'ptolemy' });

  it('keeps Venus always nearer than the Sun, so it could never show a full phase', () => {
    expect(model.shells.venus.max).toBeLessThan(model.shells.sun.min);
    expect(model.shells.mercury.max).toBeLessThan(model.shells.venus.min * 1.1);
  });

  it('carries the Moon between about 33 and 64 Earth radii', () => {
    expect(model.shells.moon.min).toBeGreaterThan(32);
    expect(model.shells.moon.min).toBeLessThan(35);
    expect(model.shells.moon.max).toBeGreaterThan(63);
    expect(model.shells.moon.max).toBeLessThan(65);
  });

  it('draws the Moon toward the Earth at the quadratures', () => {
    const synodic = 29.530594;
    let syzygy = Infinity;
    let quadrature = Infinity;
    for (let t = 0; t < synodic; t += 0.05) {
      const g = moonGeometry(JD_NABONASSAR + t);
      const elong = Math.abs(wrap180(g.elongation));
      const centre = length(g.epicycleCentre);
      if (elong < 2) syzygy = Math.min(syzygy, centre);
      if (Math.abs(elong - 90) < 2) quadrature = Math.min(quadrature, centre);
    }
    expect(syzygy).toBeGreaterThan(58);
    expect(quadrature).toBeLessThan(40);
  });

  it('packs the shells outward in Ptolemy\'s order without large gaps or overlaps', () => {
    const order = model.bodyOrder;
    for (let i = 1; i < order.length; i += 1) {
      const inner = model.shells[order[i - 1]];
      const outer = model.shells[order[i]];
      // Ptolemy's rounded figures leave the shells meeting to within a few percent.
      expect(outer.min / inner.max).toBeGreaterThan(0.9);
      expect(outer.min / inner.max).toBeLessThan(1.15);
    }
  });

  it('returns every body and stable, unique guide identifiers', () => {
    const a = model.state(calendarToJd(137, 7, 20));
    const b = model.state(calendarToJd(137, 9, 1));
    expect(Object.keys(a.bodies).sort()).toEqual(['earth', 'jupiter', 'mars', 'mercury', 'moon', 'saturn', 'sun', 'venus']);
    const ids = a.guides.map((g) => g.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(b.guides.map((g) => g.id)).toEqual(ids);
    expect(model.state(calendarToJd(137, 7, 20), { guides: false }).guides).toEqual([]);
  });
});

describe('independent equant and eccentric switches', () => {
  const jd = calendarToJd(137, 7, 20);
  const plainEccentric = { equant: false, eccentric: true };

  it('gives Mercury a plain eccentric, not the crank, when the equant is off', () => {
    const g = planetPlaneGeometry('mercury', jd, plainEccentric);
    expect(g.crankCentre).toBeNull();
    // The deferent centre is fixed on the apsidal line at the eccentricity.
    expect(length(g.deferentCentre)).toBeCloseTo(g.e, 9);
    expect(wrap180(atan2d(g.deferentCentre[1], g.deferentCentre[0]) - g.apogee)).toBeCloseTo(0, 9);
    // With no equant the centre of uniform motion is the deferent centre itself.
    expect(g.equantPoint[0]).toBeCloseTo(g.deferentCentre[0], 9);
    expect(g.equantPoint[1]).toBeCloseTo(g.deferentCentre[1], 9);
  });

  it('moves every planet uniformly about its deferent centre when the equant is off', () => {
    const dt = 9;
    for (const name of Object.keys(PLANETS)) {
      const steps = Array.from({ length: 10 }, (_, i) => planetPlaneGeometry(name, jd + i * dt, plainEccentric));
      const angle = (g) => atan2d(g.epicycleCentre[1] - g.deferentCentre[1], g.epicycleCentre[0] - g.deferentCentre[0]);
      const increments = steps.slice(1).map((g, i) => wrap180(angle(g) - angle(steps[i])));
      expect(Math.max(...increments) - Math.min(...increments)).toBeLessThan(1e-3);
    }
  });

  it('draws neither an equant nor a crank for any planet when the equant is off', () => {
    const model = createPtolemaicModel({ id: 'plain-eccentric', equant: false, eccentric: true });
    const roles = model.state(jd).guides.map((g) => g.role);
    expect(roles).not.toContain('equant');
    expect(roles.filter((r) => r === 'crank')).toEqual(['crank']); // the Moon's, which is a separate switch
    expect(model.state(jd).guides.filter((g) => g.body === 'mercury').map((g) => g.role)).not.toContain('crank');
    // The eccentric itself is still there.
    expect(model.state(jd).guides.filter((g) => g.body === 'mercury').map((g) => g.role)).toContain('centre');
  });

  it('engages Mercury\'s crank, with its equant, only in the full Almagest construction', () => {
    const g = planetPlaneGeometry('mercury', jd);
    expect(g.crankCentre).not.toBeNull();
    const full = createPtolemaicModel({ id: 'full' }).state(jd).guides.filter((x) => x.body === 'mercury').map((x) => x.role);
    expect(full).toContain('crank');
    expect(full).toContain('equant');
  });
});

describe('the geometry before Ptolemy', () => {
  const early = createPtolemaicModel({ id: 'hipparchus', equant: false, eccentric: false, lunarCrank: false });

  it('has no equant, no planetary eccentric and no lunar crank', () => {
    const roles = new Set(early.state(calendarToJd(-130, 1, 1)).guides.map((g) => g.role));
    expect(roles.has('equant')).toBe(false);
    expect(roles.has('crank')).toBe(false);
    const g = planetPlaneGeometry('mars', calendarToJd(-130, 1, 1), { equant: false, eccentric: false });
    expect(length(g.deferentCentre)).toBeCloseTo(0, 12);
  });

  it('still retains the eccentric Sun, which is Hipparchus\'s own result', () => {
    const roles = early.state(calendarToJd(-130, 1, 1)).guides.filter((g) => g.body === 'sun').map((g) => g.role);
    expect(roles).toContain('centre');
  });
});
