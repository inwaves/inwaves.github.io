import { Matrix4, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { equatorialToEcliptic } from '../scripts/build-stars.mjs';
import { celestialPoleInEcliptic, eclipticToEquatorialVector, equatorPointInEcliptic, equatorialToEclipticVector } from '../src/core/sky.js';
import { cross, dot, fromLonLat, length, rotateZ, tilt, toLonLat } from '../src/core/vec.js';
import { basisMatrix, fitDistance, onScreenRadius, planeMatrix, toThree } from '../src/render/frame.js';

const OBLIQUITY = 23.4392911;
const arr = (v) => [v.x, v.y, v.z];

/**
 * Compares a three.js vector with expected components numerically. Deep equality
 * is the wrong tool here: it tells -0 from +0, and the mapping negates a
 * component, so an exact zero legitimately comes out as negative zero.
 */
function expectVector(v, expected) {
  const got = arr(v);
  for (let k = 0; k < 3; k += 1) expect(got[k]).toBeCloseTo(expected[k], 12);
}

describe('equator and ecliptic', () => {
  it('puts the equator south of the ecliptic at right ascension 6h, where the summer solstice stands north of it', () => {
    const p = toLonLat(equatorPointInEcliptic(90, OBLIQUITY));
    expect(p.lon).toBeCloseTo(90, 9);
    expect(p.lat).toBeCloseTo(-OBLIQUITY, 9);
    expect(toLonLat(equatorPointInEcliptic(270, OBLIQUITY)).lat).toBeCloseTo(OBLIQUITY, 9);
  });

  it('crosses the ecliptic at the two equinoxes', () => {
    expect(toLonLat(equatorPointInEcliptic(0, OBLIQUITY)).lat).toBeCloseTo(0, 12);
    expect(toLonLat(equatorPointInEcliptic(180, OBLIQUITY)).lat).toBeCloseTo(0, 12);
  });

  it('places the north celestial pole at ecliptic longitude 90, latitude 90 minus the obliquity', () => {
    const pole = toLonLat(celestialPoleInEcliptic(OBLIQUITY));
    expect(pole.lon).toBeCloseTo(90, 9);
    expect(pole.lat).toBeCloseTo(90 - OBLIQUITY, 9);
  });

  it('keeps every point of the equator perpendicular to the pole', () => {
    // This is the check that exposes a sign error: a mirrored equator is not
    // perpendicular to the true pole.
    const pole = celestialPoleInEcliptic(OBLIQUITY);
    for (let ra = 0; ra < 360; ra += 15) {
      expect(dot(equatorPointInEcliptic(ra, OBLIQUITY), pole)).toBeCloseTo(0, 12);
    }
  });

  it('agrees with the catalogue conversion that was validated on real stars', () => {
    for (const [ra, dec] of [[152.093, 11.967], [201.298, -11.161], [247.352, -26.432], [68.98, 16.509], [10, 80], [300, -60]]) {
      const [lambda, beta] = equatorialToEcliptic(ra, dec);
      const viaVector = toLonLat(equatorialToEclipticVector(fromLonLat(ra, dec), OBLIQUITY));
      expect(viaVector.lon).toBeCloseTo(lambda, 8);
      expect(viaVector.lat).toBeCloseTo(beta, 8);
    }
  });

  it('inverts cleanly', () => {
    const v = fromLonLat(123, -41);
    const back = equatorialToEclipticVector(eclipticToEquatorialVector(v, OBLIQUITY), OBLIQUITY);
    for (let k = 0; k < 3; k += 1) expect(back[k]).toBeCloseTo(v[k], 12);
  });
});

describe('model frame to three.js', () => {
  const x = toThree([1, 0, 0]);
  const y = toThree([0, 1, 0]);
  const z = toThree([0, 0, 1]);

  it('sends the north ecliptic pole to three.js up', () => {
    expectVector(z, [0, 1, 0]);
  });

  it('is a proper rotation, so the sky is never mirrored', () => {
    const det = new Vector3().crossVectors(x, y).dot(z);
    expect(det).toBeCloseTo(1, 12);
    for (const v of [x, y, z]) expect(v.length()).toBeCloseTo(1, 12);
  });

  it('preserves handedness of an arbitrary triple', () => {
    const a = [0.3, -0.7, 0.2];
    const b = [0.9, 0.1, -0.4];
    const viaModel = toThree(cross(a, b));
    const viaThree = new Vector3().crossVectors(toThree(a), toThree(b));
    for (let k = 0; k < 3; k += 1) expect(arr(viaModel)[k]).toBeCloseTo(arr(viaThree)[k], 12);
  });

  it('keeps increasing longitude counter-clockwise when seen from above', () => {
    // Looking down three.js -y from above, with x to the right, counter-clockwise
    // means the turn from longitude 0 to longitude 90 is about +y.
    const turn = new Vector3().crossVectors(toThree(fromLonLat(0, 0)), toThree(fromLonLat(90, 0)));
    expect(turn.y).toBeCloseTo(1, 12);
  });

  it('applies the scale', () => {
    expectVector(toThree([1, 2, 3], 10), [10, 30, -20]);
    expectVector(toThree([0, 0, 0], 10), [0, 0, 0]);
  });
});

describe('onScreenRadius', () => {
  it('divides the scene radius by the scene units one pixel spans', () => {
    expect(onScreenRadius(10, 0.5, 5)).toBeCloseTo(20, 12);
  });

  it('grows as the camera closes in, so a name keeps clearing the body it labels', () => {
    // Anaximander's drum: half a diameter across, at the scene scale of that era.
    const sceneRadius = 0.5 * (100 / 28.5);
    const pixelAtUnitDistance = (2 * Math.tan((45 * Math.PI) / 360)) / 1080;
    const wholeCosmos = onScreenRadius(sceneRadius, pixelAtUnitDistance * 250, 6);
    const closeUp = onScreenRadius(sceneRadius, pixelAtUnitDistance * 12, 6);
    // Small when the whole cosmos is framed, large in close-up: never a constant.
    expect(wholeCosmos).toBeLessThan(12);
    expect(closeUp).toBeGreaterThan(150);
    expect(closeUp / wholeCosmos).toBeCloseTo(250 / 12, 9);
  });

  it('falls back when the camera sits on the object and the ratio is undefined', () => {
    expect(onScreenRadius(3, 0, 7)).toBe(7);
    expect(onScreenRadius(0, 0, 7)).toBe(7);
  });
});

describe('fitDistance', () => {
  const t = Math.tan((22.5 * Math.PI) / 180);
  /** What a camera at `distance` sees to either side and above and below its target. */
  const visible = (distance, aspect) => ({ halfWidth: distance * t * aspect, halfHeight: distance * t });

  it('sees at least what was asked for, in every shape of viewport', () => {
    for (const aspect of [21 / 9, 16 / 9, 4 / 3, 1, 3 / 4, 9 / 16]) {
      const d = fitDistance(108, 99, 45, aspect);
      const v = visible(d, aspect);
      expect(v.halfWidth).toBeGreaterThanOrEqual(108 - 1e-9);
      expect(v.halfHeight).toBeGreaterThanOrEqual(99 - 1e-9);
    }
  });

  it('is tight: one of the two limits binds exactly', () => {
    for (const aspect of [16 / 9, 1, 9 / 16]) {
      const v = visible(fitDistance(108, 99, 45, aspect), aspect);
      const slack = Math.min(v.halfWidth - 108, v.halfHeight - 99);
      expect(slack).toBeCloseTo(0, 9);
    }
  });

  it('is bound by height on a wide viewport and by width on an upright one', () => {
    expect(fitDistance(108, 99, 45, 16 / 9)).toBeCloseTo(99 / t, 9);
    expect(fitDistance(108, 99, 45, 9 / 16)).toBeCloseTo(108 / (t * (9 / 16)), 9);
  });

  it('shows why a fixed distance of 250 clipped every cosmos on a phone held upright', () => {
    // Every era spans 100 scene units either side of the centre.
    expect(visible(250, 9 / 16).halfWidth).toBeLessThan(100);
    expect(visible(250, 16 / 9).halfWidth).toBeGreaterThan(100);
    expect(fitDistance(108, 99, 45, 9 / 16)).toBeGreaterThan(250);
  });

  it('leaves a wide window framed as before, since the usual standoff already suffices', () => {
    expect(fitDistance(108, 99, 45, 16 / 9)).toBeLessThan(250);
  });

  it('backs away as the field of view narrows', () => {
    expect(fitDistance(100, 100, 20, 1)).toBeGreaterThan(fitDistance(100, 100, 45, 1));
  });
});

describe('planeMatrix', () => {
  it('carries the unit circle onto the requested circle, in the requested plane', () => {
    const center = [4, -2, 1];
    const u = tilt([1, 0, 0], 40, 25);
    const v = tilt([0, 1, 0], 40, 25);
    const radius = 3;
    const scale = 7;
    const m = planeMatrix(new Matrix4(), center, u, v, radius, scale);
    for (const t of [0, 37, 90, 201, 315]) {
      const c = Math.cos((t * Math.PI) / 180);
      const s = Math.sin((t * Math.PI) / 180);
      const got = new Vector3(c, s, 0).applyMatrix4(m);
      const expected = toThree([0, 1, 2].map((k) => center[k] + radius * (c * u[k] + s * v[k])), scale);
      for (let k = 0; k < 3; k += 1) expect(arr(got)[k]).toBeCloseTo(arr(expected)[k], 9);
    }
  });

  it('scales uniformly, so a torus drawn with it keeps a round tube', () => {
    const m = planeMatrix(new Matrix4(), [0, 0, 0], [1, 0, 0], [0, 1, 0], 2, 5);
    const lengths = [0, 1, 2].map((k) => new Vector3().setFromMatrixColumn(m, k).length());
    for (const l of lengths) expect(l).toBeCloseTo(10, 12);
  });
});

describe('basisMatrix', () => {
  it('is the identity when the model leaves the ecliptic axes where they are', () => {
    const m = basisMatrix(new Matrix4(), { x: [1, 0, 0], y: [0, 1, 0], z: [0, 0, 1] });
    const id = new Matrix4();
    for (let k = 0; k < 16; k += 1) expect(m.elements[k]).toBeCloseTo(id.elements[k], 12);
  });

  it('sends a catalogue direction where the model says it should go', () => {
    // An arbitrary rotation standing in for Anaximander's turning star-wheel.
    const turn = (v) => tilt(rotateZ(v, 70), 15, 38);
    const basis = { x: turn([1, 0, 0]), y: turn([0, 1, 0]), z: turn([0, 0, 1]) };
    const m = basisMatrix(new Matrix4(), basis);
    for (const [lon, lat] of [[0, 0], [104.08, -39.6], [250, 61], [33, 5]]) {
      const star = fromLonLat(lon, lat);
      const got = toThree(star).applyMatrix4(m);
      const expected = toThree(turn(star));
      for (let k = 0; k < 3; k += 1) expect(arr(got)[k]).toBeCloseTo(arr(expected)[k], 9);
      expect(length(turn(star))).toBeCloseTo(1, 12);
    }
  });
});
