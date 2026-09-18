/**
 * Homocentric spheres: Eudoxus, and the physical cosmos Aristotle built on them.
 *
 * Every sphere is centred on the Earth. A body is fixed to the equator of the
 * innermost sphere of its own nest; each sphere turns uniformly about an axis
 * fixed in the sphere outside it. For a planet there are four:
 *
 *   1. the daily rotation, shared with the fixed stars;
 *   2. the slow passage round the zodiac;
 *   3. and 4. a pair with mutually inclined axes turning at equal and opposite
 *      rates. Together they trace a figure of eight, the hippopede, which laid
 *      along the zodiac produces stations and retrogradations.
 *
 * No distances are implied, so radii here are schematic. That is also the
 * model's fatal defect: a body can never change its distance from the Earth, so
 * nothing in it can account for the planets' changing brightness.
 *
 * Mean motions are taken from the Almagest so that the bodies stand roughly
 * where they really stood; the inclinations are reconstructions. See
 * docs/SOURCES.md.
 */
import { cosd, sind } from '../core/angles.js';
import { JD_NABONASSAR, precessionToJ2000 } from '../core/time.js';
import { cross, fromLonLat, normalize, polar, rotateAbout, rotateY, rotateZ, scale, tilt } from '../core/vec.js';
import { MOON, OBLIQUITY, PLANETS, SUN } from '../data/almagest.js';
import { circle, line, point, polyline, shell } from './guides.js';

const ORIGIN = [0, 0, 0];
const Z = [0, 0, 1];

/** Order outward from the Earth, as in Plato and Eudoxus: the Sun directly above the Moon. */
export const HOMOCENTRIC_ORDER = ['moon', 'sun', 'venus', 'mercury', 'mars', 'jupiter', 'saturn'];

/**
 * Schematic radius of each body's carrying sphere, the inclination between its
 * third and fourth spheres, and how many hippopede circuits are made per
 * synodic period (one, except in Schiaparelli's conjecture for Mars).
 */
const SCHEME = {
  moon: { radius: 20 },
  sun: { radius: 32 },
  venus: { radius: 44, inclination: 46, cycles: 1 },
  mercury: { radius: 56, inclination: 23, cycles: 1 },
  mars: { radius: 68, inclination: 34, cycles: 3 },
  jupiter: { radius: 80, inclination: 13, cycles: 1 },
  saturn: { radius: 92, inclination: 6, cycles: 1 },
};

/** Gap between successive spheres of one nest, schematic units. */
const SPHERE_GAP = 1.3;
const STAR_RADIUS = 104;
/** The small latitude Eudoxus wrongly attributed to the Sun. Illustrative. */
const SOLAR_DEVIATION = 0.5;

/** Number of spheres each astronomer assigned (Aristotle, Metaphysics Lambda 8). */
export const SPHERE_COUNTS = {
  eudoxus: { moon: 3, sun: 3, venus: 4, mercury: 4, mars: 4, jupiter: 4, saturn: 4 },
  callippus: { moon: 5, sun: 5, venus: 5, mercury: 5, mars: 5, jupiter: 4, saturn: 4 },
  /** Aristotle's counteracting spheres, one fewer than the carrying spheres; none for the Moon. */
  counteracting: { moon: 0, sun: 4, venus: 4, mercury: 4, mars: 4, jupiter: 3, saturn: 3 },
};

export const totalSpheres = (counts) => Object.values(counts).reduce((sum, n) => sum + n, 0);

/**
 * Counteracting spheres that can be drawn faithfully: one for each carrying
 * sphere this model actually constructs, except the outermost. The daily
 * rotation is deliberately not counteracted, because it is the one motion
 * every nest passes down to the next; that is why Aristotle needs one fewer
 * counteracting sphere than carrying spheres.
 *
 * This comes to 17. Aristotle's other 5 are the partners of spheres Callippus
 * added, whose axes and rates are not preserved, so they are counted in the
 * tally but never drawn: giving them a place would be invention.
 */
export const DRAWN_COUNTERACTING = Object.fromEntries(
  Object.entries(SPHERE_COUNTS.eudoxus).map(([name, carrying]) => [name, name === 'moon' ? 0 : carrying - 1]),
);

/** Aristotle's sublunary elements, as concentric shells out to the sphere of the Moon. */
const ELEMENTS = [
  { id: 'water', inner: 3.2, outer: 4.4 },
  { id: 'air', inner: 4.4, outer: 9 },
  { id: 'fire', inner: 9, outer: 14 },
];
const EARTH_RADIUS = 3.2;

/**
 * A point of the hippopede on the unit sphere, in the frame of the second
 * sphere: x toward the body's mean place, y eastward along the zodiac, z north.
 *
 * The third sphere turns about the y axis through `theta`; the fourth, whose
 * axis is inclined to it by `inclination`, turns back through the same angle.
 * Composing the two rotations on the point (1, 0, 0) gives this closed form; the
 * test suite checks it against the explicit composition.
 */
export function hippopedePoint(inclination, theta) {
  const c = cosd(theta);
  const s = sind(theta);
  const ci = cosd(inclination);
  return [c * c + s * s * ci, -s * sind(inclination), -s * c * (1 - ci)];
}

/** Axis of the fourth sphere in the same frame, carried round by the third. */
export function fourthAxis(inclination, theta) {
  return rotateY([0, cosd(inclination), sind(inclination)], theta);
}

/**
 * Orientation of a planet's innermost carrying sphere relative to its daily
 * sphere: where a point fixed in that sphere is carried. Spheres 2, 3 and 4 turn
 * through the mean longitude, theta and minus theta about their own axes, each
 * axis being fixed in the sphere outside it.
 */
export function carryingOrientation(inclination, theta, meanLongitude) {
  const axis4 = fourthAxis(inclination, 0);
  return (v) => rotateZ(rotateY(rotateAbout(v, axis4, -theta), theta), meanLongitude);
}

/**
 * Orientation of the innermost counteracting sphere relative to the daily
 * sphere. Aristotle's counteracting spheres turn about the same axes as the
 * carrying spheres at equal and opposite rates, taken in reverse order: the
 * fourth is undone first, then the third, then the second. The product is the
 * identity, so the next planet's nest inherits the daily rotation and nothing
 * else. They change no appearance; that is their whole purpose.
 *
 * `order` exists so the test suite can show that the reverse order is required.
 * Rotations do not commute, so undoing the spheres in the wrong order fails.
 */
export function counteractedOrientation(inclination, theta, meanLongitude, order = 'reverse') {
  const axis4 = fourthAxis(inclination, 0);
  const carry = carryingOrientation(inclination, theta, meanLongitude);
  const undo4 = (v) => rotateAbout(v, axis4, theta);
  const undo3 = (v) => rotateY(v, -theta);
  const undo2 = (v) => rotateZ(v, -meanLongitude);
  // A point fixed in the last counteracting sphere is acted on by the innermost
  // rotation first, so the innermost sphere's rotation is applied first here.
  const inward = order === 'reverse' ? [undo2, undo3, undo4] : [undo4, undo3, undo2];
  return (v) => carry(inward.reduce((acc, rotate) => rotate(acc), v));
}

/** Mean longitude and synodic anomaly of a planet, tropical, from the Almagest mean motions. */
function meanMotions(name, jd) {
  const d = jd - JD_NABONASSAR;
  const p = PLANETS[name];
  const sun = SUN.meanLongitudeAtEpoch + SUN.meanMotion * d;
  return {
    meanLongitude: p.followsMeanSun ? sun : p.meanLongitudeAtEpoch + p.meanMotion * d,
    anomaly: p.anomalyAtEpoch + p.anomalyMotion * d,
  };
}

/**
 * A planet on its hippopede. The retrograde sweep through the middle of the
 * figure is timed to the anomaly of 180 degrees: opposition for an outer planet,
 * inferior conjunction for an inner one.
 */
export function planetGeometry(name, jd) {
  const { radius, inclination, cycles } = SCHEME[name];
  const off = precessionToJ2000(jd);
  const { meanLongitude, anomaly } = meanMotions(name, jd);
  const theta = cycles * (anomaly - 180);
  const lon = meanLongitude + off;
  return {
    radius,
    inclination,
    theta,
    meanLongitude: lon,
    pos: scale(rotateZ(hippopedePoint(inclination, theta), lon), radius),
  };
}

export function sunGeometry(jd) {
  const off = precessionToJ2000(jd);
  const lon = SUN.meanLongitudeAtEpoch + SUN.meanMotion * (jd - JD_NABONASSAR) + off;
  return { radius: SCHEME.sun.radius, meanLongitude: lon, node: off, pos: tilt(polar(lon, SCHEME.sun.radius), off, SOLAR_DEVIATION) };
}

export function moonGeometry(jd) {
  const d = jd - JD_NABONASSAR;
  const off = precessionToJ2000(jd);
  const lon = MOON.meanLongitudeAtEpoch + MOON.meanMotion * d + off;
  // The argument of latitude is counted from the northern limit.
  const node = lon - (MOON.latitudeArgumentAtEpoch + MOON.latitudeArgumentMotion * d) - 90;
  return { radius: SCHEME.moon.radius, meanLongitude: lon, node, pos: tilt(polar(lon, SCHEME.moon.radius), node, MOON.inclination) };
}

/** Direction of the north celestial pole in the J2000 ecliptic frame. */
export function celestialPole(jd) {
  return fromLonLat(90 + precessionToJ2000(jd), 90 - OBLIQUITY);
}

/** A great circle of the given radius whose plane is perpendicular to `axis`, starting at `start`. */
function equatorOf(id, body, role, axis, start, radius) {
  const u = normalize(start);
  return circle(id, body, role, ORIGIN, radius, u, cross(axis, u));
}

function axisOf(id, body, axis, radius) {
  return line(id, body, 'axis', scale(axis, -radius), scale(axis, radius));
}

/**
 * @param {object} config
 * @param {string} config.id
 * @param {boolean} [config.aristotle] Aristotle's physical cosmos rather than
 *   Eudoxus's geometrical one. This adds the solid shells, the sublunary
 *   elements, and the counteracting spheres that can be drawn faithfully (see
 *   DRAWN_COUNTERACTING).
 *
 *   The planets move exactly as in Eudoxus's model, and that is correct rather
 *   than an approximation as far as the counteracting spheres go: they cancel
 *   motions and alter no appearance. It is an approximation with respect to
 *   Callippus, whose seven additional carrying spheres are included in the
 *   reported counts but are neither drawn nor given any effect, because what
 *   they did is not preserved.
 */
export function createHomocentricModel({ id, aristotle = false }) {
  const carrying = aristotle ? SPHERE_COUNTS.callippus : SPHERE_COUNTS.eudoxus;
  const counteracting = aristotle ? SPHERE_COUNTS.counteracting : null;

  function planetGuides(name, g, pole) {
    const guides = [];
    const lon = g.meanLongitude;
    const toward = polar(lon);
    const r4 = g.radius;
    const r3 = g.radius + SPHERE_GAP;
    const r2 = g.radius + 2 * SPHERE_GAP;
    const r1 = g.radius + 3 * SPHERE_GAP;

    // 1. Daily rotation about the celestial pole.
    guides.push(equatorOf(`${name}-s1`, name, 'sphere-daily', pole, cross(pole, Z), r1));
    // 2. Passage round the zodiac, about the pole of the ecliptic.
    guides.push(circle(`${name}-s2`, name, 'sphere-zodiacal', ORIGIN, r2));
    // 3. Axis lying in the ecliptic, a quarter turn from the mean place.
    const axis3 = polar(lon + 90);
    guides.push(equatorOf(`${name}-s3`, name, 'sphere-third', axis3, toward, r3));
    guides.push(axisOf(`${name}-s3-axis`, name, axis3, r3));
    // 4. Axis inclined to the third sphere's, and carried round by it.
    const axis4 = rotateZ(fourthAxis(g.inclination, g.theta), lon);
    guides.push(equatorOf(`${name}-s4`, name, 'sphere-fourth', axis4, g.pos, r4));
    guides.push(axisOf(`${name}-s4-axis`, name, axis4, r4));

    const figure = [];
    for (let i = 0; i < 120; i += 1) figure.push(scale(rotateZ(hippopedePoint(g.inclination, i * 3), lon), r4));
    guides.push(polyline(`${name}-hippopede`, name, 'hippopede', figure, true));
    guides.push(point(`${name}-mean`, name, 'mean', scale(toward, r4), 'mean place'));

    if (aristotle) {
      // Below the nest, undoing the fourth sphere, then the third, then the
      // second. Each shares its partner's axis, so its equator is parallel.
      const below = (j) => g.radius - j * SPHERE_GAP;
      guides.push(equatorOf(`${name}-c4`, name, 'sphere-counteracting', axis4, g.pos, below(1)));
      guides.push(equatorOf(`${name}-c3`, name, 'sphere-counteracting', axis3, toward, below(2)));
      guides.push(circle(`${name}-c2`, name, 'sphere-counteracting', ORIGIN, below(3)));
    }
    return guides;
  }

  /** The Sun and Moon have three spheres: daily, a slow one, and the one carrying the body. */
  function luminaryGuides(name, g, pole) {
    const r3 = g.radius;
    const r2 = g.radius + SPHERE_GAP;
    const r1 = g.radius + 2 * SPHERE_GAP;
    const axis3 = tilt(Z, g.node, name === 'moon' ? MOON.inclination : SOLAR_DEVIATION);
    const guides = [
      equatorOf(`${name}-s1`, name, 'sphere-daily', pole, cross(pole, Z), r1),
      circle(`${name}-s2`, name, 'sphere-zodiacal', ORIGIN, r2),
      equatorOf(`${name}-s3`, name, 'sphere-third', axis3, g.pos, r3),
      axisOf(`${name}-s3-axis`, name, axis3, r3),
    ];
    // Nothing lies below the Moon that its motions could disturb, so Aristotle
    // gives it no counteracting spheres.
    if (aristotle && DRAWN_COUNTERACTING[name] > 0) {
      guides.push(equatorOf(`${name}-c3`, name, 'sphere-counteracting', axis3, g.pos, r3 - SPHERE_GAP));
      guides.push(circle(`${name}-c2`, name, 'sphere-counteracting', ORIGIN, r3 - 2 * SPHERE_GAP));
    }
    return guides;
  }

  return {
    id,
    units: 'schematic',
    center: 'earth',
    earthShape: 'sphere',
    earthRadius: EARTH_RADIUS,
    diurnal: 'optional',
    skyFrame: 'ecliptic',
    bodyOrder: HOMOCENTRIC_ORDER,
    starRadius: STAR_RADIUS,
    frameRadius: STAR_RADIUS,
    sphereCounts: { carrying, counteracting },
    /**
     * What the on-screen tally should say. `notModelled` spheres are part of the
     * historical count but have no known function, so they are never drawn.
     */
    sphereTally: aristotle
      ? {
          carrying: totalSpheres(SPHERE_COUNTS.callippus),
          counteracting: totalSpheres(SPHERE_COUNTS.counteracting),
          total: totalSpheres(SPHERE_COUNTS.callippus) + totalSpheres(SPHERE_COUNTS.counteracting),
          drawnCounteracting: totalSpheres(DRAWN_COUNTERACTING),
          notModelled: {
            callippusCarrying: totalSpheres(SPHERE_COUNTS.callippus) - totalSpheres(SPHERE_COUNTS.eudoxus),
            counteracting: totalSpheres(SPHERE_COUNTS.counteracting) - totalSpheres(DRAWN_COUNTERACTING),
          },
        }
      : {
          carrying: totalSpheres(SPHERE_COUNTS.eudoxus),
          counteracting: 0,
          total: totalSpheres(SPHERE_COUNTS.eudoxus) + 1,
          drawnCounteracting: 0,
          notModelled: { callippusCarrying: 0, counteracting: 0 },
        },

    observer() {
      return ORIGIN;
    },

    state(jd, { guides: wantGuides = true } = {}) {
      const bodies = { earth: { pos: ORIGIN } };
      const guides = [];
      const pole = celestialPole(jd);

      const sun = sunGeometry(jd);
      const moon = moonGeometry(jd);
      bodies.sun = { pos: sun.pos };
      bodies.moon = { pos: moon.pos };
      if (wantGuides) {
        guides.push(...luminaryGuides('sun', sun, pole), ...luminaryGuides('moon', moon, pole));
      }

      for (const name of Object.keys(PLANETS)) {
        const g = planetGeometry(name, jd);
        bodies[name] = { pos: g.pos };
        if (wantGuides) guides.push(...planetGuides(name, g, pole));
      }

      if (wantGuides) {
        guides.push(axisOf('celestial-axis', null, pole, STAR_RADIUS));
        if (aristotle) {
          // Contiguous solid shells: Aristotle's cosmos has no void anywhere.
          const half = 6;
          for (const name of HOMOCENTRIC_ORDER) {
            guides.push(shell(`${name}-shell`, name, 'crystalline', SCHEME[name].radius - half, SCHEME[name].radius + half));
          }
          guides.push(shell('stars-shell', null, 'crystalline', SCHEME.saturn.radius + half, STAR_RADIUS));
          for (const element of ELEMENTS) {
            guides.push(shell(`element-${element.id}`, null, `element-${element.id}`, element.inner, element.outer));
          }
        }
      }

      return { bodies, guides };
    },
  };
}
