/**
 * The heliocentric family: Copernicus, Tycho Brahe and Kepler.
 *
 * One set of mean motions (the modern elements in data/elements.js) drives all
 * three, so that differences on screen come from the geometry each astronomer
 * assumed and not from differently fitted tables:
 *
 *  - `circles`: Copernicus. Uniform circular motion only. Each planet rides a
 *    circle eccentric to the Sun and a small epicyclet that does the work of
 *    Ptolemy's equant. Orbit radii are Copernicus's own.
 *  - `ellipses`: Kepler. An ellipse with the Sun at one focus, swept according to
 *    the area law.
 *
 * Setting `center` to 'earth' re-expresses the circular model about a stationary
 * Earth, which is exactly Tycho's system: the Sun circles the Earth and carries
 * the planets' orbits with it. Nothing else changes, which is the point.
 *
 * Distances are in astronomical units, in the J2000 ecliptic frame. See
 * docs/SOURCES.md for the simplifications, notably that the planetary circles
 * are referred to the true Sun rather than to Copernicus's mean Sun.
 */
import { DEG, atan2d, cosd, sind, wrap180, wrap360 } from '../core/angles.js';
import { DAYS_PER_CENTURY, JD_J2000, precessionToJ2000 } from '../core/time.js';
import { add, cross, fromLonLat, normalize, polar, rotateZ, scale, tilt } from '../core/vec.js';
import {
  COMET,
  COPERNICAN_RADII,
  JPL_ELEMENTS,
  KM_PER_AU,
  MOON_MEAN,
  SATELLITES,
  SATURN_RING,
} from '../data/elements.js';
import { circle, line, point, polyline, translateGuide } from './guides.js';

const ORIGIN = [0, 0, 0];
const X = [1, 0, 0];
const Y = [0, 1, 0];
const Z = [0, 0, 1];
const PLANET_NAMES = ['mercury', 'venus', 'mars', 'jupiter', 'saturn'];

/** Mean daily motion, degrees, of a body at one astronomical unit (the Gaussian constant). */
const GAUSSIAN_DEG_PER_DAY = 0.9856076686;

/** Osculating mean elements of a planet at a Julian day. Angles in degrees. */
export function elementsAt(name, jd) {
  const T = (jd - JD_J2000) / DAYS_PER_CENTURY;
  const el = JPL_ELEMENTS[name];
  const at = ([value, rate]) => value + rate * T;
  return { a: at(el.a), e: at(el.e), I: at(el.I), L: at(el.L), peri: at(el.peri), node: at(el.node) };
}

/**
 * Solves Kepler's equation E - e sin E = M for the eccentric anomaly.
 * Newton's method started from pi converges for every M in [-pi, pi] and every
 * e < 1, which matters for the comet's very elongated orbit.
 * @param {number} M mean anomaly in radians, any value
 * @param {number} e eccentricity, 0 <= e < 1
 */
export function solveKepler(M, e) {
  const m = wrap180(M / DEG) * DEG;
  let E = e < 0.8 ? m : Math.PI * Math.sign(m || 1);
  for (let i = 0; i < 60; i += 1) {
    const delta = (E - e * Math.sin(E) - m) / (1 - e * Math.cos(E));
    E -= delta;
    if (Math.abs(delta) < 1e-13) break;
  }
  return E;
}

/** Position in the orbital plane, x toward perihelion, for given elements and mean anomaly (deg). */
function ellipsePoint(a, e, meanAnomalyDeg) {
  const E = solveKepler(meanAnomalyDeg * DEG, e);
  return [a * (Math.cos(E) - e), a * Math.sqrt(1 - e * e) * Math.sin(E), 0];
}

/** Orients an orbital-plane vector (x toward perihelion) into the ecliptic frame. */
function orient(v, el) {
  return tilt(rotateZ(v, el.peri), el.node, el.I);
}

/** Heliocentric position on Kepler's ellipse. */
export function keplerPosition(name, jd) {
  const el = elementsAt(name, jd);
  return orient(ellipsePoint(el.a, el.e, el.L - el.peri), el);
}

/** The full ellipse as a closed polyline, and its empty focus. */
function keplerOrbit(el, segments = 160) {
  const b = el.a * Math.sqrt(1 - el.e * el.e);
  const points = [];
  for (let i = 0; i < segments; i += 1) {
    const E = (2 * Math.PI * i) / segments;
    points.push(orient([el.a * (Math.cos(E) - el.e), b * Math.sin(E), 0], el));
  }
  return { points, emptyFocus: orient([-2 * el.a * el.e, 0, 0], el) };
}

/**
 * Copernicus's construction for a planet. With e the eccentricity, the circle's
 * centre D lies 3e/2 from the Sun toward the aphelion, the epicyclet centre C
 * moves uniformly round D at the mean rate, and the planet turns on an epicyclet
 * of radius e/2 at twice that rate. The result follows an equant to first order
 * in e while using uniform circular motions only.
 */
export function copernicanGeometry(name, jd) {
  const el = elementsAt(name, jd);
  const a = COPERNICAN_RADII[name];
  const inPlane = (v) => tilt(v, el.node, el.I);
  const eccentricCentre = polar(el.peri + 180, 1.5 * el.e * a);
  const epicycletCentre = add(eccentricCentre, polar(el.L, a));
  const planet = add(epicycletCentre, polar(2 * el.L - el.peri, 0.5 * el.e * a));
  return {
    a,
    e: el.e,
    epicycletRadius: 0.5 * el.e * a,
    pos: inPlane(planet),
    eccentricCentre: inPlane(eccentricCentre),
    epicycletCentre: inPlane(epicycletCentre),
    basis: { u: inPlane(X), v: inPlane(Y) },
  };
}

/**
 * The Earth in the circular model: a plain eccentric, as Hipparchus had used for
 * the Sun. The circle's centre is the "mean Sun". A plain eccentric needs twice
 * the true eccentricity to give the right inequality in longitude, and so
 * doubles the true variation in distance; that defect is historical.
 */
export function copernicanEarth(jd) {
  const el = elementsAt('earth', jd);
  const a = COPERNICAN_RADII.earth;
  const centre = polar(el.peri + 180, 2 * el.e * a);
  return { a, centre, pos: add(centre, polar(el.L, a)) };
}

/**
 * The Moon relative to the Earth, in astronomical units.
 * `circles` uses a deferent and one epicycle; `ellipses` uses Kepler's ellipse.
 * The mean elements are referred to the equinox of date, so precession is added.
 */
export function moonOffset(jd, orbits) {
  const d = jd - JD_J2000;
  const off = precessionToJ2000(jd);
  const L = MOON_MEAN.L[0] + MOON_MEAN.L[1] * d + off;
  const M = MOON_MEAN.M[0] + MOON_MEAN.M[1] * d;
  const F = MOON_MEAN.F[0] + MOON_MEAN.F[1] * d;
  const perigee = L - M;
  const node = L - F;
  const a = MOON_MEAN.semiMajorAxisAu;
  const e = MOON_MEAN.eccentricity;
  const inPlane = (v) => tilt(v, node, MOON_MEAN.inclination);

  if (orbits === 'ellipses') {
    // The guide is built from exactly the elements that place the Moon, so the
    // Moon always lies on its own drawn orbit. The ellipse turns quickly (the
    // perigee advances in under nine years), so it is rebuilt on every call.
    const b = a * Math.sqrt(1 - e * e);
    const segments = 96;
    const orbit = [];
    for (let i = 0; i < segments; i += 1) {
      const E = (2 * Math.PI * i) / segments;
      orbit.push(inPlane(rotateZ([a * (Math.cos(E) - e), b * Math.sin(E), 0], perigee)));
    }
    return {
      pos: inPlane(rotateZ(ellipsePoint(a, e, M), perigee)),
      a,
      e,
      perigee,
      orbit,
      basis: { u: inPlane(X), v: inPlane(Y) },
    };
  }
  // An epicycle of radius 2e, turning backwards with the anomaly, reproduces the
  // Moon's principal inequality. The Moon is at the epicycle's apogee when the
  // anomaly counted from perigee is 180 degrees.
  const epicycleRadius = 2 * e * a;
  const epicycleCentre = polar(L, a);
  const planePos = add(epicycleCentre, polar(L - (M + 180), epicycleRadius));
  return {
    pos: inPlane(planePos),
    a,
    epicycleRadius,
    epicycleCentre: inPlane(epicycleCentre),
    basis: { u: inPlane(X), v: inPlane(Y) },
  };
}

/** Orthonormal basis of the plane whose north pole has the given ecliptic coordinates. */
function planeBasisFromPole(poleLongitude, poleLatitude) {
  const n = fromLonLat(poleLongitude, poleLatitude);
  const u = normalize(cross(Z, n));
  return { u, v: cross(n, u), n };
}

/** Saturn's ring plane; Titan orbits within it. */
export const RING_BASIS = planeBasisFromPole(SATURN_RING.poleLongitude, SATURN_RING.poleLatitude);

/** Jupiter's moons orbit close to the ecliptic; a small fixed tilt stands in for the true plane. */
const JOVIAN_BASIS = { u: tilt(X, 100, 2), v: tilt(Y, 100, 2) };

const SATELLITE_BASIS = { jupiter: JOVIAN_BASIS, saturn: RING_BASIS };

/** A satellite's offset from its planet, in astronomical units. */
function satelliteOffset(planet, sat, jd) {
  const basis = SATELLITE_BASIS[planet];
  const angle = sat.phase + (360 * (jd - JD_J2000)) / sat.periodDays;
  const r = sat.distanceKm / KM_PER_AU;
  return add(scale(basis.u, r * cosd(angle)), scale(basis.v, r * sind(angle)));
}

/** Heliocentric position of the comet on its elongated ellipse. */
export function cometPosition(jd) {
  const meanMotion = GAUSSIAN_DEG_PER_DAY / COMET.a ** 1.5;
  const M = meanMotion * (jd - COMET.perihelionJd);
  const plane = ellipsePoint(COMET.a, COMET.e, M);
  // Here the argument of perihelion is given directly, so orient with it.
  return tilt(rotateZ(plane, COMET.argPeri + COMET.node), COMET.node, COMET.I);
}

function cometOrbit(segments = 240) {
  const b = COMET.a * Math.sqrt(1 - COMET.e * COMET.e);
  const points = [];
  for (let i = 0; i < segments; i += 1) {
    // Sample more densely near perihelion, where the curve turns sharply.
    const E = Math.PI * Math.sign(i - segments / 2) * (Math.abs(i - segments / 2) / (segments / 2)) ** 1.6;
    const p = [COMET.a * (Math.cos(E) - COMET.e), b * Math.sin(E), 0];
    points.push(tilt(rotateZ(p, COMET.argPeri + COMET.node), COMET.node, COMET.I));
  }
  return points;
}

/**
 * The sector a planet's radius vector has swept over the recent past, as a fan
 * of points from the Sun. Equal times give equal areas: the fan is short and
 * wide near perihelion, long and thin near aphelion.
 */
function sweptSector(name, jd, steps = 18) {
  const periodDays = 360 / (JPL_ELEMENTS[name].L[1] / DAYS_PER_CENTURY);
  const span = periodDays / 14;
  const points = [];
  for (let i = 0; i <= steps; i += 1) points.push(keplerPosition(name, jd - span + (span * i) / steps));
  return points;
}

/**
 * @param {object} config
 * @param {string} config.id
 * @param {'circles'|'ellipses'} config.orbits
 * @param {'sun'|'earth'} config.center which body is at rest at the origin
 * @param {number} config.starRadius distance of the stellar sphere, au
 * @param {{jupiterMoons?: boolean, titan?: boolean, comet?: boolean}} [config.features]
 */
export function createHeliocentricModel({ id, orbits, center, starRadius, features = {} }) {
  if (orbits === 'ellipses' && center === 'earth') {
    throw new Error('A geocentric model with elliptical orbits was never proposed and is not supported.');
  }
  const staticCometOrbit = features.comet ? cometOrbit() : null;

  // The comet's ellipse is some sixty times longer than it is from the Sun at
  // perihelion. Seen from the usual direction it happens to point almost straight
  // away from the viewer and looks no bigger than Saturn's orbit, which hides the
  // very thing it is there to show. So where there is a comet, the default view
  // is taken broadside to its long axis, and the model says how much must be
  // visible for the ellipse to be seen whole. Both are derived from the orbit,
  // so they cannot drift from the elements. Turning that into a camera distance
  // is the stage's business: it depends on the shape of the viewport, which a
  // model knows nothing about.
  let cometFraming = null;
  if (staticCometOrbit) {
    const aphelion = staticCometOrbit.reduce((far, p) => (Math.hypot(...p) > Math.hypot(...far) ? p : far));
    const aphelionLongitude = atan2d(aphelion[1], aphelion[0]);
    // Two steps, written out because together they happen to cancel. To see the
    // ellipse side-on the camera stands a quarter turn round from the aphelion.
    // The stage then wants an azimuth, and it places the camera at model
    // longitude (azimuth - 90). So the azimuth comes out equal to the aphelion's
    // own longitude, which looks like a mistake unless the steps are shown.
    const cameraLongitude = aphelionLongitude - 90;
    const azimuth = cameraLongitude + 90;
    cometFraming = {
      aphelionLongitude: wrap360(aphelionLongitude),
      defaultView: { azimuth: wrap360(azimuth), elevation: 40 },
      // Sets the scale of the scene. Chosen so that Saturn's orbit stays a
      // readable size while the ellipse still fits a wide window at the usual standoff.
      frameRadius: Math.hypot(...aphelion) * 0.62,
      /** With the Sun at the centre of the view, the ellipse reaches this far to one side. */
      fitHalfWidth: Math.hypot(...aphelion),
    };
  }

  function addSatellites(bodies, guides, planet, jd, wantGuides) {
    const planetPos = bodies[planet].pos;
    const basis = SATELLITE_BASIS[planet];
    for (const sat of SATELLITES[planet]) {
      bodies[sat.id] = { pos: add(planetPos, satelliteOffset(planet, sat, jd)), parent: planet };
      if (wantGuides) {
        guides.push(circle(`${sat.id}-orbit`, planet, 'satellite-orbit', planetPos, sat.distanceKm / KM_PER_AU, basis.u, basis.v));
      }
    }
  }

  return {
    id,
    units: 'au',
    center,
    earthShape: 'sphere',
    diurnal: center === 'earth' ? 'optional' : 'earth',
    skyFrame: 'ecliptic',
    bodyOrder: center === 'earth' ? ['moon', 'sun', 'mercury', 'venus', 'mars', 'jupiter', 'saturn'] : ['sun', 'mercury', 'venus', 'earth', 'moon', 'mars', 'jupiter', 'saturn'],
    starRadius,
    frameRadius: cometFraming ? cometFraming.frameRadius : 11,
    ...(cometFraming
      ? { defaultView: cometFraming.defaultView, fitHalfWidth: cometFraming.fitHalfWidth, cometAphelionLongitude: cometFraming.aphelionLongitude }
      : {}),

    observer(jd) {
      if (center === 'earth') return ORIGIN;
      return orbits === 'ellipses' ? keplerPosition('earth', jd) : copernicanEarth(jd).pos;
    },

    /**
     * @param {number} jd Julian day
     * @param {{guides?: boolean, selected?: string|null}} opts
     */
    state(jd, { guides: wantGuides = true, selected = null } = {}) {
      const bodies = { sun: { pos: ORIGIN } };
      let guides = [];

      // The Earth and its Moon.
      let earthPos;
      if (orbits === 'ellipses') {
        earthPos = keplerPosition('earth', jd);
        if (wantGuides) {
          const el = elementsAt('earth', jd);
          const orbit = keplerOrbit(el);
          const g = polyline('earth-orbit', 'earth', 'orbit', orbit.points, true);
          g.version = Math.floor(jd / 3652.5);
          guides.push(g);
        }
      } else {
        const earth = copernicanEarth(jd);
        earthPos = earth.pos;
        if (wantGuides) {
          guides.push(circle('earth-orbit', 'earth', 'orbit', earth.centre, earth.a));
          guides.push(point('earth-orbit-centre', 'earth', 'centre', earth.centre, 'centre of the Earth\'s circle (the mean Sun)'));
        }
      }
      bodies.earth = { pos: earthPos };

      const moon = moonOffset(jd, orbits);
      bodies.moon = { pos: add(earthPos, moon.pos), parent: 'earth' };
      if (wantGuides) {
        if (moon.orbit) {
          guides.push(polyline('moon-orbit', 'moon', 'orbit', moon.orbit.map((p) => add(earthPos, p)), true));
        } else {
          guides.push(circle('moon-orbit', 'moon', 'deferent', earthPos, moon.a, moon.basis.u, moon.basis.v));
        }
        if (moon.epicycleCentre) {
          const c = add(earthPos, moon.epicycleCentre);
          guides.push(circle('moon-epicycle', 'moon', 'epicycle', c, moon.epicycleRadius, moon.basis.u, moon.basis.v));
          guides.push(line('moon-epicycle-arm', 'moon', 'arm', c, bodies.moon.pos));
        }
      }

      // The planets.
      for (const name of PLANET_NAMES) {
        if (orbits === 'ellipses') {
          const pos = keplerPosition(name, jd);
          bodies[name] = { pos };
          if (wantGuides) {
            const el = elementsAt(name, jd);
            const orbit = keplerOrbit(el);
            const g = polyline(`${name}-orbit`, name, 'orbit', orbit.points, true);
            g.version = Math.floor(jd / 3652.5);
            guides.push(g);
            guides.push(line(`${name}-radius-vector`, name, 'radius-vector', ORIGIN, pos));
            guides.push(point(`${name}-empty-focus`, name, 'focus', orbit.emptyFocus, 'empty focus'));
            if (selected === name) {
              guides.push({ type: 'fan', id: `${name}-swept`, body: name, role: 'swept-area', apex: ORIGIN, points: sweptSector(name, jd) });
            }
          }
        } else {
          const g = copernicanGeometry(name, jd);
          bodies[name] = { pos: g.pos };
          if (wantGuides) {
            guides.push(circle(`${name}-orbit`, name, 'orbit', g.eccentricCentre, g.a, g.basis.u, g.basis.v));
            guides.push(circle(`${name}-epicyclet`, name, 'epicyclet', g.epicycletCentre, g.epicycletRadius, g.basis.u, g.basis.v));
            guides.push(point(`${name}-orbit-centre`, name, 'centre', g.eccentricCentre, 'centre of the eccentric circle'));
            guides.push(line(`${name}-arm`, name, 'arm', g.eccentricCentre, g.epicycletCentre));
          }
        }
      }

      if (features.jupiterMoons) addSatellites(bodies, guides, 'jupiter', jd, wantGuides);
      if (features.titan) addSatellites(bodies, guides, 'saturn', jd, wantGuides);

      if (features.comet) {
        bodies.comet = { pos: cometPosition(jd) };
        if (wantGuides) {
          const g = polyline('comet-orbit', 'comet', 'orbit', staticCometOrbit, true);
          g.version = 0;
          guides.push(g);
        }
      }

      // Tycho: the same arrangement referred to a stationary Earth.
      if (center === 'earth') {
        const shift = scale(earthPos, -1);
        const earthCircle = copernicanEarth(jd);
        for (const body of Object.values(bodies)) body.pos = add(body.pos, shift);
        guides = guides
          .filter((g) => g.id !== 'earth-orbit' && g.id !== 'earth-orbit-centre')
          .map((g) => translateGuide(g, shift));
        if (wantGuides) {
          guides.push(circle('sun-orbit', 'sun', 'orbit', scale(earthCircle.centre, -1), earthCircle.a));
          guides.push(line('sun-arm', 'sun', 'arm', ORIGIN, bodies.sun.pos));
        }
      }

      return { bodies, guides };
    },
  };
}
