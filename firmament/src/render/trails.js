/**
 * Trails: where each body has recently been.
 *
 * Two are kept for every body. The space trail is its path through the cosmos,
 * which in a geocentric frame is the looping rosette of an epicycle. The sky
 * trail is its direction as seen from the Earth, laid on the celestial sphere:
 * this is the record of what was actually observed, stations and retrograde
 * loops included, and it is the thing every model in this application was built
 * to explain.
 *
 * Samples are taken at fixed steps of simulated time, not per frame, so a trail
 * has the same shape whatever the playback speed.
 *
 * A sky trail is bounded by the angle it sweeps, so that it cannot lap the sky
 * and print over itself; see trailExtent.js for why elapsed time will not do.
 * A space trail is bounded only by capacity: a long rosette is what one wants.
 */
import { AdditiveBlending, BufferGeometry, Color, DynamicDrawUsage, Float32BufferAttribute, Group, Line, LineBasicMaterial } from 'three';
import { BODIES } from '../data/eras.js';
import { firstIndexWithinSpan, signedAngleAbout } from './trailExtent.js';

/** Most samples any trail can hold. */
export const CAPACITY = 1600;
/** Strength of other bodies' trails while one body is singled out. */
export const DIMMED_TRAIL = 0.16;
/**
 * Most of the sky, in degrees, that a sky trail may span. Short of a full turn,
 * so that the faded tail never reaches round to meet the bright head.
 */
export const SKY_TRAIL_MAX_SPAN = 340;

class Trail {
  constructor(color) {
    this.points = [];
    /** Cumulative unwrapped angle at each sample, degrees. Kept for sky trails only. */
    this.angles = [];
    this.color = new Color(color);
    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new Float32BufferAttribute(new Float32Array(CAPACITY * 3), 3).setUsage(DynamicDrawUsage));
    geometry.setAttribute('color', new Float32BufferAttribute(new Float32Array(CAPACITY * 3), 3).setUsage(DynamicDrawUsage));
    geometry.setDrawRange(0, 0);
    this.line = new Line(geometry, new LineBasicMaterial({ vertexColors: true, transparent: true, blending: AdditiveBlending, depthWrite: false }));
    this.line.frustumCulled = false;
    this.dirty = false;
  }

  get length() {
    return this.points.length / 3;
  }

  /** Drops the `count` oldest samples. */
  dropOldest(count) {
    if (count <= 0) return;
    this.points.splice(0, count * 3);
    if (this.angles.length) this.angles.splice(0, count);
  }

  /** Adds a point of a path through space. Bounded by capacity alone. */
  push(x, y, z) {
    this.points.push(x, y, z);
    this.dropOldest(this.length - CAPACITY);
    this.dirty = true;
  }

  /**
   * Adds a direction on the sky, then drops the oldest samples until what is
   * left spans no more than `maxSpan` degrees about `axis`.
   * @param {number[]} axis unit vector about which the body circles the sky
   */
  pushDirection(x, y, z, axis, maxSpan) {
    const n = this.points.length;
    const turned = n >= 3 ? signedAngleAbout([this.points[n - 3], this.points[n - 2], this.points[n - 1]], [x, y, z], axis) : 0;
    this.angles.push(n >= 3 ? this.angles[this.angles.length - 1] + turned : 0);
    this.points.push(x, y, z);
    this.dropOldest(Math.max(this.length - CAPACITY, firstIndexWithinSpan(this.angles, maxSpan)));
    this.dirty = true;
  }

  clear() {
    this.points.length = 0;
    this.angles.length = 0;
    this.dirty = true;
  }

  /** Uploads the samples, fading from dark at the oldest to the body's colour at the newest. */
  flush() {
    if (!this.dirty) return;
    this.dirty = false;
    const n = this.length;
    const position = this.line.geometry.attributes.position;
    const color = this.line.geometry.attributes.color;
    position.array.set(this.points);
    for (let i = 0; i < n; i += 1) {
      const fade = (i / Math.max(1, n - 1)) ** 1.5;
      color.setXYZ(i, this.color.r * fade, this.color.g * fade, this.color.b * fade);
    }
    position.needsUpdate = true;
    color.needsUpdate = true;
    this.line.geometry.setDrawRange(0, n);
  }

  dispose() {
    this.line.geometry.dispose();
    this.line.material.dispose();
  }
}

export class TrailLayer {
  /**
   * @param {import('three').Group} spaceParent carries the space trails
   * @param {import('three').Group} skyParent carries the sky trails; kept centred on the observer
   */
  constructor(spaceParent, skyParent) {
    this.space = new Group();
    this.sky = new Group();
    spaceParent.add(this.space);
    skyParent.add(this.sky);
    this.trails = new Map();
  }

  configure() {
    for (const { space, sky } of this.trails.values()) {
      this.space.remove(space.line);
      this.sky.remove(sky.line);
      space.dispose();
      sky.dispose();
    }
    this.trails.clear();
  }

  ensure(id) {
    let pair = this.trails.get(id);
    if (!pair) {
      const color = BODIES[id]?.color ?? '#ffffff';
      pair = { space: new Trail(color), sky: new Trail(color) };
      this.trails.set(id, pair);
      this.space.add(pair.space.line);
      this.sky.add(pair.sky.line);
    }
    return pair;
  }

  /**
   * Records one sample.
   * @param {string} id
   * @param {import('three').Vector3} position in the space parent's frame
   * @param {import('three').Vector3} direction unit vector from the observer
   * @param {number[]} skyAxis unit vector about which bodies circle the sky, in the same frame as `direction`
   * @param {number} [maxSpan] degrees of sky the sky trail may span
   */
  sample(id, position, direction, skyAxis, maxSpan = SKY_TRAIL_MAX_SPAN) {
    const pair = this.ensure(id);
    pair.space.push(position.x, position.y, position.z);
    pair.sky.pushDirection(direction.x, direction.y, direction.z, skyAxis, maxSpan);
  }

  clear() {
    for (const { space, sky } of this.trails.values()) {
      space.clear();
      sky.clear();
    }
  }

  /**
   * @param {object} p
   * @param {boolean} p.showSpace
   * @param {boolean} p.showSky
   * @param {string|null} [p.skyOnlyFor] when set, only this body's sky trail is shown
   * @param {string|null} [p.emphasised] when set, every other body's trails are dimmed
   * @param {Set<string>} p.exclude bodies whose trails are never drawn
   * @param {Set<string>} [p.skyExclude] bodies whose sky trail would only repeat something already drawn
   */
  update({ showSpace, showSky, skyOnlyFor = null, emphasised = null, exclude, skyExclude = new Set() }) {
    for (const [id, { space, sky }] of this.trails) {
      const allowed = !exclude.has(id);
      space.line.visible = showSpace && allowed;
      sky.line.visible = showSky && allowed && !skyExclude.has(id) && (skyOnlyFor === null || skyOnlyFor === id);
      const strength = emphasised === null || emphasised === id ? 1 : DIMMED_TRAIL;
      space.line.material.opacity = strength;
      sky.line.material.opacity = strength;
      if (space.line.visible) space.flush();
      if (sky.line.visible) sky.flush();
    }
  }
}
