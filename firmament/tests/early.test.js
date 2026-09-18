import { describe, expect, it } from 'vitest';
import { wrap180 } from '../src/core/angles.js';
import { calendarToJd } from '../src/core/time.js';
import { cross, dot, length, rotateAbout, rotateY, sub, toLonLat } from '../src/core/vec.js';
import { DRUM, WHEELS, anaximanderGeometry, createAnaximanderModel } from '../src/models/anaximander.js';
import {
  DRAWN_COUNTERACTING,
  HOMOCENTRIC_ORDER,
  SPHERE_COUNTS,
  carryingOrientation,
  counteractedOrientation,
  createHomocentricModel,
  fourthAxis,
  hippopedePoint,
  planetGeometry,
  sunGeometry,
  totalSpheres,
} from '../src/models/homocentric.js';

const EUDOXUS_DATE = calendarToJd(-369, 1, 1);

describe('the hippopede', () => {
  it('closed form equals the explicit composition of the two sphere rotations', () => {
    for (const inclination of [6, 13, 23, 34, 46]) {
      const axis4 = fourthAxis(inclination, 0);
      for (let theta = 0; theta < 360; theta += 7) {
        // Turn the body back about the fourth sphere's own axis, then let the
        // third sphere carry the whole of the fourth round the y axis.
        const explicit = rotateY(rotateAbout([1, 0, 0], axis4, -theta), theta);
        const closed = hippopedePoint(inclination, theta);
        for (let k = 0; k < 3; k += 1) expect(closed[k]).toBeCloseTo(explicit[k], 12);
      }
    }
  });

  it('stays on the sphere, and on the equator of the fourth sphere', () => {
    for (let theta = 0; theta < 360; theta += 11) {
      const p = hippopedePoint(34, theta);
      expect(length(p)).toBeCloseTo(1, 12);
      expect(dot(p, fourthAxis(34, theta))).toBeCloseTo(0, 12);
    }
  });

  it('is a figure of eight whose half-length equals the inclination between the axes', () => {
    for (const inclination of [6, 13, 23]) {
      let reach = 0;
      let width = 0;
      for (let theta = 0; theta < 360; theta += 0.5) {
        const { lon, lat } = toLonLat(hippopedePoint(inclination, theta));
        reach = Math.max(reach, Math.abs(wrap180(lon)));
        width = Math.max(width, Math.abs(lat));
      }
      expect(reach).toBeCloseTo(inclination, 1);
      // Narrow compared with its length: the latitude excursion is second order.
      expect(width).toBeLessThan(reach / 4);
    }
  });

  it('crosses its own centre twice per circuit, once forwards and once backwards', () => {
    const at = (theta) => toLonLat(hippopedePoint(13, theta));
    expect(wrap180(at(0).lon)).toBeCloseTo(0, 9);
    expect(wrap180(at(180).lon)).toBeCloseTo(0, 9);
    expect(wrap180(at(1).lon)).toBeLessThan(0);
    expect(wrap180(at(181).lon)).toBeGreaterThan(0);
  });
});

const longitudeOf = (name, jd) => toLonLat(planetGeometry(name, jd).pos).lon;

function countRetrogrades(name, start, span) {
  let count = 0;
  let was = false;
  let prev = longitudeOf(name, start);
  for (let t = 1; t <= span; t += 1) {
    const cur = longitudeOf(name, start + t);
    const retro = wrap180(cur - prev) < 0;
    if (retro && !was) count += 1;
    was = retro;
    prev = cur;
  }
  return count;
}

describe('what the homocentric spheres achieve, and where they fail', () => {
  it('makes Saturn, Jupiter and Mercury retrograde once per synodic period', () => {
    for (const [name, synodic] of Object.entries({ saturn: 378.09, jupiter: 398.88, mercury: 115.88 })) {
      const periods = 10;
      expect(Math.abs(countRetrogrades(name, EUDOXUS_DATE, synodic * periods) - periods)).toBeLessThanOrEqual(1);
    }
  });

  it('times an outer planet\'s retrogradation to opposition', () => {
    let checked = 0;
    for (let t = 0; t < 1200; t += 1) {
      const jd = EUDOXUS_DATE + t;
      const elongation = wrap180(longitudeOf('jupiter', jd) - toLonLat(sunGeometry(jd).pos).lon);
      if (Math.abs(Math.abs(elongation) - 180) < 3) {
        expect(wrap180(longitudeOf('jupiter', jd + 1) - longitudeOf('jupiter', jd))).toBeLessThan(0);
        checked += 1;
      }
    }
    expect(checked).toBeGreaterThan(5);
  });

  it('cannot make Venus retrograde at all', () => {
    expect(countRetrogrades('venus', EUDOXUS_DATE, 584 * 6)).toBe(0);
  });

  it('makes Mars retrograde about three times too often', () => {
    const periods = 6;
    const count = countRetrogrades('mars', EUDOXUS_DATE, 779.94 * periods);
    expect(count).toBeGreaterThanOrEqual(3 * periods - 2);
    expect(count).toBeLessThanOrEqual(3 * periods + 2);
  });

  it('can never change a body\'s distance, so cannot explain changing brightness', () => {
    const model = createHomocentricModel({ id: 'eudoxus' });
    const first = model.state(EUDOXUS_DATE, { guides: false }).bodies;
    for (let t = 0; t < 900; t += 37) {
      const bodies = model.state(EUDOXUS_DATE + t, { guides: false }).bodies;
      for (const name of HOMOCENTRIC_ORDER) {
        expect(length(bodies[name].pos)).toBeCloseTo(length(first[name].pos), 9);
      }
    }
  });

  it('keeps Venus and Mercury in the company of the Sun', () => {
    let venus = 0;
    let mercury = 0;
    for (let t = 0; t < 2400; t += 2) {
      const jd = EUDOXUS_DATE + t;
      const sun = toLonLat(sunGeometry(jd).pos).lon;
      venus = Math.max(venus, Math.abs(wrap180(longitudeOf('venus', jd) - sun)));
      mercury = Math.max(mercury, Math.abs(wrap180(longitudeOf('mercury', jd) - sun)));
    }
    expect(venus).toBeCloseTo(46, 0);
    expect(mercury).toBeCloseTo(23, 0);
  });
});

describe('counting the spheres', () => {
  it('gives Eudoxus 26 and the fixed stars, 27 in all', () => {
    expect(totalSpheres(SPHERE_COUNTS.eudoxus)).toBe(26);
  });

  it('gives Callippus 33 and Aristotle 55', () => {
    expect(totalSpheres(SPHERE_COUNTS.callippus)).toBe(33);
    expect(totalSpheres(SPHERE_COUNTS.callippus) + totalSpheres(SPHERE_COUNTS.counteracting)).toBe(55);
  });

  it('gives each body one counteracting sphere fewer than it has carrying spheres, and the Moon none', () => {
    for (const name of HOMOCENTRIC_ORDER) {
      const expected = name === 'moon' ? 0 : SPHERE_COUNTS.callippus[name] - 1;
      expect(SPHERE_COUNTS.counteracting[name]).toBe(expected);
    }
  });

  it('draws four spheres for a planet and three for the Sun and Moon', () => {
    const guides = createHomocentricModel({ id: 'eudoxus' }).state(EUDOXUS_DATE).guides;
    const spheres = (body) => guides.filter((g) => g.body === body && g.role.startsWith('sphere-')).length;
    expect(spheres('mars')).toBe(4);
    expect(spheres('sun')).toBe(3);
    expect(spheres('moon')).toBe(3);
  });

  it('adds solid shells and the four elements only in Aristotle\'s cosmos', () => {
    const roles = (aristotle) => new Set(createHomocentricModel({ id: 'm', aristotle }).state(EUDOXUS_DATE).guides.map((g) => g.role));
    expect(roles(false).has('crystalline')).toBe(false);
    expect(roles(true).has('crystalline')).toBe(true);
    for (const element of ['water', 'air', 'fire']) expect(roles(true).has(`element-${element}`)).toBe(true);
  });

  it('leaves no void between Aristotle\'s shells', () => {
    const shells = createHomocentricModel({ id: 'm', aristotle: true })
      .state(EUDOXUS_DATE)
      .guides.filter((g) => g.type === 'shell')
      .sort((a, b) => a.inner - b.inner);
    for (let i = 1; i < shells.length; i += 1) expect(shells[i].inner).toBeCloseTo(shells[i - 1].outer, 9);
  });
});

describe('Aristotle\'s counteracting spheres', () => {
  const aristotle = createHomocentricModel({ id: 'aristotle', aristotle: true });
  const eudoxus = createHomocentricModel({ id: 'eudoxus' });
  const probes = [[1, 0, 0], [0, 1, 0], [0, 0, 1], [0.3, -0.5, 0.81]];

  it('carry the planet along the hippopede, as the carrying spheres alone do', () => {
    for (const [inclination, theta, lon] of [[13, 40, 210], [34, 155, 12], [6, 300, 95]]) {
      const carried = carryingOrientation(inclination, theta, lon)([1, 0, 0]);
      const expected = rotateAbout(hippopedePoint(inclination, theta), [0, 0, 1], lon);
      for (let k = 0; k < 3; k += 1) expect(carried[k]).toBeCloseTo(expected[k], 12);
    }
  });

  it('cancel every private motion, handing down only the daily rotation', () => {
    for (const [inclination, theta, lon] of [[13, 40, 210], [34, 155, 12], [46, 77, 301]]) {
      const net = counteractedOrientation(inclination, theta, lon);
      for (const v of probes) {
        const out = net(v);
        for (let k = 0; k < 3; k += 1) expect(out[k]).toBeCloseTo(v[k], 12);
      }
    }
  });

  it('must undo the spheres in reverse order: the wrong order does not cancel', () => {
    // Rotations do not commute, so this is what makes the ordering a real
    // property of the construction rather than a tautology.
    const wrong = counteractedOrientation(34, 155, 12, 'forward');
    const drift = Math.max(...probes.map((v) => length(sub(wrong(v), v))));
    expect(drift).toBeGreaterThan(0.1);
  });

  it('are drawn on the same axes as the carrying spheres they undo', () => {
    const guides = aristotle.state(EUDOXUS_DATE).guides;
    const normal = (g) => cross(g.u, g.v);
    const find = (id) => guides.find((g) => g.id === id);
    for (const name of ['saturn', 'jupiter', 'mars', 'venus', 'mercury']) {
      for (const [carrying, counter] of [['s4', 'c4'], ['s3', 'c3'], ['s2', 'c2']]) {
        const a = normal(find(`${name}-${carrying}`));
        const b = normal(find(`${name}-${counter}`));
        expect(Math.abs(dot(a, b))).toBeCloseTo(1, 9);
      }
    }
  });

  it('sit below the carrying nest, inside the body\'s own shell', () => {
    const guides = aristotle.state(EUDOXUS_DATE).guides;
    for (const name of HOMOCENTRIC_ORDER) {
      const body = guides.filter((g) => g.body === name);
      const band = body.find((g) => g.type === 'shell');
      const carrying = body.filter((g) => g.role.startsWith('sphere-') && g.role !== 'sphere-counteracting');
      const counter = body.filter((g) => g.role === 'sphere-counteracting');
      const lowestCarrying = Math.min(...carrying.map((g) => g.radius));
      for (const g of counter) {
        expect(g.radius).toBeLessThan(lowestCarrying);
        expect(g.radius).toBeGreaterThan(band.inner);
      }
      for (const g of carrying) expect(g.radius).toBeLessThan(band.outer);
    }
  });

  it('number one fewer than the carrying spheres drawn, with none for the Moon', () => {
    const guides = aristotle.state(EUDOXUS_DATE).guides;
    for (const name of HOMOCENTRIC_ORDER) {
      const drawn = guides.filter((g) => g.body === name && g.role === 'sphere-counteracting').length;
      expect(drawn).toBe(DRAWN_COUNTERACTING[name]);
      expect(drawn).toBe(name === 'moon' ? 0 : SPHERE_COUNTS.eudoxus[name] - 1);
    }
    expect(totalSpheres(DRAWN_COUNTERACTING)).toBe(17);
  });

  it('do not exist in Eudoxus\'s purely geometrical model', () => {
    expect(eudoxus.state(EUDOXUS_DATE).guides.some((g) => g.role === 'sphere-counteracting')).toBe(false);
  });

  it('leave every appearance exactly as Eudoxus has it', () => {
    for (let t = 0; t < 800; t += 53) {
      const a = aristotle.state(EUDOXUS_DATE + t, { guides: false }).bodies;
      const e = eudoxus.state(EUDOXUS_DATE + t, { guides: false }).bodies;
      for (const name of HOMOCENTRIC_ORDER) {
        for (let k = 0; k < 3; k += 1) expect(a[name].pos[k]).toBeCloseTo(e[name].pos[k], 12);
      }
    }
  });

  it('reports a tally that separates what is drawn from what is only counted', () => {
    const t = aristotle.sphereTally;
    expect(t.total).toBe(55);
    expect(t.carrying).toBe(33);
    expect(t.counteracting).toBe(22);
    expect(t.drawnCounteracting).toBe(17);
    // Callippus's seven spheres, and the five counteracting spheres paired with
    // them, have no preserved function and are therefore not drawn.
    expect(t.notModelled).toEqual({ callippusCarrying: 7, counteracting: 5 });
    expect(t.drawnCounteracting + t.notModelled.counteracting).toBe(t.counteracting);
    expect(eudoxus.sphereTally.total).toBe(27);
    expect(eudoxus.sphereTally.notModelled).toEqual({ callippusCarrying: 0, counteracting: 0 });
  });
});

describe('Anaximander', () => {
  const model = createAnaximanderModel({ id: 'anaximander' });
  const solstice = (month) => calendarToJd(-545, month, 28);

  it('makes the Earth a drum three times as wide as it is deep', () => {
    expect(DRUM.diameter / DRUM.height).toBeCloseTo(3, 12);
  });

  it('places the stars nearest, then the Moon, then the Sun, at 9, 18 and 27 Earth diameters', () => {
    expect(WHEELS.stars).toBeLessThan(WHEELS.moon);
    expect(WHEELS.moon).toBeLessThan(WHEELS.sun);
    expect([WHEELS.stars - 0.5, WHEELS.moon - 0.5, WHEELS.sun - 0.5]).toEqual([9, 18, 27]);
    expect(model.starRadius).toBeLessThan(WHEELS.moon);
  });

  it('keeps each vent on its wheel', () => {
    for (let t = 0; t < 40; t += 0.37) {
      const g = anaximanderGeometry(solstice(6) + t);
      expect(length(sub(g.sun, g.sunCentre))).toBeCloseTo(WHEELS.sun, 9);
      expect(length(sub(g.moon, g.moonCentre))).toBeCloseTo(WHEELS.moon, 9);
    }
  });

  it('carries the Sun above and below the drum\'s face once a day', () => {
    let up = 0;
    let down = 0;
    for (let h = 0; h < 24; h += 1) {
      if (anaximanderGeometry(solstice(3) + h / 24).sun[2] > 0) up += 1;
      else down += 1;
    }
    expect(up).toBeGreaterThan(8);
    expect(down).toBeGreaterThan(8);
  });

  it('lifts the noon Sun high in summer and lets it sink in winter', () => {
    const noonAltitude = (jd) => anaximanderGeometry(jd, true).sunAltitude;
    const summer = noonAltitude(solstice(6));
    const winter = noonAltitude(solstice(12));
    // At latitude 37.5 the noon Sun ranges about 23.9 degrees either side of 52.5.
    expect(summer).toBeGreaterThan(74);
    expect(winter).toBeLessThan(31);
    expect(summer - winter).toBeCloseTo(2 * 23.86, 0);
  });

  it('opens the Moon\'s vent fully at full moon and closes it at new moon', () => {
    let min = 1;
    let max = 0;
    for (let t = 0; t < 30; t += 0.25) {
      const a = anaximanderGeometry(solstice(6) + t).moonAperture;
      min = Math.min(min, a);
      max = Math.max(max, a);
    }
    expect(min).toBeLessThan(0.01);
    expect(max).toBeGreaterThan(0.99);
  });

  it('has no planets, and turns the star catalogue with a proper rotation', () => {
    const state = model.state(solstice(6));
    expect(Object.keys(state.bodies).sort()).toEqual(['earth', 'moon', 'sun']);
    const { x, y, z } = state.starBasis;
    for (const v of [x, y, z]) expect(length(v)).toBeCloseTo(1, 12);
    expect(dot(x, y)).toBeCloseTo(0, 12);
    // Right-handed: a rotation, not a reflection, so constellations are not mirrored.
    const handed = cross(x, y);
    for (let k = 0; k < 3; k += 1) expect(handed[k]).toBeCloseTo(z[k], 12);
  });

  it('stands the observer on the upper face of the drum', () => {
    const eye = model.observer();
    expect(eye[2]).toBeGreaterThan(DRUM.height / 2);
    expect(eye[2]).toBeLessThan(DRUM.height / 2 + 0.01);
  });
});
