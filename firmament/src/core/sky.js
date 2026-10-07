/**
 * Orientation of the celestial equator relative to the ecliptic.
 *
 * Both frames share their x axis, the direction of the equinox, and differ by a
 * rotation about it through the obliquity. Everything that needs the relation is
 * derived from the single rotation below rather than expanded by hand, because
 * the sign is easy to get wrong and a wrong sign mirrors the equator through the
 * ecliptic while leaving it looking superficially plausible.
 *
 * The convention is pinned by the test suite against the catalogue conversion
 * that was checked on real stars, and by the fact that at right ascension 6h the
 * ecliptic stands north of the equator (the summer solstice), so the equator
 * there lies at ecliptic latitude minus the obliquity.
 */
import { cosd, sind } from './angles.js';
import { rotateX } from './vec.js';

/** Re-expresses an equatorial vector in ecliptic coordinates of the same equinox. */
export function equatorialToEclipticVector(v, obliquityDeg) {
  return rotateX(v, -obliquityDeg);
}

/** Re-expresses an ecliptic vector in equatorial coordinates of the same equinox. */
export function eclipticToEquatorialVector(v, obliquityDeg) {
  return rotateX(v, obliquityDeg);
}

/** The point of the celestial equator at a given right ascension, in ecliptic coordinates. */
export function equatorPointInEcliptic(raDeg, obliquityDeg) {
  return equatorialToEclipticVector([cosd(raDeg), sind(raDeg), 0], obliquityDeg);
}

/** The north celestial pole in ecliptic coordinates: longitude 90, latitude 90 minus the obliquity. */
export function celestialPoleInEcliptic(obliquityDeg) {
  return equatorialToEclipticVector([0, 0, 1], obliquityDeg);
}
