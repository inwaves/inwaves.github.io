// Shared visual styles and builders that derive each historical mechanism from the same
// mean elements. Every builder takes explicit radii so that a model can be laid out either
// legibly (compressed) or to the proportions its period actually conceived.
import { ELEMENTS, MOON, SUN, JUPITER_MOONS, SATURN_MOONS, synodic, norm360 } from '../data/elements.js';
import { DAY_SIDEREAL } from '../engine/time.js';

export { ELEMENTS, MOON, SUN, synodic, norm360, DAY_SIDEREAL };

export const STYLE = {
  sun: { name: 'Sun', color: 0xffc847, size: 0.9, emissive: true, light: true },
  moon: { name: 'Moon', color: 0xd6d6d6, size: 0.14 },
  mercury: { name: 'Mercury', color: 0xb5b0a8, size: 0.16 },
  venus: { name: 'Venus', color: 0xf2dca8, size: 0.24 },
  earth: { name: 'Earth', color: 0x4f8fe0, size: 0.26 },
  mars: { name: 'Mars', color: 0xe06a3a, size: 0.2 },
  jupiter: { name: 'Jupiter', color: 0xd9b38c, size: 0.5 },
  saturn: { name: 'Saturn', color: 0xe8d39a, size: 0.42 },
  uranus: { name: 'Uranus', color: 0x8fd8e8, size: 0.34 },
  neptune: { name: 'Neptune', color: 0x4f7de8, size: 0.33 },
  pluto: { name: 'Pluto', color: 0xcdb9a5, size: 0.1 },
  eris: { name: 'Eris', color: 0xe8e8f0, size: 0.1 },
};

export const LEGIBLE_SIZES = Object.fromEntries(Object.entries(STYLE).map(([k, v]) => [k, v.size]));

// Legible radii for geocentric layouts. Ptolemaic order (Moon, Mercury, Venus, Sun, ...)
// and the Platonic order used by Eudoxus and Aristotle (Moon, Sun, Venus, Mercury, ...).
export const GEO = { moon: 2.6, mercury: 4.6, venus: 8, sun: 12, mars: 17, jupiter: 24, saturn: 31 };
export const GEO_STARS = 37;
export const PLATO = { moon: 3, sun: 5, venus: 7, mercury: 9, mars: 11, jupiter: 13, saturn: 15 };
export const PLATO_STARS = 17;

/** Legible heliocentric layout: 4.2 units per AU, moons' orbits enlarged. */
export const LEGIBLE_HELIO = {
  au: 4.2,
  a: null,
  moonOrbit: 0.9,
  ioOrbit: 0.95,
  titanOrbit: 1.45,
  size: LEGIBLE_SIZES,
  moonSizes: { io: 0.055, europa: 0.05, ganymede: 0.07, callisto: 0.065, titan: 0.07 },
  stars: 60,
  marker: 1,
};

export const EARTH_LOOK = { texture: 'earth', rotates: true, axis: true };

export const body = (id, extra = {}) => ({ id, kind: 'body', ...STYLE[id], ...extra });
export const point = (id, extra = {}) => ({ id, kind: 'point', color: 0xffffff, ...extra });
export const fixed = () => ({ type: 'fixed' });
export const circle = (radius, period, phase, extra = {}) => ({ type: 'circle', radius, period, phase: norm360(phase), ...extra });
export const inclOf = (el) => ({ incl: el.i, node: el.node });

const sphereOpts = (opts, R) => (opts.sphere ? { sphere: true, sphereRadius: R } : {});

/**
 * Geocentric deferent + epicycle for a planet.
 * Outer planets: the deferent is the planet's own zodiacal motion and the epicycle turns
 * with the Sun's mean motion (radius R * a_earth / a_planet). Inner planets: the deferent
 * turns with the mean Sun and the epicycle with the planet's heliocentric period
 * (radius R * a_planet). Options: eccentric, equant (bisected), maragha (epicyclets instead
 * of eccentric + equant), crank (Ptolemy's Mercury), sphere, incl, labelMarkers, parent, body.
 */
export function geoPlanet(id, R, opts = {}) {
  const el = ELEMENTS[id];
  const earth = ELEMENTS.earth;
  const outer = el.a > 1;
  const defPeriod = outer ? el.period : earth.period;
  const defPhase = outer ? el.L0 : SUN.L0;
  const epPeriod = outer ? earth.period : el.period;
  const epPhase = outer ? SUN.L0 : el.L0;
  const epRadius = R * (outer ? 1 / el.a : el.a);
  const e = (outer ? el.e : earth.e) * R;
  const apogee = outer ? norm360(el.peri + 180) : SUN.apogee;
  const defIncl = outer && opts.incl !== false ? inclOf(el) : {};
  const epIncl = !outer && opts.incl !== false ? inclOf(el) : {};
  const name = STYLE[id].name;
  const color = STYLE[id].color;
  const parent = opts.parent || 'earth';
  const extra = opts.body || {};
  const nodes = [];

  if (opts.maragha) {
    nodes.push(point(`${id}-def`, { parent, name: `${name}: deferent`, label: false, motion: circle(R, defPeriod, defPhase, defIncl), color, ...sphereOpts(opts, R) }));
    nodes.push(point(`${id}-ep1`, { parent: `${id}-def`, name: `${name}: first epicyclet (3e/2)`, label: false, motion: circle(1.5 * e, 0, apogee), color: 0xffffff, markerSize: 0.05 }));
    nodes.push(point(`${id}-ep2`, { parent: `${id}-ep1`, name: `${name}: second epicyclet (e/2)`, label: false, motion: circle(0.5 * e, defPeriod / 2, 2 * defPhase - apogee + 180), color: 0xff4fd8, markerSize: 0.05 }));
    let carrier = `${id}-ep2`;
    if (!outer) {
      // For Mercury and Venus the epicycle is the planet's own heliocentric orbit, so Ibn
      // al-Shatir gave it further epicyclets for the planet's own inequality.
      const ep = el.e * epRadius;
      const aph = norm360(el.peri + 180);
      nodes.push(point(`${id}-ep3`, { parent: carrier, name: `${name}: third epicyclet`, label: false, motion: circle(1.5 * ep, 0, aph), color: 0xffffff, markerSize: 0.04 }));
      nodes.push(point(`${id}-ep4`, { parent: `${id}-ep3`, name: `${name}: fourth epicyclet`, label: false, motion: circle(0.5 * ep, el.period / 2, 2 * el.L0 - aph + 180), color: 0xff4fd8, markerSize: 0.04 }));
      carrier = `${id}-ep4`;
    }
    nodes.push(body(id, { parent: carrier, motion: circle(epRadius, epPeriod, epPhase, epIncl), ...extra }));
    return nodes;
  }

  if (opts.crank) {
    // Ptolemy's Mercury (Almagest IX): equant at distance e from the Earth, and a deferent
    // whose centre rides a circle of radius e about a point 2e from the Earth, turning with
    // the mean Sun in the opposite sense. Ptolemy: e = 3 (R = 60), apogee 190 deg in his
    // epoch (about 216 deg in the J2000 frame). It yields two perigees and was his weakest model.
    const eP = 0.05 * R;
    const apg = 216;
    nodes.push(point(`${id}-def`, {
      parent, name: `${name}: epicycle centre`, color, label: false,
      motion: circle(R, defPeriod, defPhase, {
        eccentric: { distance: 2 * eP, direction: apg, crank: { radius: eP, period: -defPeriod, phase: 2 * apg - defPhase } },
        equant: { distance: eP, direction: apg },
      }),
      labelMarkers: !!opts.labelMarkers, markerScale: opts.markerScale,
      ...sphereOpts(opts, R),
    }));
    nodes.push(body(id, { parent: `${id}-def`, motion: circle(epRadius, epPeriod, epPhase, epIncl), ...extra }));
    return nodes;
  }

  const ecc = opts.eccentric ? { eccentric: { distance: e, direction: apogee } } : {};
  const equ = opts.equant ? { equant: { distance: 2 * e, direction: apogee } } : {};
  nodes.push(point(`${id}-def`, {
    parent, name: `${name}: epicycle centre`, color, label: false,
    motion: circle(R, defPeriod, defPhase, { ...ecc, ...equ, ...defIncl }),
    labelMarkers: !!opts.labelMarkers, markerScale: opts.markerScale,
    ...sphereOpts(opts, R),
  }));
  nodes.push(body(id, { parent: `${id}-def`, motion: circle(epRadius, epPeriod, epPhase, epIncl), ...extra }));
  return nodes;
}

/**
 * Geocentric Sun: concentric or eccentric circle, or Ibn al-Shatir's double epicycle.
 * A bare eccentric yields only half the true equation of centre, so, as Hipparchus (1/24),
 * Copernicus (1/31) and Tycho (0.0358) all did, its eccentricity is fitted at about 2e.
 */
export function geoSun(R, opts = {}) {
  const extra = opts.body || {};
  if (opts.maragha) {
    const e = SUN.e * R;
    return [
      point('sun-def', { parent: 'earth', name: 'Sun: deferent', label: false, motion: circle(R, SUN.period, SUN.L0), color: STYLE.sun.color, ...sphereOpts(opts, R) }),
      point('sun-ep1', { parent: 'sun-def', name: 'Sun: first epicyclet', label: false, motion: circle(1.5 * e, 0, SUN.apogee), markerSize: 0.05 }),
      point('sun-ep2', { parent: 'sun-ep1', name: 'Sun: second epicyclet', label: false, motion: circle(0.5 * e, SUN.period / 2, 2 * SUN.L0 - SUN.apogee + 180), color: 0xff4fd8, markerSize: 0.05 }),
      body('sun', { parent: 'sun-ep2', motion: fixed(), ...extra }),
    ];
  }
  const ecc = opts.eccentric ? { eccentric: { distance: 2 * SUN.e * R, direction: SUN.apogee } } : {};
  return [body('sun', { parent: 'earth', motion: circle(R, SUN.period, SUN.L0, ecc), labelMarkers: !!opts.labelMarkers, ...sphereOpts(opts, R), ...extra })];
}

/**
 * Geocentric Moon. With `epicycle` (ratio to R) the Moon rides a small circle whose radius
 * vector keeps a nearly fixed direction, turning once per 8.85 years: Hipparchus' device,
 * equivalent to an eccentric with a slowly advancing apse.
 */
export function geoMoon(R, opts = {}) {
  const incl = { incl: MOON.i, node: MOON.node };
  const extra = opts.body || {};
  if (opts.epicycle) {
    return [
      point('moon-def', { parent: 'earth', name: 'Moon: epicycle centre', label: false, motion: circle(R, MOON.period, MOON.L0, incl), color: STYLE.moon.color, ...sphereOpts(opts, R) }),
      body('moon', { parent: 'moon-def', motion: circle(opts.epicycle * R, MOON.apsePeriod, MOON.peri + 180), ...extra }),
    ];
  }
  return [body('moon', { parent: 'earth', motion: circle(R, MOON.period, MOON.L0, incl), ...sphereOpts(opts, R), ...extra })];
}

/**
 * Eudoxan planet: zodiacal sphere plus two counter-rotating spheres producing a hippopede
 * of half-width alpha. Outer planets retrograde at opposition, inner ones at inferior
 * conjunction, so the synodic phase is set from the Sun-planet elongation at J2000.
 */
export function eudoxusPlanet(id, R, alpha, opts = {}) {
  const el = ELEMENTS[id];
  const earth = ELEMENTS.earth;
  const outer = el.a > 1;
  const syn = synodic(el.period, earth.period);
  const motion = outer
    ? { type: 'eudoxus', radius: R, zodiacPeriod: el.period, phase: el.L0, synodicPeriod: syn, synodicPhase: norm360(SUN.L0 - el.L0 - 180), alpha }
    : { type: 'eudoxus', radius: R, zodiacPeriod: earth.period, phase: SUN.L0, synodicPeriod: syn, synodicPhase: norm360(el.L0 - SUN.L0 - 180), alpha };
  return body(id, { parent: 'earth', motion, ...sphereOpts(opts, R), ...(opts.body || {}) });
}

/**
 * Heliocentric planet in layout L ({ au, a?, size }). style: 'circle' (Galileo),
 * 'eccentric' (Copernican Earth), 'copernican' (eccentric of 3e/2 plus an epicyclet of e/2
 * turning twice per revolution), 'ellipse' (Kepler).
 */
export function helioPlanet(id, opts = {}, L = LEGIBLE_HELIO) {
  const el = ELEMENTS[id];
  const a = (L.a?.[id] ?? el.a) * L.au;
  const parent = opts.parent || 'sun';
  const incl = opts.incl === false ? {} : inclOf(el);
  const extra = { size: L.size[id], ...(opts.body || {}) };
  const apogee = norm360(el.peri + 180);
  switch (opts.style) {
    case 'ellipse':
      return [body(id, { parent, motion: { type: 'ellipse', a, e: el.e, period: el.period, peri: el.peri, M0: el.M0, ...incl }, ...extra })];
    case 'copernican': {
      const e = el.e * a;
      return [
        point(`${id}-def`, { parent, name: `${STYLE[id].name}: eccentric deferent`, color: STYLE[id].color, label: false, motion: circle(a, el.period, el.L0, { eccentric: { distance: 1.5 * e, direction: apogee }, ...incl }) }),
        body(id, { parent: `${id}-def`, motion: circle(0.5 * e, el.period / 2, 2 * el.L0 - apogee + 180), ...extra }),
      ];
    }
    case 'eccentric':
      // A bare eccentric fits the equation of centre only with about twice the true
      // eccentricity (Copernicus' Earth: 1/31); the distance variation is then too large.
      return [body(id, { parent, motion: circle(a, el.period, el.L0, { eccentric: { distance: 2 * el.e * a, direction: apogee }, ...incl }), ...extra })];
    default:
      return [body(id, { parent, motion: circle(a, el.period, el.L0, incl), ...extra })];
  }
}

/** The Moon about a moving Earth, at L.moonOrbit. */
export function helioMoon(opts = {}, L = LEGIBLE_HELIO) {
  const incl = { incl: MOON.i, node: MOON.node };
  const r = L.moonOrbit;
  const extra = { size: L.size.moon, ...(opts.body || {}) };
  if (opts.style === 'ellipse') {
    return [body('moon', { parent: 'earth', motion: { type: 'ellipse', a: r, e: MOON.e, period: MOON.period, peri: MOON.peri, M0: norm360(MOON.L0 - MOON.peri), ...incl }, ...extra })];
  }
  if (opts.style === 'epicycle') {
    return [
      point('moon-def', { parent: 'earth', name: 'Moon: deferent', motion: circle(r, MOON.period, MOON.L0, incl), color: STYLE.moon.color, label: false }),
      body('moon', { parent: 'moon-def', motion: circle(0.1097 * r, MOON.apsePeriod, MOON.peri + 180), ...extra }),
    ];
  }
  return [body('moon', { parent: 'earth', motion: circle(r, MOON.period, MOON.L0, incl), ...extra })];
}

/** The four Galilean satellites; orbit ratios and periods true, absolute scale from L. */
export function galileanMoons(L = LEGIBLE_HELIO) {
  const j = ELEMENTS.jupiter;
  return JUPITER_MOONS.map((m) => ({
    id: m.id, kind: 'body', name: m.name, color: m.color, size: L.moonSizes[m.id], parent: 'jupiter',
    motion: circle(L.ioOrbit * m.rel, m.period, m.phase, { incl: j.i, node: j.node }),
    trailMax: 500, guideOpacity: 0.35,
  }));
}

/** Titan (Huygens, 1655). */
export function saturnMoons(L = LEGIBLE_HELIO) {
  const s = ELEMENTS.saturn;
  return SATURN_MOONS.map((m) => ({
    id: m.id, kind: 'body', name: m.name, color: m.color, size: L.moonSizes[m.id], parent: 'saturn',
    motion: circle(L.titanOrbit * m.rel, m.period, m.phase, { incl: 26.7, node: s.node }),
    trailMax: 500, guideOpacity: 0.35,
  }));
}

export const SATURN_RING = { inner: 1.3, outer: 2.3, tilt: 26.7, node: ELEMENTS.saturn.node };

/** Individually known asteroids as small bodies on their own ellipses. */
export function asteroidBodies(list, L = LEGIBLE_HELIO) {
  const k = L.au / 4.2;
  return list.map((a) => ({
    id: a.id, kind: 'body', name: a.name, color: a.color, size: (L.asteroidSize ?? a.size) * (L.asteroidSize ? 1 : Math.max(1, k ** 0.5 / 10)), parent: 'sun',
    motion: { type: 'ellipse', a: a.a * L.au, e: a.e, period: a.period, peri: a.peri, M0: a.M0, incl: a.i, node: a.node },
    trailMax: 600, guideOpacity: 0.3,
  }));
}

/** Deterministic pseudo-random elements for a belt of minor bodies (rendered as points). */
export function belt(id, { name, aMin, aMax, eMax, iMax, count, color, size = 2, seed = 1 }, L = LEGIBLE_HELIO) {
  let s = seed >>> 0;
  const rnd = () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let z = s;
    z = Math.imul(z ^ (z >>> 15), z | 1);
    z ^= z + Math.imul(z ^ (z >>> 7), z | 61);
    return ((z ^ (z >>> 14)) >>> 0) / 4294967296;
  };
  const elements = [];
  for (let k = 0; k < count; k++) {
    const aAU = aMin + (aMax - aMin) * rnd();
    elements.push({
      type: 'ellipse', a: aAU * L.au, e: eMax * rnd(), period: 365.256 * aAU ** 1.5,
      peri: 360 * rnd(), M0: 360 * rnd(), incl: iMax * rnd() * rnd(), node: 360 * rnd(),
    });
  }
  return { id, kind: 'belt', name, parent: 'sun', color, pointSize: size, elements, labelRadius: ((aMin + aMax) / 2) * L.au };
}

/** Aristotle's sublunary shells of the elements: faintly tinted, never opaque. */
export function elementShells(earthRadius) {
  return [
    { radius: earthRadius * 1.35, color: 0x2f7bff, opacity: 0.2, emissiveIntensity: 0.7, name: 'water' },
    { radius: earthRadius * 2.2, color: 0xbfe3ff, opacity: 0.1, emissiveIntensity: 0.5, name: 'air' },
    { radius: earthRadius * 3.6, color: 0xff6a1a, opacity: 0.13, emissiveIntensity: 0.7, name: 'fire' },
  ];
}

/** Camera framing a geocentric cosmos of star radius `stars`. */
export const geoCamera = (stars, k = 1) => ({ position: [0, stars * 0.8 * k, stars * 1.35 * k], target: [0, 0, 0] });
