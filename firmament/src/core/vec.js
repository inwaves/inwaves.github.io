/**
 * Minimal 3-vector helpers on plain arrays. The model layer is deliberately free
 * of three.js so that the kinematics can be unit-tested in Node.
 *
 * Model frame: x toward ecliptic longitude 0, y toward longitude 90, z toward
 * the north ecliptic pole. Motion in the direction of increasing longitude is
 * therefore counter-clockwise seen from the north.
 */
import { DEG, atan2d, asind, wrap360 } from './angles.js';

export const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
export const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
export const scale = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
export const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
export const length = (a) => Math.hypot(a[0], a[1], a[2]);

export const cross = (a, b) => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];

export function normalize(a) {
  const len = length(a);
  return len === 0 ? [0, 0, 0] : scale(a, 1 / len);
}

/** Vector of the given length in the ecliptic plane at the given longitude. */
export function polar(lonDeg, radius = 1) {
  const l = lonDeg * DEG;
  return [radius * Math.cos(l), radius * Math.sin(l), 0];
}

/** Unit vector at ecliptic longitude and latitude. */
export function fromLonLat(lonDeg, latDeg, radius = 1) {
  const l = lonDeg * DEG;
  const b = latDeg * DEG;
  return [radius * Math.cos(b) * Math.cos(l), radius * Math.cos(b) * Math.sin(l), radius * Math.sin(b)];
}

/** Longitude, latitude (degrees) and distance of a vector. */
export function toLonLat(v) {
  const dist = length(v);
  return {
    lon: wrap360(atan2d(v[1], v[0])),
    lat: dist === 0 ? 0 : asind(v[2] / dist),
    dist,
  };
}

export function rotateZ(v, deg) {
  const c = Math.cos(deg * DEG);
  const s = Math.sin(deg * DEG);
  return [c * v[0] - s * v[1], s * v[0] + c * v[1], v[2]];
}

export function rotateX(v, deg) {
  const c = Math.cos(deg * DEG);
  const s = Math.sin(deg * DEG);
  return [v[0], c * v[1] - s * v[2], s * v[1] + c * v[2]];
}

export function rotateY(v, deg) {
  const c = Math.cos(deg * DEG);
  const s = Math.sin(deg * DEG);
  return [c * v[0] + s * v[2], v[1], -s * v[0] + c * v[2]];
}

/** Rotates v about a unit axis by the given angle (Rodrigues' formula). */
export function rotateAbout(v, axis, deg) {
  const c = Math.cos(deg * DEG);
  const s = Math.sin(deg * DEG);
  const k = axis;
  const kxv = cross(k, v);
  const kdv = dot(k, v);
  return [
    v[0] * c + kxv[0] * s + k[0] * kdv * (1 - c),
    v[1] * c + kxv[1] * s + k[1] * kdv * (1 - c),
    v[2] * c + kxv[2] * s + k[2] * kdv * (1 - c),
  ];
}

/**
 * Tilts a vector out of the ecliptic: rotates by `incDeg` about the line of
 * nodes, whose ascending end lies at longitude `nodeDeg`. Points on the node
 * line are unmoved; a point 90 degrees past the ascending node is raised north.
 */
export function tilt(v, nodeDeg, incDeg) {
  if (incDeg === 0) return v;
  return rotateZ(rotateX(rotateZ(v, -nodeDeg), incDeg), nodeDeg);
}
