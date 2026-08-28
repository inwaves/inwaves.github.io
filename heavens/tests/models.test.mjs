import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { MODELS } from '../src/models/index.js';
import { computeOffset, helioPosition, DEG } from '../src/engine/motion.js';
import { dateToJD, J2000 } from '../src/engine/time.js';

/** Evaluate every node's position in a built layout at time t (same hierarchy walk as Cosmos). */
function positions(built, t) {
  const byId = new Map();
  const pending = [...built.bodies];
  let guard = 0;
  while (pending.length) {
    const def = pending.shift();
    if (def.parent && !byId.has(def.parent)) {
      pending.push(def);
      if (++guard > 10000) throw new Error(`unresolvable parent for ${def.id}`);
      continue;
    }
    const parent = def.parent ? byId.get(def.parent) : new THREE.Vector3();
    byId.set(def.id, computeOffset(def.kind === 'belt' ? null : def.motion, t).add(parent));
  }
  return byId;
}

const angleBetween = (a, b) => Math.atan2(a.clone().cross(b).length(), a.dot(b)) / DEG;

function referenceDirection(id, t) {
  return helioPosition(id, t).sub(helioPosition('earth', t));
}

/** Worst angular error of the built model's geocentric direction to `id` over `years`, sampled every 10 days. */
function worstError(built, id, epochT, years) {
  let worst = 0;
  for (let t = epochT; t < epochT + years * 365.25; t += 10) {
    const pos = positions(built, t);
    const earth = pos.get('earth');
    const body = pos.get(id);
    if (!earth || !body) return null;
    const dir = body.clone().sub(earth);
    worst = Math.max(worst, angleBetween(dir, referenceDirection(id, t)));
  }
  return worst;
}

const epochT = (m) => (m.epoch === 'now' ? 9700 : dateToJD(m.epoch.year, m.epoch.month, m.epoch.day) - J2000);
const byId = (id) => MODELS.find((m) => m.id === id);
const legible = (id) => byId(id).build('legible');
const period = (id) => byId(id).build('period');

test('every model builds in both layouts: unique ids, resolvable parents, an Earth, camera, sky and commentary', () => {
  for (const m of MODELS) {
    for (const key of ['tagline', 'picture', 'changes', 'lookFor', 'kuhn', 'scale']) assert.ok(m.text[key], `${m.id}: missing text.${key}`);
    assert.ok(m.epoch, `${m.id}: missing epoch`);
    for (const mode of ['legible', 'period']) {
      const b = m.build(mode);
      const ids = new Set();
      for (const n of b.bodies) {
        assert.ok(!ids.has(n.id), `${m.id}/${mode}: duplicate node ${n.id}`);
        ids.add(n.id);
      }
      for (const n of b.bodies) if (n.parent) assert.ok(ids.has(n.parent), `${m.id}/${mode}: ${n.id} has missing parent ${n.parent}`);
      assert.ok(ids.has('earth'), `${m.id}/${mode}: no Earth`);
      assert.ok(b.camera && b.sky && b.sky.radius > 0, `${m.id}/${mode}: missing camera/sky`);
      for (const n of b.bodies) if (n.kind === 'body') assert.ok(n.size > 0, `${m.id}/${mode}: ${n.id} has no size`);
      positions(b, epochT(m)); // must evaluate without throwing
    }
  }
});

const layoutDisagreement = (m, ids, years = 8) => {
  const a = m.build('legible');
  const b = m.build('period');
  const t0 = epochT(m);
  let worst = 0;
  for (let t = t0; t < t0 + years * 365.25; t += 37) {
    const pa = positions(a, t);
    const pb = positions(b, t);
    for (const id of ids) {
      if (!pa.has(id)) continue;
      const da = pa.get(id).clone().sub(pa.get('earth'));
      const db = pb.get(id).clone().sub(pb.get('earth'));
      worst = Math.max(worst, angleBetween(da, db));
    }
  }
  return worst;
};
const SKY_BODIES = ['mars', 'jupiter', 'saturn', 'venus', 'mercury', 'sun', 'moon'];

test('period-true proportions change scale but not the sky each model predicts (all models but Copernicus)', () => {
  // Every device is a pure ratio, so directions from the Earth are identical in both layouts.
  for (const m of MODELS) {
    if (m.id === 'copernicus') continue;
    const worst = layoutDisagreement(m, SKY_BODIES);
    assert.ok(worst < 1e-6, `${m.id}: layouts disagree by ${worst} deg`);
  }
});

test("Copernicus' period layout uses his own distances, which shift the planets by a bounded small amount", () => {
  const worst = layoutDisagreement(byId('copernicus'), ['mars', 'jupiter', 'saturn', 'venus', 'mercury']);
  assert.ok(worst > 0.05, `expected his distances to differ measurably from the modern ones (${worst} deg)`);
  assert.ok(worst < 2.5, `difference should stay within a couple of degrees (${worst} deg)`);
  // The Sun's direction depends only on the Earth's orbit and must not change.
  assert.ok(layoutDisagreement(byId('copernicus'), ['sun']) < 1e-6, 'solar direction invariant');
});

test('period-true layouts use the historical figures', () => {
  const pt = period('ptolemy');
  const r = (id) => pt.bodies.find((b) => b.id === id).motion.radius;
  assert.equal(r('moon-def'), 48.5);
  assert.equal(r('sun'), 1210);
  assert.equal(r('saturn-def'), 17026);
  assert.equal(pt.sky.radius, 20000);
  assert.equal(pt.bodies.find((b) => b.id === 'sun').size, 5.5);
  assert.equal(pt.bodies.find((b) => b.id === 'earth').size, 1);
  const cop = period('copernicus');
  const earthR = cop.bodies.find((b) => b.id === 'earth').motion.radius;
  assert.ok(Math.abs(earthR - 1142) < 1e-9, `Copernicus AU ${earthR}`);
  assert.ok(Math.abs(cop.bodies.find((b) => b.id === 'moon-def').motion.radius - 60.3) < 1e-9, 'Moon at 60.3 ER');
  const ty = period('tycho');
  assert.equal(ty.sky.radius, 14000);
  const anax = byId('anaximander').build('period');
  assert.equal(anax.bodies.find((b) => b.id === 'sun').motion.radius, 27);
});

test('worldviews are in chronological order', () => {
  for (let k = 1; k < MODELS.length; k++) assert.ok(MODELS[k].year >= MODELS[k - 1].year, `${MODELS[k].id} out of order`);
});

test('the Galilean moons appear only from Galileo onward', () => {
  const MOONS = ['io', 'europa', 'ganymede', 'callisto'];
  const galileoIndex = MODELS.findIndex((m) => m.id === 'galileo');
  MODELS.forEach((m, k) => {
    const b = m.build('legible');
    for (const id of MOONS) {
      const node = b.bodies.find((n) => n.id === id);
      if (k < galileoIndex) assert.equal(node, undefined, `${m.id}: ${id} should not exist yet`);
      else {
        assert.ok(node, `${m.id}: ${id} missing`);
        assert.equal(node.parent, 'jupiter', `${m.id}: ${id} must orbit Jupiter`);
      }
    }
  });
});

test("Kepler's and Newton's ellipses reproduce the reference directions exactly", () => {
  for (const id of ['kepler', 'newton', 'leverrier', 'today']) {
    const m = byId(id);
    const b = legible(id);
    for (const p of ['mars', 'venus', 'saturn']) {
      const err = worstError(b, p, epochT(m), 12);
      assert.ok(err < 1e-6, `${id}/${p}: ${err} deg`);
    }
  }
});

test('Uranus appears from 1846 onward, Neptune too, Pluto and the belts only today', () => {
  const has = (mid, id) => legible(mid).bodies.some((n) => n.id === id);
  for (const m of MODELS) {
    const modern = m.year >= 1846;
    assert.equal(has(m.id, 'uranus'), modern, `${m.id}: Uranus`);
    assert.equal(has(m.id, 'neptune'), modern, `${m.id}: Neptune`);
    assert.equal(has(m.id, 'pluto'), m.id === 'today', `${m.id}: Pluto`);
    assert.equal(has(m.id, 'kuiper'), m.id === 'today', `${m.id}: Kuiper belt`);
  }
  const kb = legible('today').bodies.find((n) => n.id === 'kuiper');
  assert.ok(kb.elements.length > 100 && kb.elements.every((e) => e.a >= 37 * 4.2 && e.a <= 48 * 4.2), 'Kuiper belt spans 37-48 AU');
  for (const id of ['ceres', 'pallas', 'juno', 'vesta', 'astraea']) assert.ok(has('leverrier', id), `1846 stage should include ${id}`);
  assert.ok(!has('newton', 'ceres'), 'no asteroids in 1687');
});

test('Ptolemy and Ibn al-Shatir predict the planets within their devices\' historical residuals', () => {
  // Bisected eccentricity approximates the ellipse to second order, but the uniform
  // epicycle ignores the Sun's inequality, which a perihelic opposition of Mars amplifies
  // about threefold (the error Kepler found in the tables and removed by bisecting the
  // Earth's eccentricity). Mercury's crank was always the weakest part of the Almagest.
  const limits = { ptolemy: { mars: 6, jupiter: 0.8, saturn: 0.5, venus: 2.5, mercury: 11 } };
  limits.medieval = limits.ptolemy;
  limits.maragha = { ...limits.ptolemy, mercury: 4 };
  for (const [id, lim] of Object.entries(limits)) {
    const m = byId(id);
    const b = legible(id);
    for (const [p, limit] of Object.entries(lim)) {
      const err = worstError(b, p, epochT(m), 12);
      assert.ok(err !== null && err < limit, `${id}/${p}: worst error ${err?.toFixed(3)} deg exceeds ${limit}`);
    }
  }
});

test('Copernicus and Tycho (with epicyclets and a 2e solar eccentric) are right to within about 1.5 degrees', () => {
  const limits = { mars: 2, jupiter: 0.5, saturn: 0.4, venus: 2, mercury: 2 };
  for (const id of ['copernicus', 'tycho']) {
    const m = byId(id);
    const b = legible(id);
    for (const [p, limit] of Object.entries(limits)) {
      const err = worstError(b, p, epochT(m), 12);
      assert.ok(err !== null && err < limit, `${id}/${p}: worst error ${err?.toFixed(3)} deg exceeds ${limit}`);
    }
  }
});

test('the concentric Hipparchan epicycle model errs by tens of degrees for Mars, far worse than Ptolemy', () => {
  const t0 = epochT(byId('hipparchus'));
  const hip = worstError(legible('hipparchus'), 'mars', t0, 12);
  const ptol = worstError(legible('ptolemy'), 'mars', t0, 12);
  assert.ok(hip > 15 && hip < 40, `Hipparchus Mars error ${hip}`);
  assert.ok(ptol < hip / 4, `Ptolemy (${ptol}) should be far better than concentric epicycles (${hip}) for Mars`);
});

test('the two-sphere wanderers sit on the stellar sphere in the true geocentric direction', () => {
  const m = byId('two-sphere');
  const b = legible('two-sphere');
  const t = epochT(m);
  const pos = positions(b, t);
  for (const p of ['mars', 'jupiter', 'saturn']) {
    const v = pos.get(p).clone().sub(pos.get('earth'));
    assert.ok(Math.abs(v.length() - b.sky.radius * 0.985) < 1e-9, `${p} radius`);
    assert.ok(angleBetween(v, referenceDirection(p, t)) < 1e-9, `${p} direction`);
  }
});

test('Eudoxan Jupiter and Saturn retrograde; Mars cannot (as the ancients found)', () => {
  const m = byId('eudoxus');
  const b = legible('eudoxus');
  const t0 = epochT(m);
  const lonRate = (id, t) => {
    const a = positions(b, t).get(id);
    const c = positions(b, t + 1).get(id);
    const la = Math.atan2(-a.z, a.x);
    const lb = Math.atan2(-c.z, c.x);
    let d = lb - la;
    if (d > Math.PI) d -= 2 * Math.PI;
    if (d < -Math.PI) d += 2 * Math.PI;
    return d;
  };
  const everRetrograde = (id, days) => {
    for (let t = t0; t < t0 + days; t += 5) if (lonRate(id, t) < 0) return true;
    return false;
  };
  assert.ok(everRetrograde('jupiter', 800), 'Jupiter should retrograde');
  assert.ok(everRetrograde('saturn', 800), 'Saturn should retrograde');
  assert.ok(!everRetrograde('mars', 1600), 'Eudoxan Mars should never retrograde with the true periods');
});

test("Ptolemy's Mercury: the epicycle centre reaches 1.15 R at apogee and has two perigees near 0.925 R", () => {
  const m = byId('ptolemy');
  const b = legible('ptolemy');
  const R = b.bodies.find((n) => n.id === 'mercury-def').motion.radius;
  const t0 = epochT(m);
  const dist = [];
  for (let t = t0; t < t0 + 366; t += 1) dist.push(positions(b, t).get('mercury-def').length() / R);
  const max = Math.max(...dist);
  const min = Math.min(...dist);
  assert.ok(Math.abs(max - 1.15) < 0.005, `apogee distance ${max}`);
  assert.ok(Math.abs(min - 0.9254) < 0.005, `perigee distance ${min}`);
  // Two minima per year: count local minima below 0.93 R.
  let minima = 0;
  for (let k = 1; k < dist.length - 1; k++) if (dist[k] < dist[k - 1] && dist[k] <= dist[k + 1] && dist[k] < 0.93) minima++;
  assert.equal(minima, 2, `expected two perigees, found ${minima}`);
});

test('Tycho: the orbit of Mars crosses the orbit of the Sun', () => {
  const b = legible('tycho');
  const sun = b.bodies.find((n) => n.id === 'sun').motion.radius;
  const mars = b.bodies.find((n) => n.id === 'mars-def').motion.radius;
  // Mars is 1.52 AU from the Sun while the Sun is 1 AU from the Earth: Mars comes within
  // 0.52 AU of the Earth, inside the Sun's circle.
  assert.ok(mars > sun && mars - sun < sun, 'Mars circle intersects the Sun circle');
});
