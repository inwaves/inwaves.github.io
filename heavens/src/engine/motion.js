// Kinematic building blocks shared by every historical model.
//
// Conventions: the ecliptic is the XZ plane, +Y is the north ecliptic pole and ecliptic
// longitude increases counter-clockwise seen from +Y, i.e. a point at longitude L sits at
// (r cos L, 0, -r sin L). Planar computations use mathematical coordinates (x toward
// longitude 0, y toward longitude 90) and are converted by planeToWorld, which also tilts
// the plane about its line of nodes by the inclination.
//
// Every motion returns the OFFSET of a node from its parent at time t (days from J2000).

import * as THREE from 'three';
import { ELEMENTS, synodic } from '../data/elements.js';

export const DEG = Math.PI / 180;
export const TAU = Math.PI * 2;

export function normAngle(a) {
  a %= TAU;
  return a < 0 ? a + TAU : a;
}

/** Planar (x, y) in a plane inclined by incl about the node line at longitude node -> scene vector. */
export function planeToWorld(x, y, inclDeg = 0, nodeDeg = 0, out = new THREE.Vector3()) {
  let X = x;
  let Y = y;
  let Z = 0;
  if (inclDeg) {
    const i = inclDeg * DEG;
    const W = nodeDeg * DEG;
    const nx = Math.cos(W);
    const ny = Math.sin(W);
    const c = Math.cos(i);
    const s = Math.sin(i);
    const dot = nx * x + ny * y;
    // Rodrigues rotation of (x, y, 0) about the in-plane unit axis (nx, ny, 0).
    X = x * c + nx * dot * (1 - c);
    Y = y * c + ny * dot * (1 - c);
    Z = (nx * y - ny * x) * s;
  }
  return out.set(X, Z, -Y);
}

/** Quaternion producing the same tilt as planeToWorld, for whole objects (e.g. tori). */
export function tiltQuaternion(inclDeg = 0, nodeDeg = 0, out = new THREE.Quaternion()) {
  const W = nodeDeg * DEG;
  const axis = new THREE.Vector3(Math.cos(W), 0, -Math.sin(W));
  return out.setFromAxisAngle(axis, inclDeg * DEG);
}

// --- uniform circular motion, optionally eccentric and/or with an equant ------------------

export function circleAngle(m, t) {
  return (m.phase || 0) * DEG + (m.period ? (TAU * t) / m.period : 0);
}

/** Fixed part of the circle's centre offset (eccentric), planar coordinates. */
export function circleBaseCentre(m) {
  if (!m.eccentric) return [0, 0];
  const d = m.eccentric.direction * DEG;
  return [m.eccentric.distance * Math.cos(d), m.eccentric.distance * Math.sin(d)];
}

/**
 * Centre of the circle at time t. With `eccentric.crank = { radius, period, phase }` the
 * centre itself rides a small circle about the fixed eccentric point (Ptolemy's Mercury).
 */
export function circleCentre(m, t = 0) {
  const [bx, by] = circleBaseCentre(m);
  const k = m.eccentric?.crank;
  if (!k) return [bx, by];
  const phi = (k.phase || 0) * DEG + (k.period ? (TAU * t) / k.period : 0);
  return [bx + k.radius * Math.cos(phi), by + k.radius * Math.sin(phi)];
}

export function equantPoint(m) {
  if (!m.equant) return null;
  const d = m.equant.direction * DEG;
  return [m.equant.distance * Math.cos(d), m.equant.distance * Math.sin(d)];
}

/**
 * m = { radius, period (days; 0 = static), phase (deg at J2000),
 *       eccentric?: { distance, direction }, equant?: { distance, direction }, incl?, node? }
 * With an equant, the angle seen from the equant point grows uniformly and the body is
 * the intersection of that ray with the (eccentric) circle.
 */
export function circleOffset(m, t, out = new THREE.Vector3()) {
  const theta = circleAngle(m, t);
  const [cx, cy] = circleCentre(m, t);
  let px;
  let py;
  const q = equantPoint(m);
  if (q) {
    const ux = Math.cos(theta);
    const uy = Math.sin(theta);
    const dx = q[0] - cx;
    const dy = q[1] - cy;
    const b = dx * ux + dy * uy;
    const c = dx * dx + dy * dy - m.radius * m.radius;
    const s = -b + Math.sqrt(Math.max(0, b * b - c));
    px = q[0] + s * ux;
    py = q[1] + s * uy;
  } else {
    px = cx + m.radius * Math.cos(theta);
    py = cy + m.radius * Math.sin(theta);
  }
  return planeToWorld(px, py, m.incl, m.node, out);
}

// --- Keplerian ellipse -----------------------------------------------------------------------

export function solveKepler(M, e) {
  let E = e < 0.8 ? M : Math.PI;
  for (let k = 0; k < 40; k++) {
    const d = (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E));
    E -= d;
    if (Math.abs(d) < 1e-12) break;
  }
  return E;
}

/** m = { a, e, period, peri (longitude of perihelion, deg), M0 (mean anomaly at J2000, deg), incl?, node? } */
export function ellipseOffset(m, t, out = new THREE.Vector3()) {
  const M = normAngle((m.M0 || 0) * DEG + (TAU * t) / m.period);
  const E = solveKepler(M, m.e);
  const xo = m.a * (Math.cos(E) - m.e);
  const yo = m.a * Math.sqrt(1 - m.e * m.e) * Math.sin(E);
  const w = (m.peri || 0) * DEG;
  const c = Math.cos(w);
  const s = Math.sin(w);
  return planeToWorld(xo * c - yo * s, xo * s + yo * c, m.incl, m.node, out);
}

// --- Eudoxan homocentric spheres -------------------------------------------------------------

/**
 * Point on the hippopede in a local frame whose x axis points at the curve's centre on the
 * ecliptic, y along the ecliptic and z toward the north ecliptic pole. Two spheres rotate at
 * equal and opposite rates about axes inclined by alpha: P = R_y(theta) R_a4(-theta) P0.
 */
export function hippopedePoint(alpha, th) {
  const c = Math.cos(th);
  const s = Math.sin(th);
  const ca = Math.cos(alpha);
  const sa = Math.sin(alpha);
  return [c * c + s * s * ca, -s * sa, s * c * (ca - 1)];
}

export function eudoxusLongitude(m, t) {
  return (m.phase || 0) * DEG + (TAU * t) / m.zodiacPeriod;
}

/** m = { radius, zodiacPeriod, phase, synodicPeriod, synodicPhase, alpha (deg) } */
export function eudoxusOffset(m, t, out = new THREE.Vector3()) {
  const lam = eudoxusLongitude(m, t);
  const th = (m.synodicPhase || 0) * DEG + (TAU * t) / m.synodicPeriod;
  const [x, y, z] = hippopedePoint(m.alpha * DEG, th);
  const X = x * Math.cos(lam) - y * Math.sin(lam);
  const Y = x * Math.sin(lam) + y * Math.cos(lam);
  return out.set(m.radius * X, m.radius * z, -m.radius * Y);
}

// --- reference ephemeris and apparent positions -----------------------------------------------

const _a = new THREE.Vector3();
const _b = new THREE.Vector3();

export function elementsToEllipse(el, scale = 1) {
  return { type: 'ellipse', a: el.a * scale, e: el.e, period: el.period, incl: el.i, node: el.node, peri: el.peri, M0: el.M0 };
}

/** Heliocentric position (AU) from the mean J2000 elements. */
export function helioPosition(id, t, out = new THREE.Vector3()) {
  return ellipseOffset(elementsToEllipse(ELEMENTS[id]), t, out);
}

/** Dispatch on motion type. */
export function computeOffset(m, t, out = new THREE.Vector3()) {
  if (!m || m.type === 'fixed') {
    const o = m?.offset || [0, 0, 0];
    return out.set(o[0], o[1], o[2]);
  }
  switch (m.type) {
    case 'circle':
      return circleOffset(m, t, out);
    case 'ellipse':
      return ellipseOffset(m, t, out);
    case 'eudoxus':
      return eudoxusOffset(m, t, out);
    case 'apparent': {
      // Direction of the body as seen from the Earth, projected to a fixed radius:
      // how the planets were known before anyone could give them a distance.
      helioPosition(m.of, t, _a);
      helioPosition('earth', t, _b);
      return out.copy(_a).sub(_b).normalize().multiplyScalar(m.radius);
    }
    default:
      throw new Error(`Unknown motion type ${m.type}`);
  }
}

// --- guide curves ------------------------------------------------------------------------------

/** Circle of radius m.radius about its own centre, in the tilted plane (the renderer positions it). */
export function circleGuidePoints(m, n = 180) {
  const pts = [];
  for (let k = 0; k < n; k++) {
    const a = (TAU * k) / n;
    pts.push(planeToWorld(m.radius * Math.cos(a), m.radius * Math.sin(a), m.incl, m.node));
  }
  return pts;
}

export function ellipseGuidePoints(m, n = 256) {
  const pts = [];
  const w = (m.peri || 0) * DEG;
  const c = Math.cos(w);
  const s = Math.sin(w);
  const b = m.a * Math.sqrt(1 - m.e * m.e);
  for (let k = 0; k < n; k++) {
    const E = (TAU * k) / n;
    const xo = m.a * (Math.cos(E) - m.e);
    const yo = b * Math.sin(E);
    pts.push(planeToWorld(xo * c - yo * s, xo * s + yo * c, m.incl, m.node));
  }
  return pts;
}

/** Position of the empty focus of an ellipse (the occupied focus is the parent). */
export function ellipseEmptyFocus(m) {
  const w = (m.peri || 0) * DEG;
  const d = -2 * m.a * m.e;
  return planeToWorld(d * Math.cos(w), d * Math.sin(w), m.incl, m.node);
}

/** Hippopede traced at zodiacal longitude 0; rotate about Y by the current longitude. */
export function hippopedeGuidePoints(m, n = 256) {
  const pts = [];
  for (let k = 0; k <= n; k++) {
    const th = (TAU * k) / n;
    const [x, y, z] = hippopedePoint(m.alpha * DEG, th);
    pts.push(new THREE.Vector3(m.radius * x, m.radius * z, -m.radius * y));
  }
  return pts;
}

/** Shortest period present in a motion; used to choose a trail sampling interval. */
export function motionMinPeriod(m) {
  if (!m) return Infinity;
  switch (m.type) {
    case 'circle':
      return m.period ? Math.abs(m.period) : Infinity;
    case 'ellipse':
      return m.period;
    case 'eudoxus':
      return Math.min(m.zodiacPeriod, m.synodicPeriod);
    case 'apparent':
      return Math.min(synodic(ELEMENTS[m.of].period, ELEMENTS.earth.period), ELEMENTS[m.of].period);
    default:
      return Infinity;
  }
}
