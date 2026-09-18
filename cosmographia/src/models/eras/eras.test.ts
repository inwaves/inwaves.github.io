import { describe, expect, it } from 'vitest';
import { Vector3 } from 'three';
import { geocentric, TRUTH_BODIES } from '../../astro/ephemeris';
import { localDateToJdTT } from '../../astro/time';
import { Mechanism, timeContext } from '../mechanism';
import { resolveOptions, type EraDefinition } from '../era';
import { ERAS, getEra } from '../registry';
import { modelGeocentric } from '../observe';

const epochJd = (era: EraDefinition) => localDateToJdTT(era.epoch, era.location.lon, era.location.reformJd);

/** Every combination of an era's option values. */
function optionCombinations(era: EraDefinition): Record<string, string>[] {
  let combos: Record<string, string>[] = [{}];
  for (const opt of era.options) {
    combos = combos.flatMap((c) => opt.choices.map((choice) => ({ ...c, [opt.id]: choice.value })));
  }
  return combos;
}

/** How far each worldview may stray from the real sky at its own epoch, in degrees. */
const TOLERANCE: Record<string, Partial<Record<string, number>>> = {
  anaximander: { sun: 2.5, moon: 9 },
  philolaus: { sun: 3.5, moon: 11 },
  eudoxus: { sun: 2.5, moon: 9 },
  aristotle: { sun: 1.5, moon: 5 },
  aristarchus: { sun: 2.5, moon: 9, mercury: 40, venus: 15, mars: 15, jupiter: 8, saturn: 9 },
  hipparchus: { sun: 2, moon: 6, mercury: 15, venus: 8, mars: 16, jupiter: 8, saturn: 9 },
  medieval: { sun: 1.5, moon: 4, mercury: 6, venus: 4, mars: 4, jupiter: 2.5, saturn: 2.5 },
  ptolemy: { sun: 2, moon: 4, mercury: 6, venus: 5, mars: 5, jupiter: 3, saturn: 3 },
  copernicus: { sun: 1.5, moon: 1.5, mercury: 4, venus: 3, mars: 3, jupiter: 2, saturn: 2 },
  tycho: { sun: 1.5, moon: 1.5, mercury: 4, venus: 3, mars: 3, jupiter: 2, saturn: 2 },
  galileo: { sun: 1.5, moon: 1.5, mercury: 4, venus: 3, mars: 3, jupiter: 2, saturn: 2 },
  kepler: { sun: 0.2, moon: 0.5, mercury: 0.3, venus: 0.3, mars: 0.3, jupiter: 0.3, saturn: 0.3 },
  newton: { sun: 0.2, moon: 0.5, mercury: 0.3, venus: 0.3, mars: 0.3, jupiter: 0.3, saturn: 0.3 },
};

describe('every era', () => {
  for (const era of ERAS) {
    it(`${era.id}: builds and evaluates with every option combination`, () => {
      for (const combo of optionCombinations(era)) {
        const model = era.build(resolveOptions(era, combo));
        const m = new Mechanism(model);
        m.evaluate(timeContext(epochJd(era)));
        for (const n of m.nodes) {
          expect(Number.isFinite(n.worldPos.x + n.worldPos.y + n.worldPos.z), `${era.id} node ${n.def.id}`).toBe(true);
          expect(Number.isFinite(n.displayPos.x + n.displayPos.y + n.displayPos.z), `${era.id} node ${n.def.id} display`).toBe(true);
        }
        expect(model.bodies.some((b) => b.id === model.earthBody)).toBe(true);
        for (const ev of era.events) expect(Number.isFinite(localDateToJdTT(ev.date, (ev.location ?? era.location).lon, (ev.location ?? era.location).reformJd))).toBe(true);
      }
    });

    const tol = TOLERANCE[era.id];
    if (tol) {
      it(`${era.id}: predicts the sky of its own epoch within historical accuracy`, () => {
        const jd = epochJd(era);
        const m = new Mechanism(era.build(resolveOptions(era, {})));
        m.evaluate(timeContext(jd));
        for (const body of TRUTH_BODIES) {
          const limit = tol[body];
          const def = m.model.bodies.find((b) => b.truth === body);
          if (limit === undefined || !def) continue;
          const rel = new Vector3().copy(m.node(def.node).worldPos).sub(m.node(m.model.observerNode).worldPos);
          const err = (rel.angleTo(geocentric(body, jd, new Vector3())) * 180) / Math.PI;
          expect(err, `${era.id}: ${body} is ${err.toFixed(2)}° from the real sky`).toBeLessThan(limit);
        }
      });
    }
  }
});

describe('equivalences and discoveries', () => {
  const lonAt = (m: Mechanism, body: string, jd: number) => {
    m.evaluate(timeContext(jd));
    return modelGeocentric(m, body).lon;
  };

  it('makes Jupiter and Saturn retrograde at opposition on Eudoxus’s spheres', () => {
    const era = getEra('eudoxus');
    const m = new Mechanism(era.build(resolveOptions(era, {})));
    const jd = epochJd(era); // Jupiter at opposition, 369 BCE
    const before = lonAt(m, 'jupiter', jd - 10);
    const after = lonAt(m, 'jupiter', jd + 10);
    expect(((after - before + 540) % 360) - 180).toBeLessThan(0);
    // Saturn retrogrades around its own opposition too.
    const saturnOpp = 1586416; // 18 May 370 BCE
    const sBefore = lonAt(m, 'saturn', saturnOpp - 8);
    const sAfter = lonAt(m, 'saturn', saturnOpp + 8);
    expect(((sAfter - sBefore + 540) % 360) - 180).toBeLessThan(0);
  });

  it('never lets the Pythagorean planets retrograde', () => {
    const era = getEra('philolaus');
    const m = new Mechanism(era.build(resolveOptions(era, {})));
    const jd = epochJd(era);
    let previous = lonAt(m, 'mars', jd);
    for (let d = 5; d < 800; d += 5) {
      // Sample at the same local sidereal time each day-group to remove the daily parallax wobble.
      const lon = lonAt(m, 'mars', jd + d);
      expect(((lon - previous + 540) % 360) - 180, `day ${d}`).toBeGreaterThan(-0.5);
      previous = lon;
    }
  });

  it('keeps the Medieval Latin and Ibn al-Shatir models within a degree of each other', () => {
    const era = getEra('medieval');
    const latin = new Mechanism(era.build(resolveOptions(era, { school: 'latin' })));
    const shatir = new Mechanism(era.build(resolveOptions(era, { school: 'maragha' })));
    for (const jd of [2195982.5, 2210000.5]) {
      for (const body of ['mars', 'jupiter', 'saturn']) {
        const a = lonAt(latin, body, jd);
        const b = lonAt(shatir, body, jd);
        expect(Math.abs(((a - b + 540) % 360) - 180), body).toBeLessThan(1.2);
      }
    }
  });

  it('counts Aristotle’s 55 spheres', () => {
    const moving = { saturn: 4, jupiter: 4, mars: 5, venus: 5, mercury: 5, sun: 5, moon: 5 };
    const counter = { saturn: 3, jupiter: 3, mars: 4, venus: 4, mercury: 4, sun: 4, moon: 0 };
    const sum = (o: Record<string, number>) => Object.values(o).reduce((a, b) => a + b, 0);
    expect(sum(moving) + sum(counter)).toBe(55);
    const model = getEra('aristotle').build({});
    const counterSpheres = model.nodes.flatMap((n) => n.constructs ?? []).filter((c) => c.kind === 'sphere' && c.style === 'counter').length;
    expect(counterSpheres).toBe(22);
  });

  it('Tycho and Copernicus give identical geocentric directions', () => {
    const cop = new Mechanism(getEra('copernicus').build(resolveOptions(getEra('copernicus'), {})));
    const tyc = new Mechanism(getEra('tycho').build(resolveOptions(getEra('tycho'), {})));
    for (const jd of [2284781.5, 2297356.9, 2309107.25, 2320000.5]) {
      cop.evaluate(timeContext(jd));
      tyc.evaluate(timeContext(jd));
      for (const body of ['sun', 'mercury', 'venus', 'mars', 'jupiter', 'saturn', 'moon']) {
        const a = modelGeocentric(cop, body);
        const b = modelGeocentric(tyc, body);
        expect(Math.abs(a.lon - b.lon), body).toBeLessThan(1e-6);
        expect(Math.abs(a.lat - b.lat), body).toBeLessThan(1e-6);
      }
    }
  });

  it('has no Galilean moons before Galileo and all four afterwards', () => {
    const moonsOf = (id: EraDefinition['id']) => getEra(id).build(resolveOptions(getEra(id), {})).bodies.filter((b) => b.kind === 'satellite').map((b) => b.id);
    expect(moonsOf('ptolemy')).toEqual([]);
    expect(moonsOf('copernicus')).toEqual([]);
    expect(moonsOf('tycho')).toEqual([]);
    expect(moonsOf('galileo')).toEqual(['io', 'europa', 'ganymede', 'callisto']);
    expect(moonsOf('kepler')).toEqual(['io', 'europa', 'ganymede', 'callisto']);
    expect(new Set(moonsOf('newton'))).toEqual(new Set(['io', 'europa', 'ganymede', 'callisto', 'titan', 'iapetus', 'rhea', 'tethys', 'dione']));
  });

  it('draws Saturn triple for Galileo and Kepler, ringed for Newton', () => {
    const saturn = (id: EraDefinition['id']) => getEra(id).build(resolveOptions(getEra(id), {})).bodies.find((b) => b.id === 'saturn')!.appearance.rings;
    expect(saturn('copernicus')).toBeUndefined();
    expect(saturn('galileo')).toBe('ears');
    expect(saturn('kepler')).toBe('ears');
    expect(saturn('newton')).toBe('rings');
  });

  it('keeps Galileo’s moons of Jupiter in the right configuration on 7 January 1610', () => {
    const era = getEra('galileo');
    const m = new Mechanism(era.build(resolveOptions(era, {})));
    const jd = 2309107.25;
    m.evaluate(timeContext(jd));
    const jupiterGeo = geocentric('jupiter', jd, new Vector3());
    // Sky-plane east offset of each moon from Jupiter: positive toward increasing longitude.
    const east = new Vector3(0, 0, 1).cross(jupiterGeo).normalize();
    const offsets = ['io', 'europa', 'ganymede', 'callisto'].map((id) => {
      const rel = new Vector3().copy(m.node(`${id}.body`).worldPos).sub(m.node('jupiter.planet').worldPos);
      return rel.dot(east);
    });
    // Galileo saw two small stars to the east of Jupiter and one to the west.
    const eastCount = offsets.filter((x) => x > 0.0005).length;
    const westCount = offsets.filter((x) => x < -0.0005).length;
    expect(eastCount).toBeGreaterThanOrEqual(2);
    expect(westCount).toBeGreaterThanOrEqual(1);
  });

  it('sweeps equal areas in equal times for Kepler’s Mars', () => {
    const era = getEra('kepler');
    const m = new Mechanism(era.build(resolveOptions(era, {})));
    const period = 686.98;
    const areas: number[] = [];
    const p0 = new Vector3();
    const p1 = new Vector3();
    const steps = 200;
    for (let k = 0; k < 6; k++) {
      let area = 0;
      const start = 2333000 + (k * period) / 6;
      for (let i = 0; i < steps; i++) {
        m.sample('mars.planet', timeContext(start + (i * period) / 6 / steps), 'true', p0);
        m.sample('mars.planet', timeContext(start + ((i + 1) * period) / 6 / steps), 'true', p1);
        area += 0.5 * p0.clone().cross(p1).length();
      }
      areas.push(area);
    }
    const mean = areas.reduce((a, b) => a + b) / areas.length;
    for (const a of areas) expect(Math.abs(a / mean - 1)).toBeLessThan(0.01);
  });
});
