/**
 * Draws the machinery each worldview posits: deferents and epicycles, nested
 * spheres and their axes, wheels of fire, solid shells, ellipses.
 *
 * Models describe their machinery as plain records (see models/guides.js). This
 * pool keeps one drawable per record id, creates it on first sight, updates it
 * every frame and hides it when the model stops emitting it. Styling is chosen
 * by the record's `role`; its `body` decides whether it is emphasised or dimmed
 * when a body is selected.
 */
import {
  AdditiveBlending,
  BufferGeometry,
  Color,
  DoubleSide,
  DynamicDrawUsage,
  Float32BufferAttribute,
  Group,
  Line,
  LineBasicMaterial,
  LineDashedMaterial,
  LineLoop,
  Mesh,
  MeshBasicMaterial,
  RingGeometry,
  SphereGeometry,
  TorusGeometry,
  Vector3,
} from 'three';
import { CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import { BODIES } from '../data/eras.js';
import { DRAW_ORDER } from './drawOrder.js';
import { planeMatrix, toThree } from './frame.js';
import { labelBox } from './labels.js';

const X = [1, 0, 0];
const Y = [0, 1, 0];
const NEUTRAL = '#9fb2d4';

/**
 * Appearance by role. `opacity` is the strength when nothing is selected or the
 * guide's own body is; guides of other bodies are multiplied by DIMMED.
 * `group` is the toggle that controls visibility.
 */
const STYLES = {
  deferent: { opacity: 0.55, group: 'machinery' },
  orbit: { opacity: 0.6, group: 'machinery' },
  epicycle: { opacity: 0.95, group: 'machinery' },
  epicyclet: { opacity: 0.95, group: 'machinery' },
  'satellite-orbit': { opacity: 0.35, group: 'machinery' },
  arm: { opacity: 0.45, group: 'machinery' },
  'radius-vector': { opacity: 0.55, group: 'machinery', onlySelected: true },
  crank: { opacity: 0.8, dashed: true, group: 'machinery' },
  axis: { opacity: 0.5, dashed: true, group: 'machinery' },
  'sphere-daily': { opacity: 0.22, group: 'machinery', onlySelected: true },
  'sphere-zodiacal': { opacity: 0.4, group: 'machinery' },
  'sphere-third': { opacity: 0.6, group: 'machinery', onlySelected: true },
  'sphere-fourth': { opacity: 0.85, group: 'machinery', onlySelected: true },
  'sphere-counteracting': { opacity: 0.6, dashed: true, group: 'machinery', onlySelected: true },
  hippopede: { opacity: 1, group: 'machinery', onlySelected: true },
  wheel: { opacity: 0.3, group: 'machinery', visibleFromEarth: true },
  'swept-area': { opacity: 0.28, group: 'machinery' },
  shell: { opacity: 0.07, group: 'shells' },
  crystalline: { opacity: 0.1, group: 'shells' },
  'element-water': { opacity: 0.3, color: '#3f78c4', group: 'shells' },
  'element-air': { opacity: 0.16, color: '#a9d6ee', group: 'shells' },
  'element-fire': { opacity: 0.2, color: '#e88a3c', group: 'shells' },
  equant: { opacity: 1, group: 'machinery', onlySelected: true },
  centre: { opacity: 0.9, group: 'machinery', onlySelected: true },
  focus: { opacity: 0.9, group: 'machinery', onlySelected: true },
  mean: { opacity: 0.8, group: 'machinery', onlySelected: true },
};

/** Roles whose `axis` and points belong to a body's private mechanism. */
const DIMMED = 0.22;
const FALLBACK = { opacity: 0.5, group: 'machinery' };

/** A caption always yields to a body's name: every body ranks below this. */
const CAPTION_RANK = 100;
/** Metrics of a caption as drawn (10.5px italic, 8px from its point), CSS pixels. */
const CAPTION_GAP = 8;
const CAPTION_CHAR_WIDTH = 6;
const CAPTION_HALF_HEIGHT = 7;

/** Roles shown in the legend, with plain-language names. */
export const ROLE_NAMES = {
  deferent: 'Deferent',
  epicycle: 'Epicycle',
  epicyclet: 'Epicyclet',
  equant: 'Equant',
  centre: 'Centre of the circle',
  crank: 'Circle carrying the deferent\'s centre',
  orbit: 'Orbit',
  focus: 'Empty focus',
  'swept-area': 'Area swept in equal time',
  'sphere-zodiacal': 'Sphere of the zodiacal motion',
  'sphere-third': 'Third sphere',
  'sphere-fourth': 'Fourth sphere, carrying the planet',
  'sphere-counteracting': 'Counteracting sphere',
  hippopede: 'Hippopede',
  wheel: 'Wheel of fire',
  crystalline: 'Crystalline shell',
  shell: 'Extent of the body\'s shell',
};

const SEGMENTS = 192;
const unitCircle = (() => {
  const pts = [];
  for (let i = 0; i < SEGMENTS; i += 1) {
    const t = (i / SEGMENTS) * Math.PI * 2;
    pts.push(Math.cos(t), Math.sin(t), 0);
  }
  const g = new BufferGeometry();
  g.setAttribute('position', new Float32BufferAttribute(pts, 3));
  return g;
})();

/** Same circle, closed explicitly and with line distances, which dashes require. */
const unitCircleDashed = (() => {
  const pts = [];
  for (let i = 0; i <= SEGMENTS; i += 1) {
    const t = (i / SEGMENTS) * Math.PI * 2;
    pts.push(Math.cos(t), Math.sin(t), 0);
  }
  const g = new BufferGeometry();
  g.setAttribute('position', new Float32BufferAttribute(pts, 3));
  const line = new Line(g);
  line.computeLineDistances();
  return g;
})();

const dotGeometry = new SphereGeometry(1, 16, 8);

function colorFor(guide, style) {
  if (style.color) return style.color;
  return guide.body && BODIES[guide.body] ? BODIES[guide.body].color : NEUTRAL;
}

function lineMaterial(color, style) {
  const common = { color, transparent: true, opacity: style.opacity, depthWrite: false };
  // Dash lengths are in the local units of a unit circle, so they scale with it.
  return style.dashed ? new LineDashedMaterial({ ...common, dashSize: 0.045, gapSize: 0.03 }) : new LineBasicMaterial(common);
}

/** One drawable. `update` repositions it; `object` is what lives in the scene. */
class Drawable {
  constructor(guide, scale) {
    this.type = guide.type;
    this.body = guide.body;
    this.role = guide.role;
    this.style = STYLES[guide.role] ?? FALLBACK;
    this.color = colorFor(guide, this.style);
    this.materials = [];
    this.version = undefined;
    this.build(guide, scale);
  }

  track(material) {
    material.userData.baseOpacity = material.opacity;
    this.materials.push(material);
    return material;
  }

  build(guide, scale) {
    const { style, color } = this;
    switch (guide.type) {
      case 'circle': {
        const material = this.track(lineMaterial(color, style));
        this.object = style.dashed ? new Line(unitCircleDashed, material) : new LineLoop(unitCircle, material);
        this.object.matrixAutoUpdate = false;
        break;
      }
      case 'line': {
        const g = new BufferGeometry();
        g.setAttribute('position', new Float32BufferAttribute(new Float32Array(6), 3).setUsage(DynamicDrawUsage));
        this.object = new Line(g, this.track(lineMaterial(color, style)));
        break;
      }
      case 'polyline': {
        const count = guide.points.length + (guide.closed ? 1 : 0);
        const g = new BufferGeometry();
        g.setAttribute('position', new Float32BufferAttribute(new Float32Array(count * 3), 3).setUsage(DynamicDrawUsage));
        this.object = new Line(g, this.track(lineMaterial(color, { ...style, dashed: false })));
        break;
      }
      case 'point': {
        this.object = new Group();
        this.dot = new Mesh(dotGeometry, this.track(new MeshBasicMaterial({ color, transparent: true, opacity: style.opacity, depthTest: false })));
        this.object.add(this.dot);
        if (guide.label) {
          const el = document.createElement('div');
          el.className = 'guide-label';
          el.textContent = guide.label;
          this.label = new CSS2DObject(el);
          this.label.center.set(0, 0.5);
          this.object.add(this.label);
        }
        break;
      }
      case 'torus': {
        // Mist outside, fire within: a translucent rim with a bright core line.
        this.object = new Group();
        this.object.matrixAutoUpdate = false;
        const rim = new Mesh(
          new TorusGeometry(1, guide.tube / guide.radius, 20, 160),
          this.track(new MeshBasicMaterial({ color: '#8f9bb3', transparent: true, opacity: style.opacity, depthWrite: false, side: DoubleSide })),
        );
        const fire = new LineLoop(unitCircle, this.track(new LineBasicMaterial({ color: '#ff9a3c', transparent: true, opacity: 0.9, blending: AdditiveBlending, depthWrite: false })));
        // Before the vents, which are holes in this mist. See drawOrder.js.
        rim.renderOrder = DRAW_ORDER.mist;
        fire.renderOrder = DRAW_ORDER.mist;
        this.object.add(rim, fire);
        break;
      }
      case 'annulus': {
        const g = new RingGeometry(guide.inner * scale, guide.outer * scale, 160, 1);
        this.object = new Mesh(g, this.track(new MeshBasicMaterial({ color, transparent: true, opacity: style.opacity, side: DoubleSide, depthWrite: false })));
        // RingGeometry lies in local XY; the ecliptic is the scene's XZ plane.
        this.object.rotation.x = -Math.PI / 2;
        this.static = true;
        break;
      }
      case 'shell': {
        // A cutaway: the lower half of the shell as a bowl, capped on the ecliptic
        // by a flat ring so that its thickness can be seen.
        this.object = new Group();
        const tint = new Color(color).lerp(new Color('#dfe9ff'), style.color ? 0 : 0.55);
        const bowl = (radius) =>
          new Mesh(
            new SphereGeometry(radius * scale, 96, 32, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2),
            this.track(new MeshBasicMaterial({ color: tint, transparent: true, opacity: style.opacity, side: DoubleSide, depthWrite: false })),
          );
        const cap = new Mesh(
          new RingGeometry(guide.inner * scale, guide.outer * scale, 160, 1),
          this.track(new MeshBasicMaterial({ color: tint, transparent: true, opacity: Math.min(1, style.opacity * 2.2), side: DoubleSide, depthWrite: false })),
        );
        cap.rotation.x = -Math.PI / 2;
        this.object.add(bowl(guide.outer), bowl(guide.inner), cap);
        this.static = true;
        break;
      }
      case 'fan': {
        const g = new BufferGeometry();
        g.setAttribute('position', new Float32BufferAttribute(new Float32Array((guide.points.length - 1) * 9), 3).setUsage(DynamicDrawUsage));
        this.object = new Mesh(g, this.track(new MeshBasicMaterial({ color, transparent: true, opacity: style.opacity, side: DoubleSide, depthWrite: false })));
        break;
      }
      default:
        throw new Error(`Unknown guide type: ${guide.type}`);
    }
    this.object.frustumCulled = false;
    this.object.traverse((child) => {
      child.frustumCulled = false;
    });
  }

  update(guide, scale, scratch) {
    switch (guide.type) {
      case 'circle':
        planeMatrix(this.object.matrix, guide.center, guide.u ?? X, guide.v ?? Y, guide.radius, scale);
        this.object.matrixWorldNeedsUpdate = true;
        break;
      case 'torus':
        planeMatrix(this.object.matrix, guide.center, guide.u ?? X, guide.v ?? Y, guide.radius, scale);
        this.object.matrixWorldNeedsUpdate = true;
        break;
      case 'line': {
        const p = this.object.geometry.attributes.position;
        toThree(guide.a, scale, scratch);
        p.setXYZ(0, scratch.x, scratch.y, scratch.z);
        toThree(guide.b, scale, scratch);
        p.setXYZ(1, scratch.x, scratch.y, scratch.z);
        p.needsUpdate = true;
        if (this.style.dashed) this.object.computeLineDistances();
        break;
      }
      case 'polyline': {
        // A versioned polyline changes only when its version does.
        if (guide.version !== undefined && guide.version === this.version) break;
        this.version = guide.version;
        const p = this.object.geometry.attributes.position;
        const n = guide.points.length;
        for (let i = 0; i < n; i += 1) {
          toThree(guide.points[i], scale, scratch);
          p.setXYZ(i, scratch.x, scratch.y, scratch.z);
        }
        if (guide.closed) {
          toThree(guide.points[0], scale, scratch);
          p.setXYZ(n, scratch.x, scratch.y, scratch.z);
        }
        p.needsUpdate = true;
        break;
      }
      case 'point':
        toThree(guide.pos, scale, this.object.position);
        break;
      case 'fan': {
        const p = this.object.geometry.attributes.position;
        const apex = toThree(guide.apex, scale, new Vector3());
        for (let i = 0; i < guide.points.length - 1; i += 1) {
          p.setXYZ(i * 3, apex.x, apex.y, apex.z);
          toThree(guide.points[i], scale, scratch);
          p.setXYZ(i * 3 + 1, scratch.x, scratch.y, scratch.z);
          toThree(guide.points[i + 1], scale, scratch);
          p.setXYZ(i * 3 + 2, scratch.x, scratch.y, scratch.z);
        }
        p.needsUpdate = true;
        break;
      }
      default:
        break; // annulus and shell are static
    }
  }

  dispose() {
    if (this.label) this.label.element.remove();
    for (const m of this.materials) m.dispose();
    this.object.traverse((child) => {
      const g = child.geometry;
      if (g && g !== unitCircle && g !== unitCircleDashed && g !== dotGeometry) g.dispose();
    });
  }
}

export class GuideLayer {
  /** @param {import('three').Group} parent */
  constructor(parent) {
    this.parent = parent;
    this.drawables = new Map();
    this.scratch = new Vector3();
    this.scale = 1;
  }

  /** Discards everything; called when the era changes. */
  configure({ scale }) {
    for (const d of this.drawables.values()) {
      this.parent.remove(d.object);
      d.dispose();
    }
    this.drawables.clear();
    this.scale = scale;
  }

  /**
   * @param {object} p
   * @param {object[]} p.guides records from the model for this frame
   * @param {string|null} p.selected
   * @param {{machinery:boolean, shells:boolean}} p.show
   * @param {boolean} [p.fromEarth] true in the view from the Earth, where only
   *   machinery that is a physical object in its worldview is drawn
   * @param {number} p.pixelSize scene units per CSS pixel at unit distance
   * @param {import('three').Vector3} p.cameraLocal camera position in the parent's frame
   */
  update({ guides, selected, show, fromEarth = false, pixelSize, cameraLocal }) {
    const seen = new Set();
    for (const guide of guides) {
      seen.add(guide.id);
      let d = this.drawables.get(guide.id);
      if (!d) {
        d = new Drawable(guide, this.scale);
        this.drawables.set(guide.id, d);
        this.parent.add(d.object);
      }
      const mine = selected !== null && guide.body === selected;
      // A deferent or an equant is a construction: nobody ever saw one in the sky.
      // Anaximander's wheels are rims of mist with the Sun as a hole in one of
      // them, and from his drum the arch of that wheel is the whole picture.
      const seenFromHere = !fromEarth || d.style.visibleFromEarth === true;
      const visible = show[d.style.group] && seenFromHere && (!d.style.onlySelected || mine);
      d.object.visible = visible;
      if (!visible) continue;

      if (!d.static) d.update(guide, this.scale, this.scratch);

      const strength = selected === null || mine || guide.body === null ? 1 : DIMMED;
      for (const m of d.materials) m.opacity = m.userData.baseOpacity * strength;

      if (d.dot) {
        // Marked points keep a constant size on screen.
        d.dot.scale.setScalar(3.2 * pixelSize * cameraLocal.distanceTo(d.object.position));
      }
      if (d.label) d.label.visible = mine;
    }
    for (const [id, d] of this.drawables) {
      if (!seen.has(id)) {
        d.object.visible = false;
        if (d.label) d.label.visible = false;
      }
    }
  }

  /**
   * The captions currently shown ("equant", "empty focus" and the like), with
   * where each sits on screen, for the stage to resolve against body names.
   * @returns {{label: CSS2DObject, rank: number, box: number[]}[]}
   */
  labelCandidates(camera, width, height) {
    const candidates = [];
    for (const d of this.drawables.values()) {
      if (!d.label || !d.label.visible || !d.object.visible) continue;
      const p = this.scratch.copy(d.object.position).applyMatrix4(this.parent.matrixWorld).project(camera);
      if (p.z < -1 || p.z > 1) continue;
      const chars = d.label.element.textContent.length;
      candidates.push({
        label: d.label,
        rank: CAPTION_RANK,
        box: labelBox(p.x, p.y, width, height, CAPTION_GAP, chars, CAPTION_CHAR_WIDTH, CAPTION_HALF_HEIGHT),
      });
    }
    return candidates;
  }

  /** Roles currently drawn for the selected body, for the legend. */
  rolesFor(body) {
    const roles = new Set();
    for (const d of this.drawables.values()) {
      if (d.object.visible && d.body === body && ROLE_NAMES[d.role]) roles.add(d.role);
    }
    return [...roles];
  }
}
