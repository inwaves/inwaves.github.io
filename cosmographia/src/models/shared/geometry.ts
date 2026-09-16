import { Quaternion, Vector3 } from 'three';
import { DEG } from '../../astro/math';

export const Z_AXIS = new Vector3(0, 0, 1);
export const X_AXIS = new Vector3(1, 0, 0);
export const Y_AXIS = new Vector3(0, 1, 0);

/** Write r·(cos θ, sin θ, z) into `out`, θ in degrees. */
export function onCircle(out: Vector3, radius: number, angleDeg: number, z = 0): Vector3 {
  const a = angleDeg * DEG;
  return out.set(radius * Math.cos(a), radius * Math.sin(a), z);
}

/** Rotation about the ecliptic pole by `deg`. */
export function rotZ(out: Quaternion, deg: number): Quaternion {
  return out.setFromAxisAngle(Z_AXIS, deg * DEG);
}

const nodeAxis = new Vector3();

/** Tilt of an orbital plane: rotation by `inclination` about the line of nodes at longitude `node`. */
export function tiltAboutNodeLine(out: Quaternion, nodeDeg: number, inclinationDeg: number): Quaternion {
  nodeAxis.set(Math.cos(nodeDeg * DEG), Math.sin(nodeDeg * DEG), 0);
  return out.setFromAxisAngle(nodeAxis, inclinationDeg * DEG);
}

/** Heliocentric-style latitude of a point at longitude `lonDeg` in a plane tilted about a node line. */
export function latitudeInTiltedPlane(lonDeg: number, nodeDeg: number, inclinationDeg: number): number {
  return Math.asin(Math.sin(inclinationDeg * DEG) * Math.sin((lonDeg - nodeDeg) * DEG)) / DEG;
}
