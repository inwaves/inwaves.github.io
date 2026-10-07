/**
 * The order in which translucent things are drawn, where that order carries meaning.
 *
 * Anaximander's Sun and Moon are not bodies. Each is a vent: a hole in the mist
 * that wraps its wheel, through which the fire inside shows. A vent is as wide as
 * the rim it pierces, so the luminary's globe exactly fills the tube of its wheel,
 * and the near wall of that tube lies between it and any viewer. Drawn in the
 * usual order, opaque things first and translucent mist over them, the mist
 * therefore veils the very hole that is supposed to be the absence of mist: the
 * Sun seen from the drum came out a dull grey-gold, blended three parts in ten
 * with the colour of the rim, and broken by bright flecks wherever the globe and
 * the faceted tube happened to cross.
 *
 * So a vent is drawn after the mist. It still tests against the depth of solid
 * things, which is what lets the drum hide the Sun once it has set.
 *
 * Nor does a nearer wheel veil a farther vent, as the Moon's wheel would when it
 * crosses in front of the Sun. That is a difficulty of the model itself and not
 * one for a renderer to settle: Anaximander put the wheel of the stars nearest of
 * all, and it hides nothing behind it.
 */
export const DRAW_ORDER = { mist: 0, vent: 2 };

/**
 * How brightly a vent shows, as a fraction of its full colour, for an aperture
 * from 0 (shut, at new moon) to 1 (wide open). Never quite dark, so that the
 * place of a shut vent can still be found. Kept here, beside the rest of what
 * makes a vent a vent, so that the end-to-end check can ask what colour a disc
 * ought to be instead of carrying its own copy of the rule.
 * @param {number} [aperture]
 */
export function ventBrightness(aperture = 1) {
  return 0.25 + 0.75 * Math.min(1, Math.max(0, aperture));
}

/**
 * How much narrower a vent is drawn than when wide open, for an aperture from 0
 * to 1. The area goes as the aperture, so the radius goes as its square root;
 * never to nothing, so that a shut vent can still be found and selected.
 * @param {number} aperture
 */
export function ventNarrowing(aperture) {
  return Math.max(0.18, Math.sqrt(Math.min(1, Math.max(0, aperture))));
}

/**
 * Whether a body is a vent in a wheel of fire and not a body at all.
 * @param {{earthShape?: string}} model
 * @param {string} id
 */
export function isVent(model, id) {
  return model.earthShape === 'drum' && (id === 'sun' || id === 'moon');
}
