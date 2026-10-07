/**
 * Framing the whole cosmos from outside, and knowing when that framing is ours to change.
 *
 * The camera distance depends on the shape of the viewport, and the viewport can
 * change shape at any moment: a window is resized, a phone is turned upright. If
 * the distance is fixed once, a cosmos that fitted a wide window is cut off at
 * the sides when the window narrows, with nothing on screen to say why.
 *
 * So the framing is recomputed when the shape changes. But only while it is still
 * the default framing. Once the user has orbited, zoomed or asked for a close-up,
 * the camera is theirs, and pulling it back out to the whole cosmos because a
 * window moved would throw their work away. That distinction is tracked
 * explicitly here rather than guessed from where the camera happens to be.
 *
 * Telling when the user has moved the camera takes some care, because neither
 * obvious signal is right. The start of an interaction is too eager: it fires on
 * every pointer-down, and a plain click to select a body moves nothing, yet is
 * the commonest thing anyone does here. A change of the camera is too broad: the
 * application moves the camera too, when following a body, settling after a drag
 * or re-framing. What marks the user's own movement is a change that happens
 * while an interaction is under way. The wheel is the exception: the controls
 * open and close the interaction at once and apply the zoom on the next update,
 * after it has closed, so a wheel event is reported separately as a zoom.
 *
 * Pure, so that the policy and the arithmetic can be tested without a renderer.
 */
import { fitDistance } from './frame.js';

/** Every model is scaled so that its natural extent spans this many scene units. */
export const FRAME_UNITS = 100;
/** Vertical field of view of the outside camera, degrees. */
export const COSMOS_FOV = 45;
/** The outside camera never stands nearer than this many frame radii, which suits a wide window with panels open. */
export const COSMOS_STANDOFF = 2.5;
/** Breathing room around whatever must fit. */
export const FIT_MARGIN = 1.08;
/** Upright machinery, such as Eudoxus's spheres, reaches about this fraction of a frame radius above the centre. */
export const FIT_HEIGHT = 0.92;

/**
 * How far back the outside camera must stand for the whole cosmos to fit.
 *
 * A model may need more than its frame radius to be visible, as the comet's long
 * ellipse does; `mustSee` is that half-width in scene units (anything less than
 * the frame itself is ignored). The usual standoff is kept wherever it already
 * suffices, so a wide window is framed exactly as it always was, and only a
 * square or upright one makes the camera back away.
 *
 * @param {number} mustSee half-width that must be visible, scene units
 * @param {number} aspect viewport width divided by height
 */
export function cosmosDistance(mustSee, aspect) {
  const halfWidth = Math.max(FRAME_UNITS, mustSee) * FIT_MARGIN;
  const halfHeight = FRAME_UNITS * FIT_HEIGHT * FIT_MARGIN;
  return Math.max(FRAME_UNITS * COSMOS_STANDOFF, fitDistance(halfWidth, halfHeight, COSMOS_FOV, aspect));
}

/**
 * Altitude, in degrees, at which the view from the ground is first aimed. With the
 * sky view's 60 degree field this puts the horizon about two thirds of the way
 * down the frame, so that the ground is unmistakably there, while a body as high
 * as 45 degrees is still in the picture.
 */
export const ARRIVAL_ALTITUDE = 18;

/**
 * The arrival altitude as a share of the field of view. At the sky view's usual
 * 60 degrees this is the 18 degrees above; magnified, it shrinks with the field,
 * so that the horizon keeps the same place in the frame instead of dropping out
 * of it. It must stay below one half, or the ground could never be in view.
 */
export const ARRIVAL_SHARE = ARRIVAL_ALTITUDE / 60;

/** The altitude the view from the ground prefers at a given field of view, degrees. */
export function preferredAltitude(fovDeg) {
  return Math.min(ARRIVAL_ALTITUDE, ARRIVAL_SHARE * fovDeg);
}

/**
 * Where to look on first arriving in a worldview seen from the ground.
 *
 * Aiming straight at the Sun seems natural and is wrong: a couple of hours after
 * sunrise it already stands 35 degrees up, which with a 60 degree field leaves the
 * horizon below the bottom of the frame. The first thing one sees from "the
 * Earth" then has no Earth in it, only a dot on black. So the view faces the
 * body's direction along the ground but looks at a modest, fixed altitude. If
 * the body is below the horizon, or straight overhead where it has no direction
 * along the ground, the view faces south, toward where the Sun culminates.
 *
 * Scene coordinates: y is up, and south is +z.
 * @param {number[]} toBody direction from the observer to the body, any length
 * @param {number} [fovDeg] vertical field of view, degrees
 * @returns {number[]} a direction to look along
 */
export function horizonArrivalAim(toBody, fovDeg = 60) {
  let [x, , z] = toBody;
  const alongGround = Math.hypot(x, z);
  if (toBody[1] < 0 || alongGround < 1e-9) {
    x = 0;
    z = 1;
  } else {
    x /= alongGround;
    z /= alongGround;
  }
  return [x, Math.tan((preferredAltitude(fovDeg) * Math.PI) / 180), z];
}

/**
 * How far from the centre of the view, as a fraction of the half-field, a tracked
 * body may stand before the view tilts to follow it.
 */
export const TRACKING_REACH = 0.7;

/**
 * Where to look while keeping a body in view from the ground.
 *
 * Centring the body is what tracking means everywhere else, but from the ground
 * it throws the ground away: a Sun 35 degrees up, centred in a 60 degree field,
 * leaves the horizon below the frame. So the view follows the body's bearing
 * along the ground and prefers the level arrival altitude, leaving it only as far
 * as it must to keep the body inside the frame. "Inside" means both edges. A body
 * that climbs pushes the view up; but magnifying narrows the frame from below as
 * well, and a low body, which is what a rising Sun is, would drop out under the
 * bottom edge of a view held at a fixed altitude. So the aim is the preferred
 * altitude clamped into the interval that keeps the body in the frame. The ground
 * stays in the picture whenever both can fit, and the aim is continuous in the
 * body's altitude, with no jump.
 *
 * A body below the horizon is still followed by bearing, and is treated as though
 * it stood on the horizon, so that what stays in the frame is the place where it
 * will rise, even when magnified. Straight overhead or underfoot it has no
 * bearing, and the view faces south.
 *
 * Nor is a body a point. Anaximander's Sun is two degrees across, and magnified
 * until the field is four, a centre held seven tenths of the way to the top edge
 * leaves the upper part of the disc outside the frame. So the disc's own radius
 * comes out of the reach, and a disc too large to be held off-centre at all is
 * simply centred.
 *
 * @param {number[]} toBody direction from the observer to the body, any length; y is up, south is +z
 * @param {number} fovDeg vertical field of view, degrees
 * @param {number} [bodyRadiusDeg] angular semi-diameter of the body as drawn, degrees
 */
export function horizonTrackingAim(toBody, fovDeg, bodyRadiusDeg = 0) {
  let [x, y, z] = toBody;
  const alongGround = Math.hypot(x, z);
  if (alongGround < 1e-9) {
    x = 0;
    z = 1;
  } else {
    x /= alongGround;
    z /= alongGround;
    y /= alongGround;
  }
  const bodyAltitude = alongGround < 1e-9 ? Math.sign(toBody[1]) * 90 : (Math.atan(y) * 180) / Math.PI;
  // What must stay in the frame: the body, or the horizon above it if it has set.
  const keep = Math.max(0, bodyAltitude);
  // How far the body's centre may stand from the centre of the view with its
  // whole disc still comfortably inside the frame.
  const reach = Math.max(0, TRACKING_REACH * (fovDeg / 2) - bodyRadiusDeg);
  // The preferred altitude, moved no further than it must be to hold `keep`
  // within reach of the centre, above or below.
  const clamped = Math.min(keep + reach, Math.max(keep - reach, preferredAltitude(fovDeg)));
  // Never quite vertical: a view straight up has no bearing of its own.
  const altitude = Math.min(89, clamped);
  return [x, Math.tan((altitude * Math.PI) / 180), z];
}

/**
 * Decides, for one frame of the view from the Earth, where the view should be
 * aimed, or returns null to leave it wherever the user has put it.
 *
 * It is one function, called every frame, so that what happens on the frame after
 * arrival is decided in the same place as what happens on arrival. They once
 * disagreed: arrival kept the ground in view and the very next frame, tracking a
 * selected body, centred that body and threw the ground away again.
 *
 * @param {object} p
 * @param {boolean} p.horizon whether this worldview is seen from the ground
 * @param {boolean} p.pending whether the view has only just been entered
 * @param {boolean} p.tracking whether a selected body is being kept in view
 * @param {number[]} p.toBody direction from the observer to the body of interest
 * @param {number} p.fov vertical field of view, degrees
 * @param {number} [p.bodyRadius] angular semi-diameter of a tracked body, degrees
 * @returns {number[]|null}
 */
export function skyAim({ horizon, pending, tracking, toBody, fov, bodyRadius = 0 }) {
  if (!pending && !tracking) return null;
  if (!horizon) return toBody;
  return tracking ? horizonTrackingAim(toBody, fov, bodyRadius) : horizonArrivalAim(toBody, fov);
}

/** Whether the outside camera still stands where the application put it. */
export class DefaultFraming {
  constructor() {
    this.active = false;
    /** Whether the user currently has a pointer down on the controls. */
    this.interacting = false;
  }

  /** The camera has just been placed to frame the whole cosmos. */
  established() {
    this.active = true;
  }

  /** A deliberate placement, such as a close-up or a wheel zoom, has taken the camera elsewhere. */
  relinquished() {
    this.active = false;
  }

  /** The user has pressed on the controls. This alone moves nothing: it may be a click. */
  interactionStarted() {
    this.interacting = true;
  }

  interactionEnded() {
    this.interacting = false;
  }

  /**
   * The camera moved. It is the user's doing only if an interaction is under
   * way; otherwise it is the application following a body, settling after a
   * drag, or re-framing, and the default framing still stands.
   */
  cameraChanged() {
    if (this.interacting) this.active = false;
  }

  /**
   * Whether a change in the viewport's shape should re-frame the cosmos. Only
   * while the default framing still stands, and only from outside: in the view
   * from the Earth there is no distance to adjust.
   * @param {'cosmos'|'sky'} view
   */
  shouldReframe(view) {
    return this.active && view === 'cosmos';
  }
}
