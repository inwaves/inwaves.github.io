import { Vector3 } from 'three';
import { DEG, GAUSS_K } from '../math';

/** Solve Kepler's equation M = E - e sin E (radians) by Newton iteration. */
export function solveKepler(M: number, e: number): number {
  let E = e < 0.8 ? M + e * Math.sin(M) : Math.PI * Math.sign(Math.sin(M)) || Math.PI;
  for (let i = 0; i < 50; i++) {
    const dE = (M - (E - e * Math.sin(E))) / (1 - e * Math.cos(E));
    E += dE;
    if (Math.abs(dE) < 1e-12) break;
  }
  return E;
}

/**
 * Rotate orbital-plane coordinates (x toward perihelion) into the reference ecliptic frame.
 * Angles in degrees: argument of perihelion ω, inclination i, ascending node Ω.
 */
export function orbitalPlaneToEcliptic(
  xp: number,
  yp: number,
  argPeriDeg: number,
  inclinationDeg: number,
  nodeDeg: number,
  out = new Vector3(),
): Vector3 {
  const w = argPeriDeg * DEG;
  const I = inclinationDeg * DEG;
  const O = nodeDeg * DEG;
  const cw = Math.cos(w);
  const sw = Math.sin(w);
  const cO = Math.cos(O);
  const sO = Math.sin(O);
  const cI = Math.cos(I);
  const sI = Math.sin(I);
  return out.set(
    (cw * cO - sw * sO * cI) * xp + (-sw * cO - cw * sO * cI) * yp,
    (cw * sO + sw * cO * cI) * xp + (-sw * sO + cw * cO * cI) * yp,
    sw * sI * xp + cw * sI * yp,
  );
}

export interface CometElements {
  /** Perihelion distance, AU. */
  q: number;
  e: number;
  /** Degrees, J2000 ecliptic. */
  i: number;
  node: number;
  argPeri: number;
  /** Time of perihelion passage, JD (TDB ≈ TT). */
  tp: number;
}

/**
 * Heliocentric J2000 ecliptic position (AU) of a body on a conic orbit.
 * Elliptic orbits use Kepler's equation; e ≥ 0.99 uses Barker's equation for a parabola,
 * which is accurate for the near-parabolic great comets near perihelion.
 */
export function conicPosition(el: CometElements, jd: number, out = new Vector3()): Vector3 {
  const dt = jd - el.tp;
  if (el.e >= 0.99) {
    const W = ((3 * GAUSS_K) / Math.sqrt(2 * el.q * el.q * el.q)) * dt;
    // Solve s^3 + 3s - W = 0 (s = tan(v/2)) in closed form.
    const Y = Math.cbrt(W / 2 + Math.sqrt((W * W) / 4 + 1));
    const s = Y - 1 / Y;
    const xp = el.q * (1 - s * s);
    const yp = 2 * el.q * s;
    return orbitalPlaneToEcliptic(xp, yp, el.argPeri, el.i, el.node, out);
  }
  const a = el.q / (1 - el.e);
  const n = GAUSS_K / Math.pow(a, 1.5);
  let M = (n * dt) % (2 * Math.PI);
  if (M > Math.PI) M -= 2 * Math.PI;
  if (M < -Math.PI) M += 2 * Math.PI;
  const E = solveKepler(M, el.e);
  const xp = a * (Math.cos(E) - el.e);
  const yp = a * Math.sqrt(1 - el.e * el.e) * Math.sin(E);
  return orbitalPlaneToEcliptic(xp, yp, el.argPeri, el.i, el.node, out);
}
