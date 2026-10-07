/**
 * How far round the sky a trail reaches.
 *
 * A sky trail is legible only while it does not lap itself: every body keeps
 * near the ecliptic, so a second lap lies on top of the first. Limiting a trail
 * by elapsed time does not achieve this, because apparent motion is far from
 * uniform. In the 336 days that the Sun takes to cover 331 degrees, Venus can
 * also swing from 46 degrees west of it to 46 degrees east, and so cover 423.
 *
 * The bound is therefore placed on the angle itself. Each sample carries the
 * cumulative, unwrapped angle the body has turned through about a fixed axis
 * (the pole of the ecliptic, or on Anaximander's drum the celestial axis), and
 * the oldest samples are dropped until what remains spans no more than the
 * limit. A retrograde loop runs back and forth inside that span, so it is kept.
 *
 * Pure functions on plain arrays, so they can be tested against the real models.
 */
import { cross, dot } from '../core/vec.js';

const RAD_TO_DEG = 180 / Math.PI;

/**
 * Signed angle, in degrees, turned from direction `a` to direction `b` about the
 * unit axis `n`: positive when counter-clockwise seen from the tip of `n`. Only
 * the parts of `a` and `b` perpendicular to the axis matter. Returns 0 when
 * either direction lies along the axis, where the angle is undefined.
 */
export function signedAngleAbout(a, b, n) {
  const da = dot(a, n);
  const db = dot(b, n);
  const pa = [a[0] - da * n[0], a[1] - da * n[1], a[2] - da * n[2]];
  const pb = [b[0] - db * n[0], b[1] - db * n[1], b[2] - db * n[2]];
  if (Math.hypot(...pa) < 1e-9 || Math.hypot(...pb) < 1e-9) return 0;
  return Math.atan2(dot(n, cross(pa, pb)), dot(pa, pb)) * RAD_TO_DEG;
}

/** Extent of a run of unwrapped angles: greatest minus least. Zero for an empty run. */
export function spanOf(angles) {
  if (angles.length === 0) return 0;
  let min = Infinity;
  let max = -Infinity;
  for (const angle of angles) {
    if (angle < min) min = angle;
    if (angle > max) max = angle;
  }
  return max - min;
}

/**
 * Index of the first sample to keep so that the retained samples, which always
 * end at the newest, span no more than `maxSpan` degrees. Scans back from the
 * newest: the span of a suffix can only grow as the suffix lengthens, so the
 * first index at which it is exceeded marks the longest suffix that fits.
 * @param {number[]} angles cumulative unwrapped angles, oldest first
 * @param {number} maxSpan degrees
 */
export function firstIndexWithinSpan(angles, maxSpan) {
  let min = Infinity;
  let max = -Infinity;
  for (let i = angles.length - 1; i >= 0; i -= 1) {
    if (angles[i] < min) min = angles[i];
    if (angles[i] > max) max = angles[i];
    if (max - min > maxSpan) return i + 1;
  }
  return 0;
}
