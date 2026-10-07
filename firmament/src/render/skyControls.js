/**
 * Look-around controls for the view from the Earth.
 *
 * The observer stands still and turns their head: dragging grabs the sky and
 * pulls it round, and the wheel or a pinch narrows the field of view, which is
 * what pointing a telescope amounts to. The field can be narrowed far enough to
 * separate the moons of Jupiter.
 */
import { Euler, MathUtils } from 'three';

const MIN_FOV = 0.02;
const MAX_FOV = 110;
const MAX_PITCH = 89.5 * MathUtils.DEG2RAD;

export class SkyControls {
  /**
   * @param {HTMLElement} element receives the pointer events
   * @param {() => void} onUserLook called when the user turns the view by hand
   */
  constructor(element, onUserLook = () => {}) {
    this.element = element;
    this.onUserLook = onUserLook;
    this.enabled = false;
    this.yaw = 0;
    this.pitch = 0;
    this.fov = 60;
    this.pointers = new Map();
    this.pinchDistance = 0;
    this.euler = new Euler(0, 0, 0, 'YXZ');

    this.onPointerDown = this.onPointerDown.bind(this);
    this.onPointerMove = this.onPointerMove.bind(this);
    this.onPointerUp = this.onPointerUp.bind(this);
    this.onWheel = this.onWheel.bind(this);
    element.addEventListener('pointerdown', this.onPointerDown);
    element.addEventListener('pointermove', this.onPointerMove);
    element.addEventListener('pointerup', this.onPointerUp);
    element.addEventListener('pointercancel', this.onPointerUp);
    element.addEventListener('wheel', this.onWheel, { passive: false });
  }

  onPointerDown(event) {
    if (!this.enabled) return;
    this.pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    this.element.setPointerCapture?.(event.pointerId);
    if (this.pointers.size === 2) this.pinchDistance = this.currentPinch();
  }

  onPointerMove(event) {
    if (!this.enabled) return;
    const previous = this.pointers.get(event.pointerId);
    if (!previous) return;
    const dx = event.clientX - previous.x;
    const dy = event.clientY - previous.y;
    this.pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });

    if (this.pointers.size === 2) {
      const distance = this.currentPinch();
      if (this.pinchDistance > 0 && distance > 0) this.setFov(this.fov * (this.pinchDistance / distance));
      this.pinchDistance = distance;
      return;
    }
    // One pixel of drag turns the view by one pixel's worth of angle, so the
    // sky stays under the pointer at any magnification.
    const radiansPerPixel = (this.fov * MathUtils.DEG2RAD) / this.element.clientHeight;
    this.yaw += dx * radiansPerPixel;
    this.pitch = MathUtils.clamp(this.pitch + dy * radiansPerPixel, -MAX_PITCH, MAX_PITCH);
    if (dx !== 0 || dy !== 0) this.onUserLook();
  }

  onPointerUp(event) {
    this.pointers.delete(event.pointerId);
    this.pinchDistance = 0;
  }

  onWheel(event) {
    if (!this.enabled) return;
    event.preventDefault();
    this.setFov(this.fov * Math.exp(event.deltaY * 0.0015));
  }

  currentPinch() {
    const [a, b] = [...this.pointers.values()];
    return Math.hypot(a.x - b.x, a.y - b.y);
  }

  setFov(fov) {
    this.fov = MathUtils.clamp(fov, MIN_FOV, MAX_FOV);
  }

  /** Points the view along a world-space direction. The camera looks down -z at rest. */
  lookAlong(direction) {
    const length = direction.length();
    if (length === 0) return;
    this.yaw = Math.atan2(-direction.x, -direction.z);
    this.pitch = MathUtils.clamp(Math.asin(direction.y / length), -MAX_PITCH, MAX_PITCH);
  }

  /** Writes the current orientation and field of view to the camera. */
  apply(camera) {
    this.euler.set(this.pitch, this.yaw, 0, 'YXZ');
    camera.quaternion.setFromEuler(this.euler);
    if (camera.fov !== this.fov) {
      camera.fov = this.fov;
      camera.updateProjectionMatrix();
    }
  }

  dispose() {
    this.element.removeEventListener('pointerdown', this.onPointerDown);
    this.element.removeEventListener('pointermove', this.onPointerMove);
    this.element.removeEventListener('pointerup', this.onPointerUp);
    this.element.removeEventListener('pointercancel', this.onPointerUp);
    this.element.removeEventListener('wheel', this.onWheel);
  }
}
