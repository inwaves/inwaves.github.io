/**
 * Angle helpers. All public model parameters are in degrees, because that is how
 * every historical source states them; radians appear only inside trigonometry.
 */

export const DEG = Math.PI / 180;
export const RAD = 180 / Math.PI;

export const sind = (d) => Math.sin(d * DEG);
export const cosd = (d) => Math.cos(d * DEG);
export const atan2d = (y, x) => Math.atan2(y, x) * RAD;
export const asind = (x) => Math.asin(Math.max(-1, Math.min(1, x))) * RAD;

/** Wraps an angle into [0, 360). */
export function wrap360(d) {
  const w = d % 360;
  return w < 0 ? w + 360 : w;
}

/** Wraps an angle into (-180, 180]. */
export function wrap180(d) {
  const w = wrap360(d);
  return w > 180 ? w - 360 : w;
}

/**
 * Converts sexagesimal digits to a decimal number: sexagesimal(0, 59, 8) is
 * 0 + 59/60 + 8/3600. Historical tables are kept in their original digits and
 * converted here, so that no transcription arithmetic is done by hand.
 * @param {...number} digits integer part followed by successive sixtieths
 */
export function sexagesimal(...digits) {
  let value = 0;
  let unit = 1;
  for (const digit of digits) {
    value += digit * unit;
    unit /= 60;
  }
  return value;
}
