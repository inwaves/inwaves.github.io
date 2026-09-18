import { describe, expect, it } from 'vitest';
import { ERAS } from '../src/data/eras.js';
import {
  ARRIVAL_ALTITUDE,
  COSMOS_FOV,
  COSMOS_STANDOFF,
  DefaultFraming,
  FRAME_UNITS,
  TRACKING_REACH,
  cosmosDistance,
  horizonArrivalAim,
  horizonTrackingAim,
  preferredAltitude,
  skyAim,
} from '../src/render/framing.js';

const t = Math.tan((COSMOS_FOV * Math.PI) / 360);
/** Half-width a camera at `distance` sees at its target's depth. */
const visibleHalfWidth = (distance, aspect) => distance * t * aspect;

const WIDE = 16 / 9;
const SQUARE = 1;
const UPRIGHT = 9 / 16;

describe('cosmosDistance', () => {
  it('frames a wide window exactly as before: the usual standoff already suffices', () => {
    expect(cosmosDistance(FRAME_UNITS, WIDE)).toBe(FRAME_UNITS * COSMOS_STANDOFF);
    expect(cosmosDistance(0, 21 / 9)).toBe(FRAME_UNITS * COSMOS_STANDOFF);
  });

  it('never comes nearer than the usual standoff', () => {
    for (const aspect of [3, WIDE, SQUARE, UPRIGHT, 0.4]) {
      expect(cosmosDistance(FRAME_UNITS, aspect)).toBeGreaterThanOrEqual(FRAME_UNITS * COSMOS_STANDOFF);
    }
  });

  it('backs away on a square window and further on an upright phone', () => {
    const wide = cosmosDistance(FRAME_UNITS, WIDE);
    const square = cosmosDistance(FRAME_UNITS, SQUARE);
    const upright = cosmosDistance(FRAME_UNITS, UPRIGHT);
    expect(square).toBeGreaterThan(wide);
    expect(upright).toBeGreaterThan(square);
  });

  it('ignores a required width smaller than the frame itself', () => {
    expect(cosmosDistance(10, UPRIGHT)).toBe(cosmosDistance(FRAME_UNITS, UPRIGHT));
  });

  it('fits every era\'s cosmos, in every shape of viewport', () => {
    for (const era of ERAS) {
      const model = era.createModel();
      const scale = FRAME_UNITS / model.frameRadius;
      const mustSee = Math.max(FRAME_UNITS, (model.fitHalfWidth ?? model.frameRadius) * scale);
      for (const aspect of [21 / 9, WIDE, 4 / 3, SQUARE, 3 / 4, UPRIGHT]) {
        const seen = visibleHalfWidth(cosmosDistance(mustSee, aspect), aspect);
        expect(seen, `${era.id} at aspect ${aspect.toFixed(2)}`).toBeGreaterThanOrEqual(mustSee);
      }
    }
  });
});

describe('turning a phone upright, or narrowing a window', () => {
  it('clipped every cosmos at the distance chosen for the wide window, which is the defect', () => {
    const chosenWhenWide = cosmosDistance(FRAME_UNITS, WIDE);
    expect(visibleHalfWidth(chosenWhenWide, WIDE)).toBeGreaterThan(FRAME_UNITS);
    // Same distance, new shape: the sides are cut off.
    expect(visibleHalfWidth(chosenWhenWide, UPRIGHT)).toBeLessThan(FRAME_UNITS);
    expect(visibleHalfWidth(chosenWhenWide, SQUARE)).toBeLessThan(FRAME_UNITS * 1.08);
  });

  it('fits again once the framing is recomputed for the new shape', () => {
    const framing = new DefaultFraming();
    framing.established();
    let distance = cosmosDistance(FRAME_UNITS, WIDE);

    // The resize handler: re-frame only if the default framing still stands.
    const onResize = (aspect) => {
      if (framing.shouldReframe('cosmos')) distance = cosmosDistance(FRAME_UNITS, aspect);
    };

    onResize(UPRIGHT);
    expect(visibleHalfWidth(distance, UPRIGHT)).toBeGreaterThanOrEqual(FRAME_UNITS);

    // And turning it back restores the closer, wide framing.
    onResize(WIDE);
    expect(distance).toBe(FRAME_UNITS * COSMOS_STANDOFF);
  });

  it('leaves the camera alone once the user has moved it, however the window changes', () => {
    const framing = new DefaultFraming();
    framing.established();
    // The user zooms in on Jupiter's moons.
    framing.relinquished();
    let distance = 0.4;
    const onResize = (aspect) => {
      if (framing.shouldReframe('cosmos')) distance = cosmosDistance(FRAME_UNITS, aspect);
    };
    onResize(UPRIGHT);
    onResize(WIDE);
    expect(distance).toBe(0.4);
  });
});

describe('telling the user\'s camera moves from clicks and from the application\'s own', () => {
  const standing = () => {
    const framing = new DefaultFraming();
    framing.established();
    return framing;
  };

  it('keeps re-framing after a click that selects a body: pointer down, pointer up, nothing moved', () => {
    // The regression. The controls announce the start of an interaction on every
    // pointer-down, so treating that as the user taking over switched re-framing
    // off at the first selection, the commonest thing anyone does.
    const framing = standing();
    framing.interactionStarted();
    framing.interactionEnded();
    expect(framing.shouldReframe('cosmos')).toBe(true);
  });

  it('keeps re-framing through any number of clicks', () => {
    const framing = standing();
    for (let i = 0; i < 5; i += 1) {
      framing.interactionStarted();
      framing.interactionEnded();
    }
    expect(framing.shouldReframe('cosmos')).toBe(true);
  });

  it('stops re-framing once the user drags: the camera changes while the pointer is down', () => {
    const framing = standing();
    framing.interactionStarted();
    framing.cameraChanged();
    framing.interactionEnded();
    expect(framing.shouldReframe('cosmos')).toBe(false);
  });

  it('stops re-framing on a wheel zoom, which the controls apply only after closing the interaction', () => {
    const framing = standing();
    // What the controls emit for one notch of the wheel.
    framing.interactionStarted();
    framing.interactionEnded();
    // The zoom lands on the next update. By itself that change looks like the
    // application's own, so the wheel is reported separately.
    framing.cameraChanged();
    expect(framing.shouldReframe('cosmos')).toBe(true);
    framing.relinquished();
    expect(framing.shouldReframe('cosmos')).toBe(false);
  });

  it('ignores the application\'s own camera moves: following a body, settling, re-framing', () => {
    const framing = standing();
    for (let i = 0; i < 10; i += 1) framing.cameraChanged();
    expect(framing.shouldReframe('cosmos')).toBe(true);
  });

  it('ignores a change that arrives after the pointer is released, such as damping', () => {
    const framing = standing();
    framing.interactionStarted();
    framing.interactionEnded();
    framing.cameraChanged();
    expect(framing.shouldReframe('cosmos')).toBe(true);
  });

  it('still notices a drag that follows a click', () => {
    const framing = standing();
    framing.interactionStarted();
    framing.interactionEnded();
    framing.interactionStarted();
    framing.cameraChanged();
    expect(framing.shouldReframe('cosmos')).toBe(false);
  });

  it('notices the user still dragging after the whole cosmos is asked for again', () => {
    const framing = standing();
    framing.interactionStarted();
    framing.cameraChanged();
    // Reset by keyboard while the pointer is still down, then keep dragging.
    framing.established();
    expect(framing.shouldReframe('cosmos')).toBe(true);
    framing.cameraChanged();
    expect(framing.shouldReframe('cosmos')).toBe(false);
  });
});

describe('arriving in a worldview seen from the ground', () => {
  const altitudeOf = (v) => (Math.atan2(v[1], Math.hypot(v[0], v[2])) * 180) / Math.PI;
  /** Bearing along the ground, degrees, measured from south (+z) toward east (+x). */
  const bearingOf = (v) => (Math.atan2(v[0], v[2]) * 180) / Math.PI;
  const SKY_FOV = 60;

  it('keeps the ground in the picture when the Sun already stands high', () => {
    // The case that exposed it: 07:49 at Miletus in late June, the Sun 35.4
    // degrees up in the east. Aimed at the Sun, the 60 degree field bottoms out
    // at 5.4 degrees, and there is no ground in the frame at all.
    const toSun = [Math.sin((80 * Math.PI) / 180) * Math.cos((35.4 * Math.PI) / 180), Math.sin((35.4 * Math.PI) / 180), Math.cos((80 * Math.PI) / 180) * Math.cos((35.4 * Math.PI) / 180)];
    expect(altitudeOf(toSun) - SKY_FOV / 2).toBeGreaterThan(0);

    const aim = horizonArrivalAim(toSun);
    const bottomOfFrame = altitudeOf(aim) - SKY_FOV / 2;
    const topOfFrame = altitudeOf(aim) + SKY_FOV / 2;
    expect(bottomOfFrame).toBeLessThan(-5);
    // And the Sun is still in it.
    expect(topOfFrame).toBeGreaterThan(35.4);
  });

  it('looks at the arrival altitude whatever the body\'s own altitude', () => {
    for (const alt of [1, 20, 35.4, 60, 76]) {
      const a = (alt * Math.PI) / 180;
      expect(altitudeOf(horizonArrivalAim([Math.cos(a), Math.sin(a), 0]))).toBeCloseTo(ARRIVAL_ALTITUDE, 9);
    }
  });

  it('faces the body\'s direction along the ground', () => {
    for (const bearing of [-170, -90, -20, 0, 45, 90, 135]) {
      const b = (bearing * Math.PI) / 180;
      const toBody = [Math.sin(b) * 0.8, 0.6, Math.cos(b) * 0.8];
      expect(bearingOf(horizonArrivalAim(toBody))).toBeCloseTo(bearing, 9);
    }
  });

  it('faces south when the body is below the horizon', () => {
    const aim = horizonArrivalAim([0.7, -0.4, -0.59]);
    expect(bearingOf(aim)).toBeCloseTo(0, 9);
    expect(altitudeOf(aim)).toBeCloseTo(ARRIVAL_ALTITUDE, 9);
  });

  it('faces south when the body is straight overhead and has no direction along the ground', () => {
    const aim = horizonArrivalAim([0, 1, 0]);
    expect(bearingOf(aim)).toBeCloseTo(0, 9);
    expect(aim.every(Number.isFinite)).toBe(true);
  });

  it('does not depend on how long the direction is', () => {
    const near = horizonArrivalAim([0.3, 0.5, 0.2]);
    const far = horizonArrivalAim([30, 50, 20]);
    for (let k = 0; k < 3; k += 1) expect(far[k]).toBeCloseTo(near[k], 9);
  });
});

describe('keeping a body in view from the ground without losing the ground', () => {
  const altitudeOf = (v) => (Math.atan2(v[1], Math.hypot(v[0], v[2])) * 180) / Math.PI;
  const bearingOf = (v) => (Math.atan2(v[0], v[2]) * 180) / Math.PI;
  const SKY_FOV = 60;
  /** A direction at the given altitude and bearing (from south toward east), degrees. */
  const toward = (altitude, bearing = 80) => {
    const a = (altitude * Math.PI) / 180;
    const b = (bearing * Math.PI) / 180;
    return [Math.sin(b) * Math.cos(a), Math.sin(a), Math.cos(b) * Math.cos(a)];
  };
  const groundInFrame = (aim, fov = SKY_FOV) => altitudeOf(aim) - fov / 2 < 0;
  const bodyInFrame = (aim, body, fov = SKY_FOV) => Math.abs(altitudeOf(body) - altitudeOf(aim)) < fov / 2;

  it('keeps the ground on the frame after arrival too, with a body selected and tracking on', () => {
    // The regression. Tracking is on by default, so arriving with the Sun
    // selected used to aim well on the first frame and then, on the second,
    // centre the Sun 35.4 degrees up and drop the ground out of the picture.
    const sun = toward(35.4);
    const frames = [true, false, false, false].map((pending) => skyAim({ horizon: true, pending, tracking: true, toBody: sun, fov: SKY_FOV }));
    for (const [i, aim] of frames.entries()) {
      expect(aim, `frame ${i + 1}`).not.toBeNull();
      expect(groundInFrame(aim), `ground in frame ${i + 1}`).toBe(true);
      expect(bodyInFrame(aim, sun), `Sun in frame ${i + 1}`).toBe(true);
    }
    // And the view does not lurch between the first frame and the second.
    expect(altitudeOf(frames[1])).toBeCloseTo(altitudeOf(frames[0]), 9);
    expect(bearingOf(frames[1])).toBeCloseTo(bearingOf(frames[0]), 9);
  });

  it('would have lost the ground by centring the body, which is what it replaced', () => {
    expect(groundInFrame(toward(35.4))).toBe(false);
  });

  it('stays level while the body is low, and tilts up only as far as it must', () => {
    const reach = TRACKING_REACH * (SKY_FOV / 2);
    for (const alt of [2, 10, 25, 35.4, ARRIVAL_ALTITUDE + reach - 0.01]) {
      expect(altitudeOf(horizonTrackingAim(toward(alt), SKY_FOV))).toBeCloseTo(ARRIVAL_ALTITUDE, 9);
    }
    // Miletus at midsummer noon: the ground cannot stay, but the Sun must.
    const high = toward(76);
    const aim = horizonTrackingAim(high, SKY_FOV);
    expect(altitudeOf(aim)).toBeCloseTo(76 - reach, 9);
    expect(bodyInFrame(aim, high)).toBe(true);
  });

  it('keeps the tracked body inside the frame at every altitude and every magnification, with no exceptions', () => {
    // An earlier version of this test wrapped the assertion in a condition that
    // skipped every case where the aim sat at its floor. Those were exactly the
    // cases that failed: a low body, magnified, dropped out under the bottom edge
    // of a view held at 18 degrees. The title said "always"; the condition made
    // it untrue. There is no condition now. The sample stops at 88 degrees because
    // the view is never aimed quite vertically; nothing here climbs above 81.
    for (const fov of [110, 60, 20, 5, 2, 0.4]) {
      for (let alt = 0; alt <= 88; alt += 1) {
        const body = toward(alt);
        expect(bodyInFrame(horizonTrackingAim(body, fov), body, fov), `fov ${fov}, altitude ${alt}`).toBe(true);
      }
    }
  });

  it('does not lose a rising Sun when it is magnified', () => {
    // The regression, in the era's headline activity: told to watch the Sun rise,
    // one magnifies it. At 4 degrees up, in a 20 degree field, the old rule left
    // the aim at 18 degrees: a frame from 8 to 28, and the Sun beneath it.
    const risingSun = toward(4);
    const fov = 20;
    const oldAim = toward(18);
    expect(bodyInFrame(oldAim, risingSun, fov)).toBe(false);

    const aim = horizonTrackingAim(risingSun, fov);
    expect(bodyInFrame(aim, risingSun, fov)).toBe(true);
    // And here the ground can still be kept as well.
    expect(groundInFrame(aim, fov)).toBe(true);
    expect(altitudeOf(aim)).toBeCloseTo(preferredAltitude(fov), 9);
  });

  it('keeps the whole disc of a magnified body inside the frame, not only its centre', () => {
    // The regression, read off a trace of real wheel input. Anaximander's Sun is
    // two degrees across. Magnified until the field was 4.4 degrees, its centre
    // was held seven tenths of the way to the top edge, on row 108 of 720 with a
    // radius of 170 pixels, and the top of the disc was cut off by the frame.
    const altitude = 4.08;
    const radius = 1.04;
    const fov = 4.4;
    const sun = toward(altitude);
    const asAPoint = altitudeOf(horizonTrackingAim(sun, fov));
    expect(altitude + radius - asAPoint).toBeGreaterThan(fov / 2);

    const aim = altitudeOf(horizonTrackingAim(sun, fov, radius));
    expect(Math.abs(altitude - aim) + radius).toBeLessThanOrEqual(fov / 2);
  });

  it('keeps the whole disc in the frame wherever it can fit, and centres one too large to be held off-centre', () => {
    // Every case is held to at least one of the two conditions: a disc smaller
    // than the frame must be wholly inside it, and a disc larger than the reach,
    // which includes every disc larger than the frame, must be centred.
    for (const radius of [0.26, 1.04, 1.55]) {
      for (const fov of [110, 60, 20, 8, 5, 3, 2.2, 0.4]) {
        for (let alt = 0; alt <= 80; alt += 1) {
          const offset = Math.abs(alt - altitudeOf(horizonTrackingAim(toward(alt), fov, radius)));
          const where = `radius ${radius}, fov ${fov}, altitude ${alt}`;
          const fits = radius <= fov / 2;
          const tooLargeToOffset = radius >= TRACKING_REACH * (fov / 2);
          expect(fits || tooLargeToOffset, where).toBe(true);
          if (fits) expect(offset + radius, where).toBeLessThanOrEqual(fov / 2 + 1e-9);
          if (tooLargeToOffset) expect(offset, where).toBeLessThan(1e-9);
        }
      }
    }
  });

  it('does not jump as one magnifies: the aim is continuous in the field of view', () => {
    const sun = toward(4.08);
    let previous = altitudeOf(horizonTrackingAim(sun, 60, 1.04));
    for (let fov = 59.9; fov >= 0.4; fov -= 0.1) {
      const now = altitudeOf(horizonTrackingAim(sun, fov, 1.04));
      // The preferred altitude moves 0.3 of a degree per degree of field and the
      // reach 0.35, so a tenth of a degree of field can move the aim 0.035.
      expect(Math.abs(now - previous), `fov ${fov.toFixed(1)}`).toBeLessThanOrEqual(0.036);
      previous = now;
    }
  });

  it('hands the body\'s size to the tracking rule, and only there', () => {
    const sun = toward(4.08);
    const tracked = skyAim({ horizon: true, pending: false, tracking: true, toBody: sun, fov: 4.4, bodyRadius: 1.04 });
    expect(tracked).toEqual(horizonTrackingAim(sun, 4.4, 1.04));
    expect(tracked).not.toEqual(horizonTrackingAim(sun, 4.4));
    // Arrival looks at a fixed share of the field whatever the body's size, and
    // off the ground a body is centred, so its size cannot matter.
    expect(skyAim({ horizon: true, pending: true, tracking: false, toBody: sun, fov: 4.4, bodyRadius: 1.04 })).toEqual(horizonArrivalAim(sun, 4.4));
    expect(skyAim({ horizon: false, pending: false, tracking: true, toBody: sun, fov: 4.4, bodyRadius: 1.04 })).toEqual(sun);
  });

  it('keeps the ground in the picture whenever the ground and the body can both fit', () => {
    // The aim is at most body - reach once the body forces it up, so the ground
    // stays in frame while body - reach < fov / 2, that is, body < 0.85 x fov.
    for (const fov of [110, 60, 20, 5, 2, 0.4]) {
      const limit = (TRACKING_REACH / 2 + 0.5) * fov;
      for (let alt = 0; alt < Math.min(88, limit - 1e-6); alt += Math.max(0.05, fov / 40)) {
        expect(groundInFrame(horizonTrackingAim(toward(alt), fov), fov), `fov ${fov}, altitude ${alt.toFixed(2)}`).toBe(true);
      }
    }
  });

  it('watches the place where a set body will rise, even magnified', () => {
    for (const fov of [60, 20, 2, 0.4]) {
      const aim = horizonTrackingAim(toward(-12, 115), fov);
      expect(bearingOf(aim)).toBeCloseTo(115, 9);
      // The horizon at that bearing is in the frame, and the view is not staring into the ground.
      expect(Math.abs(altitudeOf(aim)), `fov ${fov}`).toBeLessThan(fov / 2);
      expect(altitudeOf(aim)).toBeGreaterThanOrEqual(0);
    }
  });

  it('prefers an altitude that scales with the field, so the horizon keeps its place in the frame', () => {
    expect(preferredAltitude(60)).toBeCloseTo(ARRIVAL_ALTITUDE, 9);
    expect(preferredAltitude(110)).toBeCloseTo(ARRIVAL_ALTITUDE, 9);
    for (const fov of [60, 20, 5, 2, 0.4]) {
      // Always below half the field, or the ground could never be seen.
      expect(preferredAltitude(fov)).toBeLessThan(fov / 2);
      expect(groundInFrame(horizonArrivalAim(toward(35.4), fov), fov), `arrival at fov ${fov}`).toBe(true);
    }
  });

  it('moves smoothly as the body climbs, at every magnification: no jump in the view', () => {
    for (const fov of [60, 20, 2]) {
      let previous = altitudeOf(horizonTrackingAim(toward(-5), fov));
      for (let alt = -4.75; alt <= 88; alt += 0.25) {
        const now = altitudeOf(horizonTrackingAim(toward(alt), fov));
        expect(now, `fov ${fov}`).toBeGreaterThanOrEqual(previous - 1e-9);
        expect(now - previous, `fov ${fov}, altitude ${alt}`).toBeLessThanOrEqual(0.25 + 1e-9);
        previous = now;
      }
    }
  });

  it('follows the body\'s bearing even below the horizon, so that one is looking the right way at sunrise', () => {
    const beforeDawn = toward(-12, 115);
    const aim = horizonTrackingAim(beforeDawn, SKY_FOV);
    expect(bearingOf(aim)).toBeCloseTo(115, 9);
    expect(altitudeOf(aim)).toBeCloseTo(ARRIVAL_ALTITUDE, 9);
    // Arrival, with nothing to follow, faces south instead.
    expect(bearingOf(horizonArrivalAim(beforeDawn))).toBeCloseTo(0, 9);
  });

  it('faces south, and stays finite, for a body straight overhead or underfoot', () => {
    for (const v of [[0, 1, 0], [0, -1, 0]]) {
      const aim = horizonTrackingAim(v, SKY_FOV);
      expect(aim.every(Number.isFinite)).toBe(true);
      expect(bearingOf(aim)).toBeCloseTo(0, 9);
      expect(altitudeOf(aim)).toBeLessThan(90);
    }
  });

  it('leaves the view alone once arrived, when nothing is being tracked', () => {
    expect(skyAim({ horizon: true, pending: false, tracking: false, toBody: toward(30), fov: SKY_FOV })).toBeNull();
    expect(skyAim({ horizon: false, pending: false, tracking: false, toBody: toward(30), fov: SKY_FOV })).toBeNull();
  });

  it('aims on arrival even with nothing selected, using the arrival rule', () => {
    const aim = skyAim({ horizon: true, pending: true, tracking: false, toBody: toward(35.4), fov: SKY_FOV });
    expect(altitudeOf(aim)).toBeCloseTo(ARRIVAL_ALTITUDE, 9);
  });

  it('centres the body as before in every worldview not seen from the ground', () => {
    // There is no ground to keep in an ecliptic frame, and centring is what lets
    // a planet's retrograde loop be followed and Jupiter's moons be magnified.
    const mars = toward(3, -140);
    for (const pending of [true, false]) {
      expect(skyAim({ horizon: false, pending, tracking: true, toBody: mars, fov: 0.4 })).toEqual(mars);
    }
  });
});

describe('DefaultFraming', () => {
  it('does not stand until the camera has actually been placed', () => {
    expect(new DefaultFraming().shouldReframe('cosmos')).toBe(false);
  });

  it('stands once established, from outside only', () => {
    const framing = new DefaultFraming();
    framing.established();
    expect(framing.shouldReframe('cosmos')).toBe(true);
    // From the Earth there is no distance to adjust.
    expect(framing.shouldReframe('sky')).toBe(false);
  });

  it('survives a visit to the sky view, so a resize made there is honoured on return', () => {
    const framing = new DefaultFraming();
    framing.established();
    expect(framing.shouldReframe('sky')).toBe(false);
    expect(framing.shouldReframe('cosmos')).toBe(true);
  });

  it('ends when the user takes the camera, and returns when the whole cosmos is asked for again', () => {
    const framing = new DefaultFraming();
    framing.established();
    framing.relinquished();
    expect(framing.shouldReframe('cosmos')).toBe(false);
    // "Whole cosmos", or a change of era, places the default framing afresh.
    framing.established();
    expect(framing.shouldReframe('cosmos')).toBe(true);
  });

  it('tolerates being relinquished twice', () => {
    const framing = new DefaultFraming();
    framing.relinquished();
    framing.relinquished();
    expect(framing.shouldReframe('cosmos')).toBe(false);
  });
});
