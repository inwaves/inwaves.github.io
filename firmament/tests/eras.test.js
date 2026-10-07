import { describe, expect, it } from 'vitest';
import { jdToCalendar } from '../src/core/time.js';
import { length } from '../src/core/vec.js';
import { BODIES, ERAS, ERA_IDS, getEra } from '../src/data/eras.js';

const TELESCOPE_BODIES = ['io', 'europa', 'ganymede', 'callisto'];
const indexOf = (id) => ERA_IDS.indexOf(id);

describe('the progression', () => {
  it('runs in chronological order from Anaximander to Newton', () => {
    expect(ERA_IDS[0]).toBe('anaximander');
    expect(ERA_IDS.at(-1)).toBe('newton');
    for (let i = 1; i < ERAS.length; i += 1) {
      expect(ERAS[i].defaultJd).toBeGreaterThan(ERAS[i - 1].defaultJd);
    }
  });

  it('places each era\'s default date in the right year', () => {
    const years = Object.fromEntries(ERAS.map((era) => [era.id, jdToCalendar(era.defaultJd).year]));
    expect(years.ptolemy).toBe(137);
    expect(years.copernicus).toBe(1543);
    expect(years.tycho).toBe(1588);
    expect(years.kepler).toBe(1609);
    expect(years.galileo).toBe(1610);
    expect(years.newton).toBe(1687);
    expect(years.anaximander).toBeLessThan(-500);
  });

  it('opens the Galileo era on the night he first saw the moons of Jupiter', () => {
    const c = jdToCalendar(getEra('galileo').defaultJd);
    expect([c.year, c.month, c.day]).toEqual([1610, 1, 7]);
  });

  it('gives every era a complete commentary, including what it got wrong and how faithful the picture is', () => {
    for (const era of ERAS) {
      for (const field of ['title', 'subtitle', 'dateLabel', 'place', 'lede', 'fidelity']) {
        expect(era[field], `${era.id}.${field}`).toBeTruthy();
      }
      for (const field of ['paragraphs', 'achieved', 'troubles', 'lookFor']) {
        expect(era[field].length, `${era.id}.${field}`).toBeGreaterThan(0);
      }
      expect(era.defaultSpeed).toBeGreaterThan(0);
    }
  });

  it('rejects an unknown era', () => {
    expect(() => getEra('einstein')).toThrow();
  });
});

describe('discovery gating', () => {
  it('has no telescope, no moons of Jupiter and a plain Saturn in every era before Galileo', () => {
    for (const era of ERAS.slice(0, indexOf('galileo'))) {
      expect(era.features.telescope, era.id).toBe(false);
      expect(era.features.jupiterMoons, era.id).toBe(false);
      expect(era.features.lunarRelief, era.id).toBe(false);
      expect(era.features.saturn, era.id).toBe('plain');
      expect(era.features.titan, era.id).toBe(false);
    }
  });

  it('has them in every era from Galileo onward', () => {
    for (const era of ERAS.slice(indexOf('galileo'))) {
      expect(era.features.telescope, era.id).toBe(true);
      expect(era.features.jupiterMoons, era.id).toBe(true);
      expect(era.features.lunarRelief, era.id).toBe(true);
    }
  });

  it('never takes a discovery back once it has been made', () => {
    const flags = ['telescope', 'jupiterMoons', 'lunarRelief', 'titan', 'comet'];
    for (const flag of flags) {
      let seen = false;
      for (const era of ERAS) {
        if (seen) expect(era.features[flag], `${flag} lost in ${era.id}`).toBe(true);
        if (era.features[flag]) seen = true;
      }
    }
  });

  it('shows Saturn as Galileo\'s puzzle in 1610 and as a ring only after Huygens', () => {
    expect(getEra('kepler').features.saturn).toBe('plain');
    expect(getEra('galileo').features.saturn).toBe('ears');
    expect(getEra('newton').features.saturn).toBe('ring');
    expect(getEra('galileo').features.titan).toBe(false);
    expect(getEra('newton').features.titan).toBe(true);
  });

  it('reveals fainter stars only with the telescope', () => {
    expect(getEra('galileo').features.magnitudeLimit).toBeGreaterThan(getEra('kepler').features.magnitudeLimit);
  });

  it('keeps the bodies a model actually produces in step with the era\'s declared features', () => {
    // The gating is declared twice, once for the renderer and once for the
    // model. This is the guard against the two drifting apart.
    for (const era of ERAS) {
      const bodies = era.createModel().state(era.defaultJd, { guides: false }).bodies;
      for (const moon of TELESCOPE_BODIES) {
        expect(Boolean(bodies[moon]), `${moon} in ${era.id}`).toBe(era.features.jupiterMoons);
      }
      expect(Boolean(bodies.titan), `titan in ${era.id}`).toBe(era.features.titan);
      expect(Boolean(bodies.comet), `comet in ${era.id}`).toBe(era.features.comet);
    }
  });
});

describe('every era\'s model', () => {
  it('produces finite positions, with a name and colour for every body', () => {
    for (const era of ERAS) {
      const model = era.createModel();
      for (const offset of [0, 17.3, 400, 5000]) {
        const { bodies } = model.state(era.defaultJd + offset, { guides: false });
        for (const [id, body] of Object.entries(bodies)) {
          expect(BODIES[id], `${id} in ${era.id}`).toBeDefined();
          for (const c of body.pos) expect(Number.isFinite(c), `${id} in ${era.id}`).toBe(true);
        }
      }
    }
  });

  it('keeps the central body at rest: the Earth until Copernicus, the Sun after, the Earth again for Tycho', () => {
    const resting = { anaximander: 'earth', eudoxus: 'earth', aristotle: 'earth', hipparchus: 'earth', ptolemy: 'earth', copernicus: 'sun', tycho: 'earth', kepler: 'sun', galileo: 'sun', newton: 'sun' };
    for (const era of ERAS) {
      const model = era.createModel();
      expect(model.center, era.id).toBe(resting[era.id]);
      for (const offset of [0, 91, 365]) {
        const { bodies } = model.state(era.defaultJd + offset, { guides: false });
        expect(length(bodies[resting[era.id]].pos), era.id).toBeCloseTo(0, 12);
      }
    }
  });

  it('declares the interface the renderer depends on', () => {
    for (const era of ERAS) {
      const model = era.createModel();
      expect(model.id).toBe(era.id);
      expect(model.starRadius).toBeGreaterThan(0);
      expect(model.frameRadius).toBeGreaterThan(0);
      expect(['ecliptic', 'horizon']).toContain(model.skyFrame);
      expect(['optional', 'earth', 'intrinsic']).toContain(model.diurnal);
      expect(model.observer(era.defaultJd)).toHaveLength(3);
      const ids = model.state(era.defaultJd).guides.map((g) => g.id);
      expect(new Set(ids).size, `duplicate guide id in ${era.id}`).toBe(ids.length);
    }
  });

  it('puts the stars nearest of all for Anaximander and beyond Saturn for everyone else', () => {
    for (const era of ERAS) {
      const model = era.createModel();
      const { bodies } = model.state(era.defaultJd, { guides: false });
      if (era.id === 'anaximander') {
        expect(model.starRadius).toBeLessThan(length(bodies.moon.pos));
      } else {
        expect(model.starRadius).toBeGreaterThan(length(bodies.saturn.pos));
      }
    }
  });
});
