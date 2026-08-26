// Two camera modes: an orbiting god's-eye view (optionally following a body) and a
// view from the Earth looking out at the heavens, with drag-to-look and wheel-to-zoom.
import * as THREE from 'three';

const DEG = Math.PI / 180;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

export class CameraRig {
  constructor(camera, controls, dom) {
    this.camera = camera;
    this.controls = controls;
    this.dom = dom;
    this.mode = 'orbit';
    this.yaw = 180 * DEG;
    this.pitch = 8 * DEG;
    this.fov = 75;
    this.orbitFov = 50;
    this._drag = null;
    this._dir = new THREE.Vector3();
    this._target = new THREE.Vector3();
    this._delta = new THREE.Vector3();
    this.onUserLook = null;

    dom.addEventListener('pointerdown', (e) => {
      if (this.mode !== 'earth') return;
      this._drag = { x: e.clientX, y: e.clientY };
      dom.setPointerCapture(e.pointerId);
    });
    dom.addEventListener('pointermove', (e) => {
      if (!this._drag || this.mode !== 'earth') return;
      const dx = e.clientX - this._drag.x;
      const dy = e.clientY - this._drag.y;
      this._drag = { x: e.clientX, y: e.clientY };
      const k = (this.fov / Math.max(1, dom.clientHeight)) * DEG;
      this.yaw += dx * k;
      this.pitch = clamp(this.pitch + dy * k, -89 * DEG, 89 * DEG);
      if ((dx || dy) && this.onUserLook) this.onUserLook();
    });
    const end = () => { this._drag = null; };
    dom.addEventListener('pointerup', end);
    dom.addEventListener('pointercancel', end);
    dom.addEventListener('wheel', (e) => {
      if (this.mode !== 'earth') return;
      e.preventDefault();
      this.fov = clamp(this.fov * Math.exp(e.deltaY * 0.0012), 3, 115);
    }, { passive: false });
  }

  setMode(mode) {
    if (this.mode === mode) return;
    this.mode = mode;
    this.controls.enabled = mode === 'orbit';
    if (mode === 'orbit') {
      this.camera.fov = this.orbitFov;
      this.camera.up.set(0, 1, 0);
      this.camera.updateProjectionMatrix();
      this.camera.position.copy(this._savedPosition || new THREE.Vector3(0, 30, 50));
      this.controls.update();
    } else {
      this._savedPosition = this.camera.position.clone();
    }
  }

  reset({ position, target }) {
    this.camera.position.set(...position);
    this.controls.target.set(...target);
    this._savedPosition = this.camera.position.clone();
    this.controls.update();
  }

  /** In Earth view, turn to face a world position. */
  pointAt(worldPos, eyePos) {
    const d = this._dir.copy(worldPos).sub(eyePos).normalize();
    this.yaw = Math.atan2(-d.z, d.x);
    this.pitch = Math.asin(clamp(d.y, -1, 1));
  }

  /** In orbit mode, re-target the camera and bring it to `distance` along its current line of sight. */
  focusOn(worldPos, distance) {
    if (this.mode !== 'orbit') return;
    const offset = this._delta.copy(this.camera.position).sub(this.controls.target);
    if (offset.lengthSq() < 1e-6) offset.set(0, 0.6, 1);
    offset.normalize().multiplyScalar(distance);
    this.controls.target.copy(worldPos);
    this.camera.position.copy(worldPos).add(offset);
    this.controls.update();
  }

  update({ followPos = null, eyePos = null }) {
    const cam = this.camera;
    if (this.mode === 'earth' && eyePos) {
      cam.position.copy(eyePos);
      cam.fov = this.fov;
      cam.updateProjectionMatrix();
      const cp = Math.cos(this.pitch);
      this._dir.set(cp * Math.cos(this.yaw), Math.sin(this.pitch), -cp * Math.sin(this.yaw));
      this._target.copy(cam.position).add(this._dir);
      cam.up.set(0, 1, 0);
      cam.lookAt(this._target);
      return;
    }
    if (followPos) {
      this._delta.copy(followPos).sub(this.controls.target);
      cam.position.add(this._delta);
      this.controls.target.copy(followPos);
    }
    this.controls.update();
  }
}
