/**
 * Anaximander of Miletus (c. 550 BCE): the first mechanical model of the cosmos.
 *
 * The Earth is a column drum, three times as wide as it is deep, floating free
 * at the centre because it has no reason to move one way rather than another.
 * People live on its flat top. Round it turn great wheels, hollow rims filled
 * with fire and hidden in mist; the Sun and Moon are single vents in their
 * wheels through which the fire shows. The stars are nearest, then the Moon,
 * then the Sun, at 9, 18 and 27 Earth diameters.
 *
 * There is no ecliptic and no planetary theory. The wheels lie aslant and turn
 * daily about the celestial axis; following Couprie's reconstruction, the Sun's
 * wheel slides along that axis through the year, which carries the Sun high in
 * summer and low in winter. The Moon's phases are the vent closing and opening.
 *
 * Unlike every later model this one lives in the observer's own frame: x east,
 * y north, z up through the drum. Units are Earth diameters. The sizes are the
 * Tannery-Diels reconstruction; see docs/SOURCES.md.
 */
import { asind, atan2d, cosd, sind, wrap360 } from '../core/angles.js';
import { JD_NABONASSAR, precessionToJ2000 } from '../core/time.js';
import { add, rotateX, rotateZ, scale } from '../core/vec.js';
import { MOON, OBLIQUITY, SUN } from '../data/almagest.js';
import { line, torus } from './guides.js';

/** Miletus. */
const LATITUDE = 37.5;
const LONGITUDE_EAST = 27.3;

export const DRUM = { diameter: 1, height: 1 / 3 };

/** Mid-rim radius of each wheel; rims are one Earth diameter thick (9-10, 18-19, 27-28). */
export const WHEELS = { stars: 9.5, moon: 18.5, sun: 27.5 };
const RIM_TUBE = 0.5;

/** Unit vectors of the local frame: the celestial axis, the upper meridian, and east. */
const AXIS = [0, cosd(LATITUDE), sind(LATITUDE)];
const MERIDIAN = [0, -sind(LATITUDE), cosd(LATITUDE)];
const EAST = [1, 0, 0];

/** Right ascension and declination (degrees) of an ecliptic position of date. */
function equatorial(lon, lat) {
  const e = OBLIQUITY;
  return {
    ra: wrap360(atan2d(sind(lon) * cosd(e) - (sind(lat) / cosd(lat)) * sind(e), cosd(lon))),
    dec: asind(sind(lat) * cosd(e) + cosd(lat) * sind(e) * sind(lon)),
  };
}

/** Point on a wheel at hour angle H (zero on the upper meridian, increasing westward). */
function onWheel(centre, radius, hourAngle) {
  return add(centre, add(scale(MERIDIAN, radius * cosd(hourAngle)), scale(EAST, -radius * sind(hourAngle))));
}

/**
 * A wheel of fixed size slides along the celestial axis so that its vent is seen
 * from the Earth at the required declination.
 */
function wheelCentre(radius, declination) {
  return scale(AXIS, radius * (sind(declination) / cosd(declination)));
}

/**
 * @param {number} jd Julian day
 * @param {boolean} freezeDiurnal hold the Sun on the meridian, so that the slow
 *   seasonal and monthly motions can be watched at speeds where the daily
 *   rotation would only flicker
 */
export function anaximanderGeometry(jd, freezeDiurnal = false) {
  const d = jd - JD_NABONASSAR;
  const sunLon = SUN.meanLongitudeAtEpoch + SUN.meanMotion * d;
  const moonLon = MOON.meanLongitudeAtEpoch + MOON.meanMotion * d;
  // Counted from the northern limit, so latitude goes as the cosine.
  const moonLat = MOON.inclination * cosd(MOON.latitudeArgumentAtEpoch + MOON.latitudeArgumentMotion * d);

  const sunEq = equatorial(sunLon, 0);
  const moonEq = equatorial(moonLon, moonLat);

  // The Julian day begins at noon, so its fraction is the Sun's hour angle at Greenwich.
  const sunHourAngle = freezeDiurnal ? 0 : wrap360(360 * (jd - Math.floor(jd)) + LONGITUDE_EAST);
  const siderealAngle = sunHourAngle + sunEq.ra;
  const moonHourAngle = siderealAngle - moonEq.ra;

  const sunCentre = wheelCentre(WHEELS.sun, sunEq.dec);
  const moonCentre = wheelCentre(WHEELS.moon, moonEq.dec);
  const elongation = moonLon - sunLon;
  const sun = onWheel(sunCentre, WHEELS.sun, sunHourAngle);

  return {
    sunCentre,
    moonCentre,
    siderealAngle,
    sun,
    moon: onWheel(moonCentre, WHEELS.moon, moonHourAngle),
    /** How far the Moon's vent stands open: 0 at new moon, 1 at full. */
    moonAperture: (1 - cosd(elongation)) / 2,
    /** Height of the Sun above the drum's face, degrees. */
    sunAltitude: asind(sun[2] / Math.hypot(...sun)),
  };
}

/**
 * Images of the J2000 ecliptic basis vectors in the local frame, so the renderer
 * can orient the real star catalogue on Anaximander's turning star-wheel.
 */
function starBasis(jd, siderealAngle) {
  const toLocal = (v) => {
    // J2000 ecliptic to ecliptic of date, then to equatorial, then to the horizon.
    const eq = rotateX(rotateZ(v, -precessionToJ2000(jd)), OBLIQUITY);
    const c = cosd(siderealAngle);
    const s = sind(siderealAngle);
    const xImage = add(scale(MERIDIAN, c), scale(EAST, -s));
    const yImage = add(scale(MERIDIAN, s), scale(EAST, c));
    return add(add(scale(xImage, eq[0]), scale(yImage, eq[1])), scale(AXIS, eq[2]));
  };
  return { x: toLocal([1, 0, 0]), y: toLocal([0, 1, 0]), z: toLocal([0, 0, 1]) };
}

export function createAnaximanderModel({ id }) {
  return {
    id,
    units: 'earth-diameters',
    center: 'earth',
    earthShape: 'drum',
    drum: DRUM,
    /** The daily rotation is part of the model itself, not an optional overlay. */
    diurnal: 'intrinsic',
    skyFrame: 'horizon',
    bodyOrder: ['moon', 'sun'],
    starRadius: WHEELS.stars,
    frameRadius: WHEELS.sun + 1,
    /**
     * Seen from due south the slanting axis points straight away from the viewer
     * and projects to a vertical line, which hides the very thing Anaximander is
     * known for: that the wheels lie aslant. From the east-south-east it shows.
     */
    defaultView: { azimuth: 72, elevation: 14 },
    /**
     * The axis about which the Sun and Moon circle the sky here. There is no
     * ecliptic in this cosmos; the wheels turn about the slanting celestial axis.
     */
    skyAxis: AXIS,

    /** Standing at the centre of the drum's upper face. */
    observer() {
      return [0, 0, DRUM.height / 2 + 0.004];
    },

    state(jd, { guides: wantGuides = true, freezeDiurnal = false } = {}) {
      const g = anaximanderGeometry(jd, freezeDiurnal);
      const bodies = {
        earth: { pos: [0, 0, 0] },
        sun: { pos: g.sun },
        moon: { pos: g.moon, aperture: g.moonAperture },
      };
      const guides = [];
      if (wantGuides) {
        guides.push(torus('sun-wheel', 'sun', 'wheel', g.sunCentre, WHEELS.sun, RIM_TUBE, MERIDIAN, EAST));
        guides.push(torus('moon-wheel', 'moon', 'wheel', g.moonCentre, WHEELS.moon, RIM_TUBE, MERIDIAN, EAST));
        guides.push(line('celestial-axis', null, 'axis', scale(AXIS, -WHEELS.sun * 1.1), scale(AXIS, WHEELS.sun * 1.1)));
      }
      return { bodies, guides, starBasis: starBasis(jd, g.siderealAngle) };
    },
  };
}
