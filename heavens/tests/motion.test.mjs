import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {
  planeToWorld, tiltQuaternion, circleOffset, solveKepler, ellipseOffset, hippopedePoint, helioPosition, DEG, TAU,
} from '../src/engine/motion.js';
import { dateToJD, jdToDate, J2000, celestialPole } from '../src/engine/time.js';
import { ELEMENTS } from '../src/data/elements.js';

const close = (a, b, tol, msg) => assert.ok(Math.abs(a - b) <= tol, `${msg}: ${a} vs ${b}`);

test('tiltQuaternion matches planeToWorld for arbitrary inclinations and nodes', () => {
  for (const [incl, node] of [[7, 48], [23.4, 0], [162.3, 58.4], [1.85, 300], [45, 135]]) {
    const q = tiltQuaternion(incl, node);
    for (const lon of [0, 37, 90, 180, 251]) {
      const flat = planeToWorld(Math.cos(lon * DEG) * 3, Math.sin(lon * DEG) * 3, 0, 0);
      const viaQuat = flat.clone().applyQuaternion(q);
      const direct = planeToWorld(Math.cos(lon * DEG) * 3, Math.sin(lon * DEG) * 3, incl, node);
      close(viaQuat.distanceTo(direct), 0, 1e-9, `incl ${incl} node ${node} lon ${lon}`);
    }
  }
});

test('a positive inclination lifts the point 90 degrees past the ascending node northward', () => {
  const p = planeToWorld(Math.cos(100 * DEG), Math.sin(100 * DEG), 10, 10);
  close(p.y, Math.sin(10 * DEG), 1e-9, 'northward lift');
});

test('equant motion: apogee at R+e, and a bisected eccentricity places the body at 2e beyond the centre at quadrature', () => {
  const R = 10;
  const e = 1;
  const apogee = 30;
  const m = { type: 'circle', radius: R, period: 360, phase: apogee, eccentric: { distance: e, direction: apogee }, equant: { distance: 2 * e, direction: apogee } };
  const pA = circleOffset(m, 0);
  close(pA.length(), R + e, 1e-9, 'apogee distance');
  const pQ = circleOffset(m, 90); // mean longitude from equant 90 deg past apogee
  const expected = planeToWorld(2 * e * Math.cos(apogee * DEG) + Math.sqrt(R * R - e * e) * Math.cos((apogee + 90) * DEG),
    2 * e * Math.sin(apogee * DEG) + Math.sqrt(R * R - e * e) * Math.sin((apogee + 90) * DEG));
  close(pQ.distanceTo(expected), 0, 1e-9, 'quadrature position');
});

test('Kepler solver satisfies the transcendental equation for high and low eccentricity', () => {
  for (const e of [0.0167, 0.2056, 0.967]) {
    for (let M = 0; M < TAU; M += 0.37) {
      const E = solveKepler(M, e);
      close(E - e * Math.sin(E), M, 1e-9, `e=${e} M=${M}`);
    }
  }
});

test('ellipse has perihelion distance a(1-e) in the direction of the longitude of perihelion', () => {
  const m = { a: 5, e: 0.3, period: 1000, peri: 70, M0: 0 };
  const p = ellipseOffset(m, 0);
  close(p.length(), 5 * 0.7, 1e-9, 'perihelion distance');
  const dir = planeToWorld(Math.cos(70 * DEG), Math.sin(70 * DEG));
  close(p.clone().normalize().distanceTo(dir), 0, 1e-9, 'perihelion direction');
});

test('hippopede is a figure-of-eight along the ecliptic with half-width sin(alpha) and second-harmonic latitude', () => {
  const alpha = 13 * DEG;
  let maxY = 0;
  let maxZ = 0;
  for (let th = 0; th < TAU; th += 0.01) {
    const [x, y, z] = hippopedePoint(alpha, th);
    close(Math.hypot(x, y, z), 1, 1e-9, 'on the unit sphere');
    maxY = Math.max(maxY, Math.abs(y));
    maxZ = Math.max(maxZ, Math.abs(z));
  }
  close(maxY, Math.sin(alpha), 1e-3, 'longitude excursion');
  close(maxZ, (1 - Math.cos(alpha)) / 2, 1e-3, 'latitude excursion');
  const [, y0] = hippopedePoint(alpha, 0.1);
  assert.ok(y0 < 0, 'motion starts retrograde (toward decreasing longitude) at the centre');
});

test("Copernicus' eccentric + epicyclet reproduces Ptolemy's equant to second order", () => {
  const R = 60;
  const e = 6; // Mars, in Ptolemy's units
  const apogee = 120;
  const equant = { type: 'circle', radius: R, period: 360, phase: 0, eccentric: { distance: e, direction: apogee }, equant: { distance: 2 * e, direction: apogee } };
  const def = { type: 'circle', radius: R, period: 360, phase: 0, eccentric: { distance: 1.5 * e, direction: apogee } };
  const worstFor = (phase) => {
    const epi = { type: 'circle', radius: 0.5 * e, period: 180, phase };
    let worst = 0;
    for (let t = 0; t < 360; t += 3) {
      const a = circleOffset(equant, t);
      const b = circleOffset(def, t).add(circleOffset(epi, t));
      worst = Math.max(worst, a.distanceTo(b));
    }
    return worst;
  };
  // The residual is of order e^2 / 2R = 0.3 for these values.
  const good = worstFor(-apogee + 180);
  assert.ok(good < (e * e) / (2 * R) * 1.15, `max deviation ${good} exceeds the second-order bound`);
  for (const wrong of [-apogee, apogee, apogee + 180]) {
    assert.ok(worstFor(wrong) > 5 * good, `phase convention ${wrong} should be far worse than ${good}`);
  }
});

test('calendar conversions round-trip and hit known Julian Days', () => {
  close(dateToJD(2000, 1, 1.5), J2000, 1e-9, 'J2000');
  close(dateToJD(1582, 10, 15), 2299160.5, 1e-9, 'Gregorian reform day');
  close(dateToJD(1582, 10, 4), 2299159.5, 1e-9, 'day before reform (Julian)');
  for (const [y, m, d] of [[1610, 1, 7], [1687, 7, 5], [150, 3, 1], [-559, 6, 21], [1300, 4, 8]]) {
    const back = jdToDate(dateToJD(y, m, d));
    assert.deepEqual([back.year, back.month, back.day], [y, m, d], `${y}-${m}-${d}`);
  }
});

test('celestial pole sits at ecliptic longitude 90 at J2000 and drifts to ~120 around 150 BCE', () => {
  const p0 = celestialPole(0);
  close(Math.atan2(-p0.z, p0.x) / DEG, 90, 1e-6, 'J2000 pole longitude');
  close(Math.asin(p0.y) / DEG, 90 - 23.439291, 1e-6, 'J2000 pole latitude');
  const t = dateToJD(-149, 1, 1) - J2000;
  const p = celestialPole(t);
  close(Math.atan2(-p.z, p.x) / DEG, 90 + 30.0, 0.6, 'pole longitude 150 BCE');
});

test('reference ephemeris: Earth at 1 AU, Mars opposition geometry plausible for 2003 August 28', () => {
  const t = dateToJD(2003, 8, 28) - J2000;
  const e = helioPosition('earth', t);
  const m = helioPosition('mars', t);
  close(e.length(), 1.0, 0.02, 'Earth distance');
  // At the 2003 opposition Mars was 0.373 AU from Earth.
  close(m.distanceTo(e), 0.373, 0.02, 'Earth-Mars distance at the 2003 opposition');
  assert.ok(ELEMENTS.mars.period > 686 && ELEMENTS.mars.period < 688, 'Mars sidereal period');
});
