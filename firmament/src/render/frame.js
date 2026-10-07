/**
 * Mapping between the model frame and three.js.
 *
 * Models use x toward longitude 0, y toward longitude 90, z toward the north
 * ecliptic pole. three.js conventionally has y up. The mapping below is a proper
 * rotation (determinant +1), not a reflection, so the sky is never mirrored and
 * motion toward increasing longitude stays counter-clockwise seen from the north.
 */
import { Matrix4, Vector3 } from 'three';

/** Writes model vector `v`, multiplied by `scale`, into a three.js vector. */
export function toThree(v, scale = 1, target = new Vector3()) {
  return target.set(v[0] * scale, v[2] * scale, -v[1] * scale);
}

const U = new Vector3();
const V = new Vector3();
const N = new Vector3();

/**
 * Builds the matrix that carries a figure drawn at unit size in local XY into
 * the plane spanned by model unit vectors `u` and `v`, enlarged to `radius` and
 * centred on `center`. `scale` converts model units to scene units.
 */
export function planeMatrix(target, center, u, v, radius, scale) {
  const size = radius * scale;
  toThree(u, 1, U);
  toThree(v, 1, V);
  N.crossVectors(U, V).normalize();
  target.makeBasis(U.multiplyScalar(size), V.multiplyScalar(size), N.multiplyScalar(size));
  return target.setPosition(center[0] * scale, center[2] * scale, -center[1] * scale);
}

/**
 * Matrix taking catalogue directions, already in three.js coordinates, to where a
 * model says the ecliptic basis vectors point. `basis` holds the images of the
 * model x, y and z axes, in model coordinates. A model direction (a, b, c) is
 * stored in three.js as (a, c, -b), so the columns are the images of x, z, -y.
 */
export function basisMatrix(target, basis) {
  const x = toThree(basis.x, 1, U);
  const z = toThree(basis.z, 1, V);
  const negY = toThree(basis.y, -1, N);
  return target.makeBasis(x, z, negY);
}

export const IDENTITY = new Matrix4();

/**
 * Radius on screen, in CSS pixels, of something `sceneRadius` across.
 * `perPixel` is how many scene units one pixel spans at the object's distance.
 * Falls back when the camera sits exactly on the object and the ratio is undefined.
 */
export function onScreenRadius(sceneRadius, perPixel, fallback) {
  return perPixel > 0 && Number.isFinite(sceneRadius / perPixel) ? sceneRadius / perPixel : fallback;
}

/**
 * How far back a camera must stand to see at least `halfWidth` to either side of
 * its target and `halfHeight` above and below it, at the target's depth.
 *
 * The vertical field of view is fixed, so the horizontal one shrinks with the
 * aspect ratio: a distance that frames a cosmos comfortably on a wide monitor
 * cuts its sides off on a square window and far more on a phone held upright.
 *
 * @param {number} halfWidth scene units
 * @param {number} halfHeight scene units
 * @param {number} fovDeg vertical field of view, degrees
 * @param {number} aspect viewport width divided by height
 */
export function fitDistance(halfWidth, halfHeight, fovDeg, aspect) {
  const t = Math.tan((fovDeg * Math.PI) / 360);
  return Math.max(halfHeight / t, halfWidth / (t * aspect));
}
