// A fading polyline of recent positions, stored relative to a chosen reference frame.
import * as THREE from 'three';

export class Trail {
  constructor({ maxPoints = 1600, color = 0xffffff, opacity = 0.9 } = {}) {
    this.max = maxPoints;
    this.count = 0;
    this.color = new THREE.Color(color);
    this.positions = new Float32Array(maxPoints * 3);
    this.colors = new Float32Array(maxPoints * 3);
    const geometry = new THREE.BufferGeometry();
    this.posAttr = new THREE.BufferAttribute(this.positions, 3).setUsage(THREE.DynamicDrawUsage);
    this.colAttr = new THREE.BufferAttribute(this.colors, 3).setUsage(THREE.DynamicDrawUsage);
    geometry.setAttribute('position', this.posAttr);
    geometry.setAttribute('color', this.colAttr);
    geometry.setDrawRange(0, 0);
    const material = new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity, depthWrite: false });
    this.object = new THREE.Line(geometry, material);
    this.object.frustumCulled = false;
    this.object.renderOrder = 1;
  }

  push(v) {
    if (this.count === this.max) {
      this.positions.copyWithin(0, 3, this.max * 3);
      this.count--;
    }
    const i = this.count * 3;
    this.positions[i] = v.x;
    this.positions[i + 1] = v.y;
    this.positions[i + 2] = v.z;
    this.count++;
    this._recolor();
    this.object.geometry.setDrawRange(0, this.count);
    this.posAttr.needsUpdate = true;
    this.colAttr.needsUpdate = true;
  }

  _recolor() {
    const { r, g, b } = this.color;
    const n = this.count;
    for (let k = 0; k < n; k++) {
      const f = (k + 1) / n;
      const w = 0.06 + 0.94 * f * f;
      this.colors[k * 3] = r * w;
      this.colors[k * 3 + 1] = g * w;
      this.colors[k * 3 + 2] = b * w;
    }
  }

  clear() {
    this.count = 0;
    this.object.geometry.setDrawRange(0, 0);
  }

  dispose() {
    this.object.geometry.dispose();
    this.object.material.dispose();
  }
}
