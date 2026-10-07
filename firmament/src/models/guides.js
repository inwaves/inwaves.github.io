/**
 * Guide primitives: the machinery each worldview posits, as plain data.
 *
 * A model describes its spheres, circles and lines with these records and knows
 * nothing about how they are drawn. The renderer keeps one drawable per `id` and
 * updates it each frame, so ids must be stable for the lifetime of a model.
 *
 * Every guide carries the `body` it belongs to (or null for the cosmos as a
 * whole) so that the machinery of a selected body can be emphasised, and a
 * `role` that determines its styling and its entry in the on-screen legend.
 */

const X = [1, 0, 0];
const Y = [0, 1, 0];

/** A circle of `radius` about `center`, lying in the plane spanned by unit vectors u and v. */
export function circle(id, body, role, center, radius, u = X, v = Y) {
  return { type: 'circle', id, body, role, center, radius, u, v };
}

export function line(id, body, role, a, b) {
  return { type: 'line', id, body, role, a, b };
}

/** A marked point such as an equant or the centre of an eccentric. */
export function point(id, body, role, pos, label = null) {
  return { type: 'point', id, body, role, pos, label };
}

export function polyline(id, body, role, points, closed = false) {
  return { type: 'polyline', id, body, role, points, closed };
}

/** A hollow wheel: Anaximander's rings of fire. */
export function torus(id, body, role, center, radius, tube, u = X, v = Y) {
  return { type: 'torus', id, body, role, center, radius, tube, u, v };
}

/** A flat ring in the ecliptic between two radii: the territory a body's shell occupies. */
export function annulus(id, body, role, inner, outer) {
  return { type: 'annulus', id, body, role, inner, outer };
}

/** A solid spherical shell between two radii: Aristotle's crystalline spheres. */
export function shell(id, body, role, inner, outer) {
  return { type: 'shell', id, body, role, inner, outer };
}

const VECTOR_FIELDS = ['center', 'a', 'b', 'pos'];

/** Returns a copy of a guide displaced by `delta`. Directions (u, v) are unchanged. */
export function translateGuide(guide, delta) {
  const moved = { ...guide };
  for (const field of VECTOR_FIELDS) {
    if (guide[field]) {
      moved[field] = [guide[field][0] + delta[0], guide[field][1] + delta[1], guide[field][2] + delta[2]];
    }
  }
  if (guide.points) {
    moved.points = guide.points.map((p) => [p[0] + delta[0], p[1] + delta[1], p[2] + delta[2]]);
  }
  return moved;
}
