// Sizes and distances as each period conceived them, in Earth radii (ER).
//
// Sources: Ptolemy, Almagest V and Planetary Hypotheses; Aristarchus, On the Sizes and
// Distances; Plato, Timaeus 36d (the 1:2:3:4:8:9:27 proportions); Copernicus, De
// revolutionibus IV.19-24; Tycho, Astronomiae instauratae progymnasmata; Kepler, Epitome
// astronomiae Copernicanae IV; Newton, Principia (3rd ed.), with Cassini's solar parallax.
// The collected figures follow Albert Van Helden, Measuring the Universe (1985).

export const TRUE_AU_ER = 23455; // the modern astronomical unit in Earth radii

// Modern radii in Earth radii. An era that measured true angular diameters but used too
// small an astronomical unit obtained these radii scaled by (its AU / the true AU); the
// Moon's size, fixed by eclipses and parallax, does not depend on the AU.
const TRUE_RADII_ER = {
  sun: 109.2, moon: 0.2727, mercury: 0.383, venus: 0.949, earth: 1, mars: 0.532, jupiter: 10.97, saturn: 9.14,
  uranus: 3.98, neptune: 3.86, pluto: 0.186, eris: 0.182,
  io: 0.286, europa: 0.245, ganymede: 0.413, callisto: 0.378, titan: 0.404,
};

/** Body radii (ER) implied by modern angular diameters at an era's astronomical unit. */
export function telescopicSizes(auER) {
  const k = auER / TRUE_AU_ER;
  const out = {};
  for (const [id, r] of Object.entries(TRUE_RADII_ER)) out[id] = id === 'earth' || id === 'moon' ? r : r * k;
  return out;
}

/** Ptolemy's sizes (radii, Earth = 1), Planetary Hypotheses; used through Tycho for the planets. */
export const PTOLEMY_SIZES = { earth: 1, moon: 0.29, mercury: 0.037, venus: 0.3, sun: 5.5, mars: 1.14, jupiter: 4.4, saturn: 4.3 };

/** Mean deferent radii from the nesting of the Planetary Hypotheses (least/greatest distances). */
export const PTOLEMY_R = { moon: 48.5, mercury: 115, venus: 622, sun: 1210, mars: 5040, jupiter: 11503, saturn: 17026 };
export const PTOLEMY_STARS = 20000;

/** Hipparchus: Moon 59-67 ER (mean 62), Sun 2,490 ER; the planets' distances undetermined. */
export const HIPPARCHUS_R = { ...PTOLEMY_R, moon: 62, sun: 2490 };
export const HIPPARCHUS_SIZES = { ...PTOLEMY_SIZES, moon: 0.33, sun: 12.3 };

/** Aristarchus: Moon at about 20 ER, the Sun 19 times farther; Moon 0.36, Sun 6.75 Earth radii. */
export const ARISTARCHUS = { moon: 20, sun: 380, moonSize: 0.36, sunSize: 6.75 };

/**
 * Plato's Timaeus proportions for the seven circles (Moon 1, Sun 2, Venus 3, Mercury 4,
 * Mars 8, Jupiter 9, Saturn 27), anchored to Aristarchus' lunar distance; the Sun's
 * diameter nine times the Moon's after Eudoxus (Archimedes, Sand-Reckoner).
 */
export const TIMAEUS_R = { moon: 20, sun: 40, venus: 60, mercury: 80, mars: 160, jupiter: 180, saturn: 540 };
export const TIMAEUS_STARS = 600;
export const EUDOXUS_SIZES = { earth: 1, moon: 0.36, sun: 3.24, mercury: 0.3, venus: 0.3, mars: 0.3, jupiter: 0.3, saturn: 0.3 };

/** Copernicus' own mean distances (AU) and his astronomical unit of 1,142 Earth radii. */
export const COPERNICUS_A = { mercury: 0.3763, venus: 0.7193, earth: 1, mars: 1.5198, jupiter: 5.2192, saturn: 9.1743 };
export const COPERNICUS_AU = 1142;
export const TYCHO_AU = 1150;
export const TYCHO_STARS = 14000;
export const GALILEO_AU = 1208; // Dialogue, Third Day
export const KEPLER_AU = 3469; // Epitome
export const NEWTON_AU = 19600; // Principia, solar parallax 10.5 arcsec
export const ENCKE_AU = 23400; // Encke's 1835 reduction of the 1761/69 transits: parallax 8.57 arcsec
export const MOON_DISTANCE = 60.3; // Earth radii, Ptolemy through Newton

// Galilean satellite and Titan orbits in units of their planet's radius (true values).
export const IO_ORBIT_RJ = 5.9;
export const TITAN_ORBIT_RS = 20.3;

/** Heliocentric period layout for an astronomical unit of `auER` Earth radii. */
export function helioPeriodLayout(auER, { a = null, sizes, starsFactor = 4, stars = null } = {}) {
  const size = sizes;
  return {
    au: auER,
    a,
    moonOrbit: MOON_DISTANCE,
    ioOrbit: IO_ORBIT_RJ * size.jupiter,
    titanOrbit: TITAN_ORBIT_RS * size.saturn,
    size,
    moonSizes: { io: size.io ?? 0.1, europa: size.europa ?? 0.1, ganymede: size.ganymede ?? 0.12, callisto: size.callisto ?? 0.12, titan: size.titan ?? 0.12 },
    stars: stars ?? starsFactor * 9.5 * auER,
    marker: Math.max(1, size.sun / 4),
    asteroidSize: 0.074 * (auER / TRUE_AU_ER),
  };
}
