import { describe, expect, it } from 'vitest';
import { wrap180 } from '../src/core/angles.js';
import { JD_J2000, calendarToJd, jdToCalendar } from '../src/core/time.js';
import { cross, length, rotateZ, sub, tilt, toLonLat } from '../src/core/vec.js';
import { COMET, JPL_ELEMENTS, KM_PER_AU, MOON_MEAN, SATELLITES } from '../src/data/elements.js';
import { getEra } from '../src/data/eras.js';
import { cosmosDistance } from '../src/render/framing.js';
import {
  cometPosition,
  copernicanEarth,
  copernicanGeometry,
  createHeliocentricModel,
  elementsAt,
  keplerPosition,
  moonOffset,
  solveKepler,
} from '../src/models/heliocentric.js';

const copernicus = createHeliocentricModel({ id: 'copernicus', orbits: 'circles', center: 'sun', starRadius: 2000 });
const tycho = createHeliocentricModel({ id: 'tycho', orbits: 'circles', center: 'earth', starRadius: 12 });
const kepler = createHeliocentricModel({ id: 'kepler', orbits: 'ellipses', center: 'sun', starRadius: 2000 });

const PLANETS = ['mercury', 'venus', 'mars', 'jupiter', 'saturn'];

/** Direction of a body as seen from the Earth, in a model's own frame. */
function geocentric(model, name, jd) {
  const { bodies } = model.state(jd, { guides: false });
  return toLonLat(sub(bodies[name].pos, bodies.earth.pos));
}

describe('Kepler\'s equation', () => {
  it('is solved to machine precision across all anomalies, including a near-parabolic orbit', () => {
    for (const e of [0, 0.0167, 0.2056, 0.6, 0.9, 0.96714, 0.999]) {
      for (let m = -Math.PI; m <= Math.PI; m += 0.0731) {
        const E = solveKepler(m, e);
        // Compare as angles: the solver normalises the mean anomaly, so at the
        // boundary it may return the solution for +pi when asked for -pi. They
        // are the same point on the orbit, and callers use only sin E and cos E.
        const residual = E - e * Math.sin(E) - m;
        expect(Math.sin(residual)).toBeCloseTo(0, 10);
        expect(Math.cos(residual)).toBeCloseTo(1, 10);
      }
    }
  });

  it('accepts mean anomalies outside one revolution', () => {
    const E = solveKepler(1 + 10 * Math.PI, 0.3);
    expect(E - 0.3 * Math.sin(E)).toBeCloseTo(1, 10);
  });
});

describe('Kepler\'s laws', () => {
  it('first law: perihelion and aphelion distances are a(1 - e) and a(1 + e)', () => {
    for (const name of [...PLANETS, 'earth']) {
      const period = 360 / (JPL_ELEMENTS[name].L[1] / 36525);
      let min = { r: Infinity, jd: 0 };
      let max = { r: -Infinity, jd: 0 };
      for (let i = 0; i < 4000; i += 1) {
        const jd = JD_J2000 + (period * i) / 4000;
        const r = length(keplerPosition(name, jd));
        if (r < min.r) min = { r, jd };
        if (r > max.r) max = { r, jd };
      }
      // The elements carry JPL's secular rates, so over Jupiter's twelve-year
      // orbit a(1 - e) itself shifts by several units in the fifth decimal.
      // Each extreme is therefore judged by the elements in force when it occurs.
      const atMin = elementsAt(name, min.jd);
      const atMax = elementsAt(name, max.jd);
      expect(min.r).toBeCloseTo(atMin.a * (1 - atMin.e), 4);
      expect(max.r).toBeCloseTo(atMax.a * (1 + atMax.e), 4);
    }
  });

  it('second law: the radius vector sweeps equal areas in equal times', () => {
    // Mercury and Mars have the largest eccentricities, so the test bites hardest there.
    for (const name of ['mercury', 'mars']) {
      const period = 360 / (JPL_ELEMENTS[name].L[1] / 36525);
      const dt = 0.01;
      const rates = [];
      for (let i = 0; i < 40; i += 1) {
        const t = JD_J2000 + (period * i) / 40;
        const r0 = keplerPosition(name, t);
        const r1 = keplerPosition(name, t + dt);
        rates.push(length(cross(r0, sub(r1, r0))) / (2 * dt));
      }
      const mean = rates.reduce((s, x) => s + x, 0) / rates.length;
      for (const rate of rates) expect(rate / mean).toBeCloseTo(1, 4);
    }
  });

  it('moves faster at perihelion than at aphelion, which uniform circular motion cannot do', () => {
    const el = elementsAt('mars', JD_J2000);
    const period = 360 / (JPL_ELEMENTS.mars.L[1] / 36525);
    const tPeri = JD_J2000 + ((el.peri - el.L) / 360) * period;
    const speed = (t) => length(sub(keplerPosition('mars', t + 0.5), keplerPosition('mars', t - 0.5)));
    expect(speed(tPeri) / speed(tPeri + period / 2)).toBeCloseTo((1 + el.e) / (1 - el.e), 2);
  });
});

describe('agreement with the real sky', () => {
  it('puts the Sun near longitude 280.4 degrees at noon on 1 January 2000', () => {
    expect(geocentric(kepler, 'sun', JD_J2000).lon).toBeCloseTo(280.38, 1);
  });

  it('brings Mars to its close opposition of late August 2003', () => {
    const jd = calendarToJd(2003, 8, 28.5);
    const mars = geocentric(kepler, 'mars', jd);
    const sun = geocentric(kepler, 'sun', jd);
    expect(Math.abs(wrap180(mars.lon - sun.lon))).toBeGreaterThan(178.5);
    expect(mars.dist).toBeGreaterThan(0.365);
    expect(mars.dist).toBeLessThan(0.38);
  });

  it('brings Jupiter and Saturn together for the great conjunction of December 2020', () => {
    const jd = calendarToJd(2020, 12, 21.5);
    const separation = wrap180(geocentric(kepler, 'jupiter', jd).lon - geocentric(kepler, 'saturn', jd).lon);
    expect(Math.abs(separation)).toBeLessThan(1);
  });

  it('sends the comet through perihelion on 15 September 1682, inside the orbit of Venus', () => {
    const c = jdToCalendar(COMET.perihelionJd);
    expect([c.year, c.month, c.day]).toEqual([1682, 9, 15]);
    const r = length(cometPosition(COMET.perihelionJd));
    expect(r).toBeCloseTo(COMET.a * (1 - COMET.e), 6);
    // The perihelion distance as Yeomans published it.
    expect(r).toBeCloseTo(0.5870992, 6);
    expect(COMET.q).toBe(0.5870992);
    expect(COMET.e).toBe(0.9672724);
    expect(r).toBeGreaterThan(0.55);
    expect(r).toBeLessThan(0.62);
    // A month either side it is already farther off: this really is the closest approach.
    expect(length(cometPosition(COMET.perihelionJd - 30))).toBeGreaterThan(r);
    expect(length(cometPosition(COMET.perihelionJd + 30))).toBeGreaterThan(r);
  });

  it('has the comet well beyond Saturn and still receding when the Newtonian era opens in 1687', () => {
    // The regression. Anchored at the 1986 perihelion and stepped back four fixed
    // periods, the comet reached the Sun in late 1684, and in July 1687 stood
    // inside Saturn's orbit. Nearly five years after September 1682 it belongs
    // at about 14 au.
    const opens = getEra('newton').defaultJd;
    const r = length(cometPosition(opens));
    expect(r).toBeGreaterThan(12);
    expect(r).toBeLessThan(16);
    expect(r).toBeGreaterThan(elementsAt('saturn', opens).a * 1.05);
    expect(length(cometPosition(opens + 100))).toBeGreaterThan(r);
  });

  it('lies beyond every planet Newton knew at aphelion, decades later', () => {
    const periodDays = 360 / (0.9856076686 / COMET.a ** 1.5);
    expect(length(cometPosition(COMET.perihelionJd + periodDays / 2))).toBeGreaterThan(34);
  });

  it('returns in September 1758, the year Halley named, and not in March 1759 when it really came', () => {
    // No perturbations are modelled. The real comet was held back by Jupiter and
    // Saturn and reached perihelion on 13 March 1759, 76.49 years after 1682;
    // the fixed period here is 75.98. The bounds are tight on purpose: the
    // commentary and docs/SOURCES.md state this month and this margin, and a
    // change to the elements must not leave them silently wrong.
    const periodDays = 360 / (0.9856076686 / COMET.a ** 1.5);
    expect(periodDays / 365.25).toBeCloseTo(75.98, 2);
    const nextPerihelion = COMET.perihelionJd + periodDays;
    const c = jdToCalendar(nextPerihelion);
    expect([c.year, c.month]).toEqual([1758, 9]);
    expect(length(cometPosition(nextPerihelion))).toBeCloseTo(COMET.a * (1 - COMET.e), 6);
    const earlyBy = calendarToJd(1759, 3, 13) - nextPerihelion;
    expect(earlyBy).toBeGreaterThan(175);
    expect(earlyBy).toBeLessThan(195);
  });
});

describe('Copernicus: circles standing in for the ellipse', () => {
  it('reaches the same extreme distances an ellipse would, scaled to his radius', () => {
    for (const name of PLANETS) {
      const period = 360 / (JPL_ELEMENTS[name].L[1] / 36525);
      let min = Infinity;
      let max = -Infinity;
      for (let i = 0; i < 2000; i += 1) {
        const r = length(copernicanGeometry(name, JD_J2000 + (period * i) / 2000).pos);
        min = Math.min(min, r);
        max = Math.max(max, r);
      }
      const g = copernicanGeometry(name, JD_J2000);
      expect(min / g.a).toBeCloseTo(1 - g.e, 3);
      expect(max / g.a).toBeCloseTo(1 + g.e, 3);
    }
  });

  it('keeps the epicyclet centre exactly on its circle: uniform circular motion only', () => {
    for (const name of PLANETS) {
      for (let i = 0; i < 30; i += 1) {
        const g = copernicanGeometry(name, JD_J2000 + i * 97.3);
        // Compare in the orbital plane via lengths, which the inclination preserves.
        expect(length(sub(g.epicycletCentre, g.eccentricCentre))).toBeCloseTo(g.a, 9);
        expect(length(sub(g.pos, g.epicycletCentre))).toBeCloseTo(g.epicycletRadius, 9);
      }
    }
  });

  it('tracks Kepler\'s directions closely for the nearly circular orbits', () => {
    // The construction matches an ellipse to first order in eccentricity, so the
    // residual grows as e squared. It is small for Venus, Jupiter and Saturn.
    const worst = { venus: 0, jupiter: 0, saturn: 0 };
    for (let i = 0; i < 400; i += 1) {
      const jd = calendarToJd(1543, 1, 1) + i * 23.7;
      for (const name of Object.keys(worst)) {
        const delta = Math.abs(wrap180(geocentric(copernicus, name, jd).lon - geocentric(kepler, name, jd).lon));
        worst[name] = Math.max(worst[name], delta);
      }
    }
    expect(worst.venus).toBeLessThan(2.5);
    expect(worst.jupiter).toBeLessThan(1.5);
    expect(worst.saturn).toBeLessThan(1.5);
  });

  it('errs most for Mars, the planet whose misfit drove Kepler to the ellipse', () => {
    let mars = 0;
    let jupiter = 0;
    for (let i = 0; i < 600; i += 1) {
      const jd = calendarToJd(1580, 1, 1) + i * 13.1;
      mars = Math.max(mars, Math.abs(wrap180(geocentric(copernicus, 'mars', jd).lon - geocentric(kepler, 'mars', jd).lon)));
      jupiter = Math.max(jupiter, Math.abs(wrap180(geocentric(copernicus, 'jupiter', jd).lon - geocentric(kepler, 'jupiter', jd).lon)));
    }
    expect(mars).toBeGreaterThan(jupiter);
    expect(mars).toBeLessThan(6);
  });

  it('places the Earth on a plain eccentric about the mean Sun', () => {
    for (let i = 0; i < 20; i += 1) {
      const earth = copernicanEarth(JD_J2000 + i * 19);
      expect(length(sub(earth.pos, earth.centre))).toBeCloseTo(earth.a, 12);
    }
  });
});

describe('Tycho: the same appearances from a stationary Earth', () => {
  it('leaves the Earth at rest at the origin', () => {
    for (let i = 0; i < 10; i += 1) {
      expect(length(tycho.state(JD_J2000 + i * 40, { guides: false }).bodies.earth.pos)).toBeCloseTo(0, 12);
    }
  });

  it('gives every body exactly the direction and distance Copernicus gives', () => {
    for (let i = 0; i < 25; i += 1) {
      const jd = calendarToJd(1588, 1, 1) + i * 61.7;
      for (const name of [...PLANETS, 'sun', 'moon']) {
        const a = geocentric(copernicus, name, jd);
        const b = geocentric(tycho, name, jd);
        expect(wrap180(a.lon - b.lon)).toBeCloseTo(0, 9);
        expect(a.lat).toBeCloseTo(b.lat, 9);
        expect(a.dist).toBeCloseTo(b.dist, 9);
      }
    }
  });

  it('lets the orbit of Mars cut through the orbit of the Sun, which solid spheres forbid', () => {
    let nearest = Infinity;
    for (let i = 0; i < 1600; i += 1) nearest = Math.min(nearest, geocentric(tycho, 'mars', JD_J2000 + i).dist);
    expect(nearest).toBeLessThan(1);
  });

  it('centres the planets\' circles on the moving Sun and draws the Sun\'s circle about the Earth', () => {
    const jd = calendarToJd(1588, 6, 1);
    const { bodies, guides } = tycho.state(jd);
    const ids = guides.map((g) => g.id);
    expect(ids).toContain('sun-orbit');
    expect(ids).not.toContain('earth-orbit');
    const marsOrbit = guides.find((g) => g.id === 'mars-orbit');
    // The centre of Mars's circle stays within its small eccentric offset of the Sun.
    expect(length(sub(marsOrbit.center, bodies.sun.pos))).toBeLessThan(0.25);
    expect(length(bodies.sun.pos)).toBeGreaterThan(0.9);
  });

  it('refuses the combination nobody proposed: ellipses about a stationary Earth', () => {
    expect(() => createHeliocentricModel({ id: 'x', orbits: 'ellipses', center: 'earth', starRadius: 12 })).toThrow();
  });
});

describe('retrograde motion as a consequence of the Earth\'s own motion', () => {
  it('occurs once per synodic period in every arrangement', () => {
    const synodic = { mercury: 115.88, venus: 583.92, mars: 779.94, jupiter: 398.88, saturn: 378.09 };
    for (const model of [copernicus, tycho, kepler]) {
      for (const [name, period] of Object.entries(synodic)) {
        const periods = 8;
        let count = 0;
        let was = false;
        let prev = geocentric(model, name, JD_J2000).lon;
        for (let t = 1; t <= period * periods; t += 1) {
          const cur = geocentric(model, name, JD_J2000 + t).lon;
          const retro = wrap180(cur - prev) < 0;
          if (retro && !was) count += 1;
          was = retro;
          prev = cur;
        }
        expect(Math.abs(count - periods)).toBeLessThanOrEqual(1);
      }
    }
  });

  it('is centred on opposition for an outer planet: Mars moves backwards when opposite the Sun', () => {
    const jd = calendarToJd(2003, 8, 28.5);
    const before = geocentric(kepler, 'mars', jd - 1).lon;
    const after = geocentric(kepler, 'mars', jd + 1).lon;
    expect(wrap180(after - before)).toBeLessThan(0);
  });
});

describe('the Moon\'s orbit guide', () => {
  const a = MOON_MEAN.semiMajorAxisAu;
  const e = MOON_MEAN.eccentricity;
  const dates = Array.from({ length: 24 }, (_, i) => JD_J2000 + i * 131.7);

  /** The lunar guide expressed relative to the Earth. */
  function lunarGuide(model, jd) {
    const { bodies, guides } = model.state(jd);
    const guide = guides.find((g) => g.id === 'moon-orbit');
    return { guide, bodies, relative: guide.points?.map((p) => sub(p, bodies.earth.pos)) };
  }

  it('is an ellipse reaching a(1 - e) at perigee and a(1 + e) at apogee', () => {
    for (const jd of dates) {
      const { guide, relative } = lunarGuide(kepler, jd);
      expect(guide.type).toBe('polyline');
      expect(guide.role).toBe('orbit');
      const radii = relative.map(length);
      expect(Math.min(...radii) / a).toBeCloseTo(1 - e, 6);
      expect(Math.max(...radii) / a).toBeCloseTo(1 + e, 3);
    }
  });

  it('points its perigee where the lunar elements say the perigee is', () => {
    for (const jd of dates) {
      const { relative } = lunarGuide(kepler, jd);
      const nearest = relative.reduce((best, p) => (length(p) < length(best) ? p : best));
      // The orbit is inclined only 5 degrees, so ecliptic longitude is a fair measure.
      expect(Math.abs(wrap180(toLonLat(nearest).lon - moonOffset(jd, 'ellipses').perigee))).toBeLessThan(0.5);
    }
  });

  it('passes through the Moon: the body lies on its own drawn orbit', () => {
    for (const jd of dates) {
      const { bodies, relative } = lunarGuide(kepler, jd);
      const moon = sub(bodies.moon.pos, bodies.earth.pos);
      const gap = Math.min(...relative.map((p) => length(sub(p, moon))));
      // Bounded by half the spacing of the polyline's vertices, about 3 percent of a.
      expect(gap / a).toBeLessThan(0.035);
      // And far closer than a circle of radius a would come at the apsides.
      const onCircle = Math.abs(length(moon) - a) / a;
      const onEllipse = Math.abs(length(moon) - length(relative.reduce((best, p) => (length(sub(p, moon)) < length(sub(best, moon)) ? p : best)))) / a;
      expect(onEllipse).toBeLessThanOrEqual(onCircle + 1e-3);
    }
  });

  it('lies in the plane of the lunar orbit, inclined about 5 degrees to the ecliptic', () => {
    const { relative } = lunarGuide(kepler, JD_J2000);
    const highest = Math.max(...relative.map((p) => Math.abs(toLonLat(p).lat)));
    expect(highest).toBeGreaterThan(4.9);
    expect(highest).toBeLessThan(5.3);
  });

  it('remains a circular deferent with an epicycle in the circular model', () => {
    const { guide, bodies } = lunarGuide(copernicus, JD_J2000);
    expect(guide.type).toBe('circle');
    expect(guide.role).toBe('deferent');
    expect(length(sub(guide.center, bodies.earth.pos))).toBeCloseTo(0, 12);
    expect(copernicus.state(JD_J2000).guides.map((g) => g.id)).toContain('moon-epicycle');
    expect(kepler.state(JD_J2000).guides.map((g) => g.id)).not.toContain('moon-epicycle');
  });
});

describe('the comet\'s orientation, which is recalled and not sourced', () => {
  // Yeomans (1985), for the equinox of 1950.0. Not used by the application.
  const YEOMANS_B1950 = { argPeri: 111.84657, node: 58.14397, I: 162.23932 };
  /** General precession in longitude from the equinox of 1950 to J2000, degrees. */
  const PRECESSION_1950_TO_2000 = (5029.0966 / 3600) * 0.5;

  // The same construction cometPosition uses to orient the orbit.
  const perihelionDirection = ({ argPeri, node, I }) => tilt(rotateZ([1, 0, 0], argPeri + node), node, I);
  const orbitNormal = ({ node, I }) => tilt([0, 0, 1], node, I);
  const apart = (a, b) => (Math.atan2(length(cross(a, b)), a[0] * b[0] + a[1] * b[1] + a[2] * b[2]) * 180) / Math.PI;
  const toJ2000 = (v) => rotateZ(v, PRECESSION_1950_TO_2000);

  it('differs from Yeomans\'s published angles mostly by the change of equinox', () => {
    const asPublished = apart(perihelionDirection(COMET), perihelionDirection(YEOMANS_B1950));
    const carried = apart(perihelionDirection(COMET), toJ2000(perihelionDirection(YEOMANS_B1950)));
    expect(asPublished).toBeCloseTo(0.78, 2);
    expect(carried).toBeCloseTo(0.12, 2);
    expect(carried).toBeLessThan(asPublished / 5);
  });

  it('still disagrees with Yeomans by about an eighth of a degree, so it is not claimed to be the same orbit', () => {
    // Ten times what rounding the recalled angles to 0.01 degree could produce.
    // The cause is not known. If this residual ever falls to the rounding level,
    // the angles have been replaced by sourced ones and the documentation, which
    // calls them Illustrative, should be revisited.
    const plane = apart(orbitNormal(COMET), toJ2000(orbitNormal(YEOMANS_B1950)));
    const perihelion = apart(perihelionDirection(COMET), toJ2000(perihelionDirection(YEOMANS_B1950)));
    expect(plane).toBeCloseTo(0.13, 2);
    expect(plane).toBeGreaterThan(0.05);
    expect(perihelion).toBeGreaterThan(0.05);
  });

  it('has a true longitude of perihelion that is not the node minus the argument', () => {
    // The shortcut is exact only at an inclination of 180 degrees. An earlier
    // version of the provenance notes relied on it and drew a false conclusion.
    const trueLongitude = toLonLat(perihelionDirection(COMET)).lon;
    const shortcut = COMET.node - COMET.argPeri;
    expect(wrap180(trueLongitude)).toBeCloseTo(-53.87, 2);
    expect(shortcut).toBeCloseTo(-52.91, 2);
    expect(Math.abs(wrap180(trueLongitude - shortcut))).toBeGreaterThan(0.9);
  });

  it('orients the comet on screen with exactly this construction', () => {
    const atPerihelion = cometPosition(COMET.perihelionJd);
    const unit = atPerihelion.map((c) => c / length(atPerihelion));
    expect(apart(unit, perihelionDirection(COMET))).toBeLessThan(1e-6);
  });
});

describe('framing the comet', () => {
  const newton = getEra('newton').createModel();
  /** Days in the comet's period, from Kepler's third law with the Gaussian constant. */
  const periodDays = 360 / (0.9856076686 / COMET.a ** 1.5);

  it('finds the aphelion where the comet really is half a period after perihelion', () => {
    // Independent of the orbit polyline the framing is derived from.
    const atAphelion = toLonLat(cometPosition(COMET.perihelionJd + periodDays / 2));
    expect(atAphelion.dist).toBeCloseTo(COMET.a * (1 + COMET.e), 3);
    expect(Math.abs(wrap180(atAphelion.lon - newton.cometAphelionLongitude))).toBeLessThan(1);
  });

  it('looks at the long axis broadside, not end-on', () => {
    // The stage places the camera at model longitude (azimuth - 90). End-on, the
    // 35 au ellipse is foreshortened until it looks smaller than Saturn's orbit.
    const cameraLongitude = newton.defaultView.azimuth - 90;
    const offAxis = Math.abs(wrap180(cameraLongitude - newton.cometAphelionLongitude));
    expect(offAxis).toBeCloseTo(90, 6);
  });

  it('would have been nearly end-on from the usual direction, which is why it needed a view of its own', () => {
    // The default azimuth of 0 puts the camera at longitude 270, looking toward 90.
    const usualLineOfSight = 90;
    const fromAxis = Math.abs(wrap180(usualLineOfSight - newton.cometAphelionLongitude));
    expect(fromAxis).toBeLessThan(45);
  });

  it('declares that the ellipse must be visible out to its aphelion', () => {
    expect(newton.fitHalfWidth).toBeCloseTo(COMET.a * (1 + COMET.e), 2);
    expect(newton.fitHalfWidth).toBeGreaterThan(newton.frameRadius);
    // The scale is set so that Saturn's orbit does not shrink to nothing.
    expect(elementsAt('saturn', JD_J2000).a / newton.frameRadius).toBeGreaterThan(0.35);
  });

  it('fits the aphelion in wide, square and upright viewports alike', () => {
    // Uses the very function the stage frames with, not a copy of its constants.
    // An earlier version checked 16:9 only, the one shape the old fixed distance suited.
    const aphelionSceneUnits = newton.fitHalfWidth * (100 / newton.frameRadius);
    const t = Math.tan((22.5 * Math.PI) / 180);
    for (const aspect of [21 / 9, 16 / 9, 4 / 3, 1, 3 / 4, 9 / 16]) {
      const visibleHalfWidth = cosmosDistance(aphelionSceneUnits, aspect) * t * aspect;
      expect(visibleHalfWidth, `aspect ${aspect.toFixed(2)}`).toBeGreaterThanOrEqual(aphelionSceneUnits * 1.079);
    }
  });

  it('was clipped on a square viewport at the old fixed distance, which is what this guards', () => {
    const aphelionSceneUnits = newton.fitHalfWidth * (100 / newton.frameRadius);
    const visibleAtFixedDistance = 250 * Math.tan((22.5 * Math.PI) / 180) * 1;
    expect(visibleAtFixedDistance).toBeLessThan(aphelionSceneUnits);
  });

  it('leaves every era without a comet framed as before', () => {
    for (const id of ['copernicus', 'kepler', 'galileo']) {
      const model = getEra(id).createModel();
      expect(model.frameRadius).toBe(11);
      expect(model.defaultView).toBeUndefined();
      expect(model.fitHalfWidth).toBeUndefined();
      expect(model.cometAphelionLongitude).toBeUndefined();
    }
  });
});

describe('what the telescope added', () => {
  const galileo = createHeliocentricModel({ id: 'galileo', orbits: 'circles', center: 'sun', starRadius: 5000, features: { jupiterMoons: true } });
  const newton = createHeliocentricModel({ id: 'newton', orbits: 'ellipses', center: 'sun', starRadius: 5000, features: { jupiterMoons: true, titan: true, comet: true } });
  const moonIds = SATELLITES.jupiter.map((s) => s.id);

  it('has no moons of Jupiter before the telescope', () => {
    for (const model of [copernicus, tycho, kepler]) {
      const bodies = model.state(JD_J2000, { guides: false }).bodies;
      for (const id of [...moonIds, 'titan', 'comet']) expect(bodies[id]).toBeUndefined();
    }
  });

  it('has four moons circling Jupiter, and not the Earth, afterwards', () => {
    const bodies = galileo.state(JD_J2000, { guides: false }).bodies;
    for (const sat of SATELLITES.jupiter) {
      expect(bodies[sat.id].parent).toBe('jupiter');
      expect(length(sub(bodies[sat.id].pos, bodies.jupiter.pos)) * KM_PER_AU).toBeCloseTo(sat.distanceKm, 0);
    }
    expect(bodies.titan).toBeUndefined();
  });

  it('returns each moon to the same place after one of its periods', () => {
    for (const sat of SATELLITES.jupiter) {
      const rel = (jd) => {
        const b = galileo.state(jd, { guides: false }).bodies;
        return sub(b[sat.id].pos, b.jupiter.pos);
      };
      expect(length(sub(rel(JD_J2000), rel(JD_J2000 + sat.periodDays)))).toBeLessThan(1e-9);
    }
  });

  it('adds Titan and a comet by Newton\'s time', () => {
    const bodies = newton.state(JD_J2000, { guides: false }).bodies;
    expect(bodies.titan.parent).toBe('saturn');
    expect(bodies.comet).toBeDefined();
  });

  it('draws the swept-area sector only for the selected planet, and only with ellipses', () => {
    const roles = (model, selected) => model.state(JD_J2000, { selected }).guides.filter((g) => g.role === 'swept-area').map((g) => g.body);
    expect(roles(kepler, 'mars')).toEqual(['mars']);
    expect(roles(kepler, null)).toEqual([]);
    expect(roles(copernicus, 'mars')).toEqual([]);
  });

  it('gives stable, unique guide identifiers', () => {
    for (const model of [copernicus, tycho, kepler, galileo, newton]) {
      const a = model.state(JD_J2000).guides.map((g) => g.id);
      const b = model.state(JD_J2000 + 500).guides.map((g) => g.id);
      expect(new Set(a).size).toBe(a.length);
      expect(b).toEqual(a);
    }
  });
});
