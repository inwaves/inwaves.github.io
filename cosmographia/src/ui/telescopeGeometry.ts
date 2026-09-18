/**
 * Geometry for the telescope inset, kept free of the canvas so it can be tested.
 * Screen convention: north up, east to the left (the sky as seen facing it), canvas y grows down.
 */

export interface ProjectedSatellite {
  east: number;
  north: number;
  behind: boolean;
}

/**
 * Screen position of a satellite, given offsets in planet radii. The planet disc is drawn larger
 * than to scale, so offsets are compressed by `pxPerRadius`; occultation is decided in true planet
 * radii, before any display scaling.
 */
export function satelliteScreen(s: ProjectedSatellite, pxPerRadius: number, halfSize: number, margin = 8): { x: number; y: number; hidden: boolean } {
  const hidden = s.behind && Math.hypot(s.east, s.north) < 1;
  const x = Math.max(-halfSize + margin, Math.min(halfSize - margin, -s.east * pxPerRadius));
  const y = -s.north * pxPerRadius;
  return { x, y, hidden };
}

/** Canvas rotation that turns the +x axis toward a position angle (degrees, north through east). */
export function positionAngleRotation(positionAngleDeg: number): number {
  const t = (positionAngleDeg * Math.PI) / 180;
  // screen vector of PA t is (-sin t, -cos t); its angle is atan2(-cos t, -sin t) = 3π/2 - t
  return normalizeAngle((3 * Math.PI) / 2 - t);
}

/**
 * Directed rotation for the ring ellipse: its local +x runs along the major axis and its local −y
 * points along the projected pole. Not normalised modulo π, so `ringHalves` can rely on that sign.
 */
export function ringRotation(majorAxisPositionAngleDeg: number): number {
  return normalizeAngle(Math.PI / 2 - (majorAxisPositionAngleDeg * Math.PI) / 180);
}

/**
 * The two halves of the ring ellipse (parameter ranges in the ellipse's local frame, after
 * `ringRotation`). `tiltSign` is the sign of (line of sight · ring pole): the near half of the ring
 * lies on the side of the projected pole times that sign, which is local −y when positive.
 */
export function ringHalves(tiltSign: number): { back: [number, number]; front: [number, number] } {
  return tiltSign >= 0
    ? { back: [0, Math.PI], front: [Math.PI, 2 * Math.PI] }
    : { back: [Math.PI, 2 * Math.PI], front: [0, Math.PI] };
}

function normalizeAngle(a: number): number {
  const twoPi = 2 * Math.PI;
  return ((a % twoPi) + twoPi) % twoPi;
}
