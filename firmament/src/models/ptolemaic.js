/**
 * The Ptolemaic family of models: eccentric deferents, epicycles and the equant.
 *
 * One construction serves two eras. With every device enabled it is the system
 * of the Almagest. With the equant, the planetary eccentrics and the lunar crank
 * switched off it is the earlier geometry of Apollonius and Hipparchus, in which
 * only the Sun rides an eccentric and each planet has a bare concentric deferent
 * and epicycle.
 *
 * Constants and conventions are documented in docs/SOURCES.md. Distances are in
 * Earth radii. Ancient longitudes are tropical; every absolute longitude has the
 * accumulated precession added so that positions land in the J2000 frame in
 * which the stars are fixed.
 */
import { cosd, sind } from '../core/angles.js';
import { JD_NABONASSAR, precessionToJ2000 } from '../core/time.js';
import { add, length, polar, tilt } from '../core/vec.js';
import { MOON, PLANETS, PTOLEMAIC_ORDER, PTOLEMY_PRECESSION_PER_DAY, SUN } from '../data/almagest.js';
import { annulus, circle, line, point } from './guides.js';

/**
 * Fixed directions of the inner planets' epicycle nodes, J2000 ecliptic
 * longitude. Ptolemy made these epicycles rock; holding the plane fixed in space
 * is the simplification described in docs/SOURCES.md.
 */
const INNER_EPICYCLE_NODE = { venus: 76.68, mercury: 48.33 };

const X = [1, 0, 0];
const Y = [0, 1, 0];
const ORIGIN = [0, 0, 0];

/** Days since the epoch of Ptolemy's tables. */
const daysSinceEpoch = (jd) => jd - JD_NABONASSAR;

/** Mean longitude of the Sun, tropical, degrees. */
export function meanSunLongitude(jd) {
  return SUN.meanLongitudeAtEpoch + SUN.meanMotion * daysSinceEpoch(jd);
}

/**
 * The Sun on its eccentric circle: uniform motion about a centre displaced from
 * the Earth toward the apogee. There is no epicycle and no equant.
 */
export function sunGeometry(jd) {
  const off = precessionToJ2000(jd);
  const R = SUN.deferentEarthRadii;
  const centre = polar(SUN.apogee + off, SUN.eccentricity * R);
  const pos = add(centre, polar(meanSunLongitude(jd) + off, R));
  return { pos, centre, radius: R };
}

/**
 * A planet's geometry in the plane of its deferent, before any inclination.
 *
 * With the equant, the epicycle centre C lies on the deferent (radius R about D,
 * which is e from the Earth toward the apogee) where the line from the equant Q
 * (2e from the Earth) at the mean longitude meets it. The planet then sits on
 * the epicycle at the mean anomaly counted from the line Q-to-C.
 *
 * Mercury's deferent centre is not fixed: it revolves on a small circle, in the
 * opposite sense to the epicycle centre and at the same rate.
 *
 * The two switches are independent for every planet. `eccentric` without
 * `equant` gives a plain eccentric: uniform motion about the deferent's own
 * centre, the device Hipparchus used for the Sun. That holds for Mercury too.
 * Mercury's crank is a refinement of the equant construction and has no meaning
 * without it, so it operates only when both switches are on; no historical
 * model pairs the crank with equant-free motion, and none is invented here.
 *
 * @returns tropical-frame quantities in degrees and Earth radii
 */
export function planetPlaneGeometry(name, jd, { equant = true, eccentric = true } = {}) {
  const p = PLANETS[name];
  const d = daysSinceEpoch(jd);
  const R = p.deferentEarthRadii;
  const e = eccentric ? p.eccentricity * R : 0;
  const r = p.epicycle * R;

  const meanLongitude = p.followsMeanSun ? meanSunLongitude(jd) : p.meanLongitudeAtEpoch + p.meanMotion * d;
  const anomaly = p.anomalyAtEpoch + p.anomalyMotion * d;
  const apogee = p.apogeeAtEpoch + PTOLEMY_PRECESSION_PER_DAY * d;
  /** Mean eccentric anomaly: the epicycle centre's mean longitude counted from the apogee. */
  const k = meanLongitude - apogee;

  let equantDistance;
  let deferentCentre;
  let crankCentre = null;
  let rho;

  if (p.crank && eccentric && equant) {
    // Mercury: equant at e, crank circle of radius e centred at 2e, and the
    // deferent centre carried round it backwards through the angle k.
    equantDistance = e;
    crankCentre = polar(apogee, 2 * e);
    deferentCentre = add(crankCentre, polar(apogee - k, e));
    rho = e * (cosd(k) + cosd(2 * k)) + Math.sqrt(R * R - (e * (sind(k) + sind(2 * k))) ** 2);
  } else {
    equantDistance = equant ? 2 * e : e;
    deferentCentre = polar(apogee, e);
    const gap = equantDistance - e;
    rho = -gap * cosd(k) + Math.sqrt(R * R - (gap * sind(k)) ** 2);
  }

  const equantPoint = polar(apogee, equantDistance);
  const epicycleCentre = add(equantPoint, polar(meanLongitude, rho));
  const epicycleVector = polar(meanLongitude + anomaly, r);

  return {
    R,
    e,
    r,
    apogee,
    meanLongitude,
    anomaly,
    k,
    equantPoint,
    deferentCentre,
    crankCentre,
    epicycleCentre,
    epicycleVector,
  };
}

/** Rotates a tropical-frame plane vector into the J2000 frame. */
function toJ2000(v, off) {
  const c = cosd(off);
  const s = sind(off);
  return [c * v[0] - s * v[1], s * v[0] + c * v[1], v[2]];
}

/**
 * A planet in space. The outer planets have an inclined deferent with the
 * epicycle kept parallel to the ecliptic; the inner planets have a flat deferent
 * and an inclined epicycle.
 */
export function planetGeometry(name, jd, options = {}) {
  const p = PLANETS[name];
  const off = precessionToJ2000(jd);
  const g = planetPlaneGeometry(name, jd, options);

  let deferentNode = 0;
  let deferentInclination = 0;
  if (p.deferentInclination !== undefined) {
    // The northern limit lies at (apogee - offset); the ascending node is 90
    // degrees before it.
    deferentNode = g.apogee - p.northernLimitOffset - 90 + off;
    deferentInclination = p.deferentInclination;
  }
  const inDeferentPlane = (v) => tilt(toJ2000(v, off), deferentNode, deferentInclination);

  const epicycleNode = INNER_EPICYCLE_NODE[name] ?? 0;
  const epicycleInclination = p.epicycleInclination ?? 0;
  const inEpicyclePlane = (v) => tilt(v, epicycleNode, epicycleInclination);

  const epicycleCentre = inDeferentPlane(g.epicycleCentre);
  const pos = add(epicycleCentre, inEpicyclePlane(toJ2000(g.epicycleVector, off)));

  return {
    ...g,
    pos,
    epicycleCentre,
    equantPoint: inDeferentPlane(g.equantPoint),
    deferentCentre: inDeferentPlane(g.deferentCentre),
    crankCentre: g.crankCentre ? inDeferentPlane(g.crankCentre) : null,
    deferentBasis: { u: inDeferentPlane(X), v: inDeferentPlane(Y) },
    epicycleBasis: { u: inEpicyclePlane(X), v: inEpicyclePlane(Y) },
  };
}

/**
 * The Moon. In the Almagest the centre of the lunar deferent is itself carried
 * round the Earth, so that the epicycle is drawn in toward the Earth at the
 * quadratures and its apparent size, and the Moon's inequality, swell. Without
 * the crank this is the single-anomaly model attributed to Hipparchus.
 *
 * Ptolemy's prosneusis is omitted: anomaly is counted from the epicycle's true
 * apogee as seen from the Earth.
 */
export function moonGeometry(jd, { lunarCrank = true } = {}) {
  const d = daysSinceEpoch(jd);
  const off = precessionToJ2000(jd);
  const meanLongitude = MOON.meanLongitudeAtEpoch + MOON.meanMotion * d;
  const anomaly = MOON.anomalyAtEpoch + MOON.anomalyMotion * d;
  const elongation = MOON.elongationAtEpoch + MOON.elongationMotion * d;
  const latitudeArgument = MOON.latitudeArgumentAtEpoch + MOON.latitudeArgumentMotion * d;

  const eFraction = lunarCrank ? MOON.eccentricity : 0;
  // Scale so that the epicycle centre stands at the syzygy distance when the
  // elongation is zero, where it is farthest from the Earth.
  const R = MOON.syzygyDistanceEarthRadii / (1 + eFraction);
  const e = eFraction * R;
  const r = MOON.epicycle * R;

  // The deferent's apogee lies twice the elongation behind the epicycle centre.
  const doubleElongation = 2 * elongation;
  const deferentCentre = polar(meanLongitude - doubleElongation, e);
  const rho = e * cosd(doubleElongation) + Math.sqrt(R * R - (e * sind(doubleElongation)) ** 2);
  const epicycleCentre = polar(meanLongitude, rho);
  // The Moon moves on its epicycle in the opposite sense to the planets.
  const planePos = add(epicycleCentre, polar(meanLongitude - anomaly, r));

  // The argument of latitude is counted from the northern limit.
  const node = meanLongitude - latitudeArgument - 90 + off;
  const inPlane = (v) => tilt(toJ2000(v, off), node, MOON.inclination);

  return {
    R,
    e,
    r,
    elongation,
    pos: inPlane(planePos),
    epicycleCentre: inPlane(epicycleCentre),
    deferentCentre: inPlane(deferentCentre),
    basis: { u: inPlane(X), v: inPlane(Y) },
  };
}

/**
 * Least and greatest distance from the Earth that a body reaches, found by
 * sampling a full cycle of the slow motion. Used to draw each body's shell.
 */
function shellBounds(name, options) {
  let min = Infinity;
  let max = -Infinity;
  const samples = 360;
  if (name === 'sun') {
    const R = SUN.deferentEarthRadii;
    return { min: R * (1 - SUN.eccentricity), max: R * (1 + SUN.eccentricity) };
  }
  if (name === 'moon') {
    // Half a synodic month sweeps the double elongation through a full turn.
    const halfMonth = 180 / MOON.elongationMotion;
    for (let i = 0; i < samples; i += 1) {
      const g = moonGeometry(JD_NABONASSAR + (halfMonth * i) / samples, options);
      const centre = length(g.epicycleCentre);
      min = Math.min(min, centre - g.r);
      max = Math.max(max, centre + g.r);
    }
    return { min, max };
  }
  const p = PLANETS[name];
  const slowRate = p.followsMeanSun ? SUN.meanMotion : p.meanMotion;
  const period = 360 / slowRate;
  for (let i = 0; i < samples; i += 1) {
    const g = planetPlaneGeometry(name, JD_NABONASSAR + (period * i) / samples, options);
    const centre = length(g.epicycleCentre);
    min = Math.min(min, centre - g.r);
    max = Math.max(max, centre + g.r);
  }
  return { min, max };
}

const PLANET_NAMES = ['mercury', 'venus', 'mars', 'jupiter', 'saturn'];

/**
 * @param {object} config
 * @param {string} config.id model identifier
 * @param {boolean} config.equant whether planets move uniformly about an equant
 * @param {boolean} config.eccentric whether planetary deferents are eccentric
 * @param {boolean} config.lunarCrank whether the lunar deferent centre revolves
 */
export function createPtolemaicModel({ id, equant = true, eccentric = true, lunarCrank = true }) {
  const options = { equant, eccentric, lunarCrank };
  const shells = Object.fromEntries(PTOLEMAIC_ORDER.map((name) => [name, shellBounds(name, options)]));
  const outerEdge = shells.saturn.max;

  function planetGuides(name, g) {
    const guides = [
      circle(`${name}-deferent`, name, 'deferent', g.deferentCentre, g.R, g.deferentBasis.u, g.deferentBasis.v),
      circle(`${name}-epicycle`, name, 'epicycle', g.epicycleCentre, g.r, g.epicycleBasis.u, g.epicycleBasis.v),
      line(`${name}-epicycle-arm`, name, 'arm', g.epicycleCentre, g.pos),
      line(`${name}-deferent-arm`, name, 'arm', g.equantPoint, g.epicycleCentre),
    ];
    if (g.e > 0) {
      guides.push(point(`${name}-deferent-centre`, name, 'centre', g.deferentCentre, 'centre of deferent'));
      if (equant) {
        guides.push(point(`${name}-equant`, name, 'equant', g.equantPoint, 'equant'));
      }
    }
    if (g.crankCentre) {
      guides.push(circle(`${name}-crank`, name, 'crank', g.crankCentre, g.e, g.deferentBasis.u, g.deferentBasis.v));
    }
    return guides;
  }

  return {
    id,
    units: 'earth-radii',
    center: 'earth',
    earthShape: 'sphere',
    diurnal: 'optional',
    skyFrame: 'ecliptic',
    bodyOrder: PTOLEMAIC_ORDER,
    starRadius: outerEdge * 1.01,
    frameRadius: outerEdge,
    shells,

    observer() {
      return ORIGIN;
    },

    /**
     * @param {number} jd Julian day
     * @param {{guides?: boolean}} opts set guides false to compute positions only
     */
    state(jd, { guides: wantGuides = true } = {}) {
      const bodies = { earth: { pos: ORIGIN } };
      const guides = [];

      const sun = sunGeometry(jd);
      bodies.sun = { pos: sun.pos };

      const moon = moonGeometry(jd, options);
      bodies.moon = { pos: moon.pos };

      const planets = {};
      for (const name of PLANET_NAMES) {
        planets[name] = planetGeometry(name, jd, options);
        bodies[name] = { pos: planets[name].pos };
      }

      if (wantGuides) {
        guides.push(circle('sun-deferent', 'sun', 'deferent', sun.centre, sun.radius));
        guides.push(point('sun-deferent-centre', 'sun', 'centre', sun.centre, 'centre of eccentric'));
        guides.push(line('sun-arm', 'sun', 'arm', sun.centre, sun.pos));

        guides.push(circle('moon-deferent', 'moon', 'deferent', moon.deferentCentre, moon.R, moon.basis.u, moon.basis.v));
        guides.push(circle('moon-epicycle', 'moon', 'epicycle', moon.epicycleCentre, moon.r, moon.basis.u, moon.basis.v));
        guides.push(line('moon-epicycle-arm', 'moon', 'arm', moon.epicycleCentre, moon.pos));
        if (moon.e > 0) {
          guides.push(circle('moon-crank', 'moon', 'crank', ORIGIN, moon.e, moon.basis.u, moon.basis.v));
          guides.push(point('moon-deferent-centre', 'moon', 'centre', moon.deferentCentre, 'centre of deferent'));
        }

        for (const name of PLANET_NAMES) guides.push(...planetGuides(name, planets[name]));

        for (const name of PTOLEMAIC_ORDER) {
          guides.push(annulus(`${name}-shell`, name, 'shell', shells[name].min, shells[name].max));
        }
      }

      return { bodies, guides };
    },
  };
}
