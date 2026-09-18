import { Group, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { wrap180 } from '../src/core/angles.js';
import { calendarToJd } from '../src/core/time.js';
import { sub, toLonLat } from '../src/core/vec.js';
import { getEra } from '../src/data/eras.js';
import { toThree } from '../src/render/frame.js';
import { firstIndexWithinSpan, signedAngleAbout, spanOf } from '../src/render/trailExtent.js';
import { CAPACITY, DIMMED_TRAIL, SKY_TRAIL_MAX_SPAN, TrailLayer } from '../src/render/trails.js';

const NONE = new Set();
/** The pole of the ecliptic in scene coordinates: three.js up. */
const UP = [0, 1, 0];
const STEP = 1.5;

function layer() {
  return new TrailLayer(new Group(), new Group());
}

/** A direction in the scene's ecliptic plane at the given longitude. */
function atLongitude(deg) {
  const v = toThree([Math.cos((deg * Math.PI) / 180), Math.sin((deg * Math.PI) / 180), 0]);
  return new Vector3(v.x, v.y, v.z);
}

describe('signedAngleAbout', () => {
  it('is positive toward increasing longitude', () => {
    const a = atLongitude(10);
    const b = atLongitude(25);
    expect(signedAngleAbout([a.x, a.y, a.z], [b.x, b.y, b.z], UP)).toBeCloseTo(15, 9);
    expect(signedAngleAbout([b.x, b.y, b.z], [a.x, a.y, a.z], UP)).toBeCloseTo(-15, 9);
  });

  it('ignores latitude: only the turn about the axis counts', () => {
    const a = toThree([1, 0, 0.2]).normalize();
    const b = toThree([0, 1, -0.3]).normalize();
    expect(signedAngleAbout([a.x, a.y, a.z], [b.x, b.y, b.z], UP)).toBeCloseTo(90, 9);
  });

  it('is zero where the angle is undefined, along the axis', () => {
    expect(signedAngleAbout(UP, [1, 0, 0], UP)).toBe(0);
  });
});

describe('firstIndexWithinSpan', () => {
  it('keeps everything that fits', () => {
    expect(firstIndexWithinSpan([0, 50, 100, 150], 340)).toBe(0);
    expect(firstIndexWithinSpan([], 340)).toBe(0);
  });

  it('keeps the longest run ending at the newest sample', () => {
    const angles = [0, 100, 200, 300, 400, 500];
    const start = firstIndexWithinSpan(angles, 340);
    expect(start).toBe(2);
    expect(spanOf(angles.slice(start))).toBeLessThanOrEqual(340);
    expect(spanOf(angles.slice(start - 1))).toBeGreaterThan(340);
  });

  it('measures extent, not net advance: a loop that doubles back is kept whole', () => {
    // Forward 120, back 40, forward again: a retrograde loop well inside the limit.
    const loop = [0, 60, 120, 100, 80, 110, 170];
    expect(firstIndexWithinSpan(loop, 340)).toBe(0);
    expect(spanOf(loop)).toBe(170);
  });

  it('counts a backward excursion toward the extent', () => {
    expect(firstIndexWithinSpan([0, 200, -150, 10], 340)).toBe(2);
  });
});

/** Feeds a body's real apparent directions from an era's model into a trail layer. */
function feedFromModel(trails, model, id, startJd, samples) {
  const scaleless = 1;
  for (let k = samples; k >= 1; k -= 1) {
    const jd = startJd - k * STEP;
    const { bodies } = model.state(jd, { guides: false });
    const direction = toThree(sub(bodies[id].pos, model.observer(jd)), scaleless).normalize();
    trails.sample(id, new Vector3(), direction, UP);
  }
}

/** Unwrapped apparent longitude of a body over a window, straight from the model. */
function unwrappedLongitudes(model, id, startJd, samples) {
  const out = [];
  let previous = null;
  for (let k = samples; k >= 1; k -= 1) {
    const jd = startJd - k * STEP;
    const { bodies } = model.state(jd, { guides: false });
    const lon = toLonLat(sub(bodies[id].pos, model.observer(jd))).lon;
    out.push(previous === null ? 0 : out[out.length - 1] + wrap180(lon - previous));
    previous = lon;
  }
  return out;
}

describe('a sky trail cannot lap the sky, at any orbital phase', () => {
  const cases = [
    { era: 'ptolemy', start: calendarToJd(137, 7, 20) },
    { era: 'kepler', start: calendarToJd(1609, 6, 1) },
    { era: 'tycho', start: calendarToJd(1588, 3, 1) },
  ];
  /** Twelve starting points spread across each planet's cycle of phases. */
  const synodicDays = { mercury: 115.88, venus: 583.92, mars: 779.94, jupiter: 398.88, saturn: 378.09 };

  for (const { era, start } of cases) {
    it(`${era}: every planet's retained trail spans no more than the limit`, () => {
      const model = getEra(era).createModel();
      for (const [id, synodic] of Object.entries(synodicDays)) {
        for (let phase = 0; phase < 12; phase += 1) {
          const trails = layer();
          feedFromModel(trails, model, id, start + (phase * synodic) / 12, 1000);
          const { sky } = trails.trails.get(id);
          expect(spanOf(sky.angles), `${id} at phase ${phase}`).toBeLessThanOrEqual(SKY_TRAIL_MAX_SPAN + 1e-9);
          expect(sky.angles).toHaveLength(sky.length);
          expect(sky.length).toBeGreaterThan(20);
        }
      }
    });
  }

  it('shows that a cutoff of 92 percent of the mean period does lap, which is why it was replaced', () => {
    // The rule this replaced kept 0.92 of a year of Venus. At some phases Venus
    // swings from one side of the Sun to the other in that time and covers more
    // than a full turn. This keeps the regression honest: it fails for that rule.
    const model = getEra('ptolemy').createModel();
    const samples = Math.floor((0.92 * 365.25) / STEP);
    let worst = 0;
    for (let phase = 0; phase < 24; phase += 1) {
      const start = calendarToJd(137, 7, 20) + (phase * 583.92) / 24;
      worst = Math.max(worst, spanOf(unwrappedLongitudes(model, 'venus', start, samples)));
    }
    expect(worst).toBeGreaterThan(360);
  });

  it('agrees with the longitude the model itself reports', () => {
    // The trail accumulates its angle from directions in scene coordinates. It
    // must match the unwrapped ecliptic longitude computed independently.
    const model = getEra('kepler').createModel();
    const start = calendarToJd(1609, 6, 1);
    const trails = layer();
    feedFromModel(trails, model, 'mars', start, 300);
    const { sky } = trails.trails.get('mars');
    const expected = unwrappedLongitudes(model, 'mars', start, 300);
    expect(sky.length).toBe(300);
    for (const i of [0, 57, 150, 299]) expect(sky.angles[i] - sky.angles[0]).toBeCloseTo(expected[i] - expected[0], 6);
  });

  it('keeps retrograde loops: the retained trail of Mars runs backwards in places', () => {
    const model = getEra('ptolemy').createModel();
    let sawBackward = false;
    for (let phase = 0; phase < 12 && !sawBackward; phase += 1) {
      const trails = layer();
      feedFromModel(trails, model, 'mars', calendarToJd(137, 7, 20) + (phase * 779.94) / 12, 1000);
      const { angles } = trails.trails.get('mars').sky;
      for (let i = 1; i < angles.length; i += 1) if (angles[i] < angles[i - 1]) sawBackward = true;
    }
    expect(sawBackward).toBe(true);
  });

  it('ends at the body: the newest sample is always retained', () => {
    const model = getEra('ptolemy').createModel();
    const start = calendarToJd(137, 7, 20);
    const trails = layer();
    feedFromModel(trails, model, 'venus', start, 1000);
    const { sky } = trails.trails.get('venus');
    const { bodies } = model.state(start - STEP, { guides: false });
    const newest = toThree(sub(bodies.venus.pos, model.observer(start - STEP))).normalize();
    const n = sky.points.length;
    expect(sky.points[n - 3]).toBeCloseTo(newest.x, 9);
    expect(sky.points[n - 2]).toBeCloseTo(newest.y, 9);
    expect(sky.points[n - 1]).toBeCloseTo(newest.z, 9);
  });
});

describe('capacity and clearing', () => {
  it('never exceeds capacity, in space or on the sky', () => {
    const trails = layer();
    // A body creeping along, so that the angular limit never binds.
    for (let i = 0; i < CAPACITY + 250; i += 1) trails.sample('saturn', new Vector3(i, 0, 0), atLongitude(i * 0.01), UP);
    const { sky, space } = trails.trails.get('saturn');
    expect(sky.length).toBe(CAPACITY);
    expect(space.length).toBe(CAPACITY);
    expect(sky.angles).toHaveLength(CAPACITY);
    expect(space.points[space.points.length - 3]).toBe(CAPACITY + 249);
  });

  it('does not shorten the path through space when the sky trail is trimmed', () => {
    const trails = layer();
    // Two and a half turns of the sky.
    for (let i = 0; i < 900; i += 1) trails.sample('mars', new Vector3(i, 0, 0), atLongitude(i), UP);
    const { sky, space } = trails.trails.get('mars');
    expect(space.length).toBe(900);
    expect(sky.length).toBeLessThan(345);
    expect(spanOf(sky.angles)).toBeLessThanOrEqual(SKY_TRAIL_MAX_SPAN);
  });

  it('empties on clear, angles included', () => {
    const trails = layer();
    for (let i = 0; i < 50; i += 1) trails.sample('mars', new Vector3(i, 0, 0), atLongitude(i), UP);
    trails.clear();
    const { sky, space } = trails.trails.get('mars');
    expect(sky.length).toBe(0);
    expect(sky.angles).toHaveLength(0);
    expect(space.length).toBe(0);
  });
});

describe('which trails are drawn, and how strongly', () => {
  function populated() {
    const trails = layer();
    for (const id of ['sun', 'mars', 'jupiter', 'earth']) {
      for (let i = 0; i < 5; i += 1) trails.sample(id, new Vector3(i, 0, 0), atLongitude(i), UP);
    }
    return trails;
  }
  const visible = (trails, kind) => [...trails.trails].filter(([, pair]) => pair[kind].line.visible).map(([id]) => id).sort();
  const opacity = (trails, id, kind) => trails.trails.get(id)[kind].line.material.opacity;

  it('draws sky trails from the Earth and space trails from outside', () => {
    const trails = populated();
    trails.update({ showSpace: false, showSky: true, exclude: NONE });
    expect(visible(trails, 'sky')).toEqual(['earth', 'jupiter', 'mars', 'sun']);
    expect(visible(trails, 'space')).toEqual([]);
    trails.update({ showSpace: true, showSky: false, exclude: NONE });
    expect(visible(trails, 'space')).toEqual(['earth', 'jupiter', 'mars', 'sun']);
    expect(visible(trails, 'sky')).toEqual([]);
  });

  it('never draws an excluded body, in either form', () => {
    const trails = populated();
    trails.update({ showSpace: true, showSky: true, exclude: new Set(['earth']) });
    expect(visible(trails, 'sky')).not.toContain('earth');
    expect(visible(trails, 'space')).not.toContain('earth');
  });

  it('omits the Sun from the sky, where it would only retrace the ecliptic, but keeps its path through space', () => {
    const trails = populated();
    trails.update({ showSpace: true, showSky: true, exclude: NONE, skyExclude: new Set(['sun']) });
    expect(visible(trails, 'sky')).toEqual(['earth', 'jupiter', 'mars']);
    expect(visible(trails, 'space')).toContain('sun');
  });

  it('can show one body\'s sky trail alone, for the line of sight', () => {
    const trails = populated();
    trails.update({ showSpace: true, showSky: true, skyOnlyFor: 'mars', exclude: NONE });
    expect(visible(trails, 'sky')).toEqual(['mars']);
    expect(visible(trails, 'space')).toHaveLength(4);
  });

  it('dims every trail but the emphasised body\'s', () => {
    const trails = populated();
    trails.update({ showSpace: true, showSky: true, emphasised: 'mars', exclude: NONE });
    for (const kind of ['sky', 'space']) {
      expect(opacity(trails, 'mars', kind)).toBe(1);
      expect(opacity(trails, 'jupiter', kind)).toBe(DIMMED_TRAIL);
      expect(opacity(trails, 'sun', kind)).toBe(DIMMED_TRAIL);
    }
    expect(DIMMED_TRAIL).toBeLessThan(0.3);
  });

  it('restores full strength to all when nothing is emphasised', () => {
    const trails = populated();
    trails.update({ showSpace: true, showSky: true, emphasised: 'mars', exclude: NONE });
    trails.update({ showSpace: true, showSky: true, emphasised: null, exclude: NONE });
    for (const id of ['sun', 'mars', 'jupiter']) expect(opacity(trails, id, 'sky')).toBe(1);
  });

  it('uploads only as many points as each trail holds', () => {
    const trails = layer();
    for (let i = 0; i < 900; i += 1) trails.sample('mars', new Vector3(i, 0, 0), atLongitude(i), UP);
    trails.update({ showSpace: true, showSky: true, exclude: NONE });
    const { sky, space } = trails.trails.get('mars');
    expect(sky.line.geometry.drawRange.count).toBe(sky.length);
    expect(space.line.geometry.drawRange.count).toBe(900);
  });

  it('fades from dark at the oldest sample to the body\'s colour at the newest', () => {
    const trails = layer();
    for (let i = 0; i < 50; i += 1) trails.sample('mars', new Vector3(i, 0, 0), atLongitude(i), UP);
    trails.update({ showSpace: false, showSky: true, exclude: NONE });
    const { sky } = trails.trails.get('mars');
    const color = sky.line.geometry.attributes.color;
    const brightness = (i) => color.getX(i) + color.getY(i) + color.getZ(i);
    expect(brightness(0)).toBe(0);
    expect(brightness(25)).toBeGreaterThan(brightness(5));
    expect(brightness(49)).toBeGreaterThan(brightness(25));
    expect(color.getX(49)).toBeCloseTo(sky.color.r, 6);
  });

  it('discards everything when reconfigured for a new era', () => {
    const trails = populated();
    trails.configure();
    expect(trails.trails.size).toBe(0);
    expect(trails.sky.children).toHaveLength(0);
    expect(trails.space.children).toHaveLength(0);
  });
});
