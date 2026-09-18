/**
 * The heavenly bodies, drawn as each era could know them.
 *
 * What a body looks like is gated by the era's features rather than by what is
 * true. Before the telescope a planet is a point of light, however closely you
 * look. Afterwards it is a globe lit by the Sun, so Venus shows phases. The
 * Moon gains mountains, Jupiter belts, and Saturn first Galileo's puzzling
 * companions and then Huygens's ring.
 *
 * One point light sits at the Sun in every era. Phases are therefore never
 * painted on: each arrangement of the cosmos produces the phases it implies,
 * which is what makes Ptolemy's Venus differ observably from Copernicus's.
 *
 * Bodies are vastly smaller than their orbits, so each is drawn at its true size
 * or at a minimum size in pixels, whichever is larger.
 */
import {
  AdditiveBlending,
  BufferGeometry,
  Color,
  CylinderGeometry,
  DoubleSide,
  Float32BufferAttribute,
  Group,
  Line,
  LineBasicMaterial,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Quaternion,
  RingGeometry,
  SphereGeometry,
  Sprite,
  SpriteMaterial,
  Vector3,
} from 'three';
import { CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import { BODIES } from '../data/eras.js';
import { BODY_RADIUS_KM, KM_PER_AU, KM_PER_EARTH_RADIUS, SATURN_RING } from '../data/elements.js';
import { RING_BASIS } from '../models/heliocentric.js';
import { DRAW_ORDER, isVent, ventBrightness, ventNarrowing } from './drawOrder.js';
import { onScreenRadius, toThree } from './frame.js';
import { labelBox } from './labels.js';
import { earthTexture, glowTexture, jupiterTexture, moonTexture, ringTexture } from './textures.js';

/** Apparent semi-diameter of the Sun and Moon, degrees. Both are about half a degree across. */
const LUMINARY_SEMIDIAMETER = 0.26;

/** Least radius on screen, CSS pixels, so that no body vanishes. */
const MIN_PIXELS = { sun: 9, moon: 4.5, earth: 6, comet: 3.5, satellite: 2.2, planet: 4.5 };

const SATELLITES = new Set(['io', 'europa', 'ganymede', 'callisto', 'titan']);
const Z_AXIS = new Vector3(0, 0, 1);

/** Which name survives when two would overprint; earlier wins. The selected body always wins. */
const LABEL_RANK = ['sun', 'earth', 'saturn', 'jupiter', 'mars', 'venus', 'mercury', 'moon', 'comet', 'titan', 'ganymede', 'callisto', 'io', 'europa'];
/** Gap between a body's limb and its name, CSS pixels. */
const LABEL_GAP = 6;
/** Rough metrics of a name as drawn, CSS pixels, for overlap testing. */
const LABEL_CHAR_WIDTH = 7;
const LABEL_HALF_HEIGHT = 8;

const unitSphere = new SphereGeometry(1, 48, 24);

function kmToModel(km, units) {
  if (units === 'au') return km / KM_PER_AU;
  if (units === 'earth-radii') return km / KM_PER_EARTH_RADIUS;
  return null;
}

class BodyVisual {
  constructor(id, context) {
    this.id = id;
    this.group = new Group();
    const color = new Color(BODIES[id].color);
    const { features, model, textures } = context;

    this.pointMaterial = new MeshBasicMaterial({ color });
    this.litMaterial = new MeshStandardMaterial({ color, roughness: 1, metalness: 0 });

    if (id === 'earth' && model.earthShape === 'drum') {
      // Anaximander's column drum. The cylinder's axis is local y, which is up.
      const { diameter, height } = model.drum;
      this.mesh = new Mesh(new CylinderGeometry(diameter / 2, diameter / 2, height, 64), this.litMaterial);
      this.litMaterial.color.set('#8a7b62');
      this.fixedSize = true;
      // The drum's axis is vertical in the scene, so seen from any direction its
      // half-width on screen is its radius. That is what a name to its right must clear.
      this.extentRadius = diameter / 2;
    } else {
      this.mesh = new Mesh(unitSphere, this.pointMaterial);
    }
    if (isVent(model, id)) {
      // A hole in the mist, so it is drawn after the mist and not veiled by it.
      // Marking the material transparent is what moves it into the later pass;
      // it stays fully opaque and still writes and tests depth, so the drum
      // hides it once it has set. See drawOrder.js.
      this.pointMaterial.transparent = true;
      this.mesh.renderOrder = DRAW_ORDER.vent;
    }
    this.group.add(this.mesh);

    if (id === 'earth' && !this.fixedSize) {
      this.litMaterial.map = textures.earth;
      this.litMaterial.color.set('#ffffff');
    }
    if (id === 'moon') {
      this.litMaterial.map = textures.moon(features.lunarRelief);
      this.litMaterial.color.set('#ffffff');
    }
    if (id === 'jupiter') this.beltedMap = textures.jupiter;

    // A soft halo: the Sun always, and any body seen only as a point of light.
    this.glow = new Sprite(
      new SpriteMaterial({ map: textures.glow, color, blending: AdditiveBlending, transparent: true, depthWrite: false }),
    );
    this.glow.scale.setScalar(id === 'sun' ? 7 : 4.5);
    this.group.add(this.glow);

    if (id === 'saturn') this.buildSaturn(features.saturn, textures);
    if (id === 'comet') this.buildTail();

    const el = document.createElement('div');
    el.className = 'body-label';
    el.textContent = BODIES[id].name;
    el.style.setProperty('--body-color', BODIES[id].color);
    this.label = new CSS2DObject(el);
    // Anchored at its left edge; the gap from the body is fixed padding in CSS.
    this.label.center.set(0, 0.5);
    this.group.add(this.label);
  }

  /** Galileo's Saturn of 1610 had two companions; Huygens's, from 1659, a flat ring. */
  buildSaturn(kind, textures) {
    const planetKm = BODY_RADIUS_KM.saturn;
    const tilt = new Quaternion().setFromUnitVectors(Z_AXIS, toThree(RING_BASIS.n).normalize());
    if (kind === 'ring') {
      const inner = SATURN_RING.innerKm / planetKm;
      const outer = SATURN_RING.outerKm / planetKm;
      const geometry = new RingGeometry(inner, outer, 128, 1);
      // Remap u to run radially so the banded texture reads as concentric rings.
      const pos = geometry.attributes.position;
      const uv = geometry.attributes.uv;
      for (let i = 0; i < pos.count; i += 1) {
        const r = Math.hypot(pos.getX(i), pos.getY(i));
        uv.setXY(i, (r - inner) / (outer - inner), 0.5);
      }
      const material = new MeshBasicMaterial({ map: textures.ring, transparent: true, side: DoubleSide, depthWrite: false });
      this.saturnExtra = new Mesh(geometry, material);
      this.saturnExtra.quaternion.copy(tilt);
    } else if (kind === 'ears') {
      this.saturnExtra = new Group();
      const along = toThree(RING_BASIS.u).normalize();
      for (const side of [-1, 1]) {
        const ear = new Mesh(unitSphere, this.litMaterial);
        ear.scale.setScalar(0.42);
        ear.position.copy(along).multiplyScalar(side * 1.75);
        this.saturnExtra.add(ear);
      }
    }
    if (this.saturnExtra) {
      // Only a telescope shows anything but a point.
      this.saturnExtra.visible = false;
      this.group.add(this.saturnExtra);
    }
  }

  buildTail() {
    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new Float32BufferAttribute([0, 0, 0, 0, 0, 0], 3));
    geometry.setAttribute('color', new Float32BufferAttribute([0.7, 0.95, 1, 0, 0, 0], 3));
    this.tail = new Line(geometry, new LineBasicMaterial({ vertexColors: true, transparent: true, blending: AdditiveBlending, depthWrite: false }));
    this.tail.frustumCulled = false;
  }

  dispose() {
    this.label.element.remove();
    this.pointMaterial.dispose();
    this.litMaterial.dispose();
    this.glow.material.dispose();
    if (this.fixedSize) this.mesh.geometry.dispose();
    if (this.tail) this.tail.geometry.dispose();
  }
}

export class BodyLayer {
  /** @param {import('three').Group} parent the group that carries the heavens */
  constructor(parent) {
    this.parent = parent;
    this.visuals = new Map();
    this.textures = {
      glow: glowTexture(),
      earth: earthTexture(),
      jupiter: jupiterTexture(),
      ring: ringTexture(),
      moonCache: new Map(),
      moon: (relief) => {
        if (!this.textures.moonCache.has(relief)) this.textures.moonCache.set(relief, moonTexture(relief));
        return this.textures.moonCache.get(relief);
      },
    };
    this.scratch = { a: new Vector3(), b: new Vector3() };
  }

  /** Discards every visual; called when the era changes. */
  configure({ model, features, scale }) {
    for (const visual of this.visuals.values()) {
      this.parent.remove(visual.group);
      if (visual.tail) this.parent.remove(visual.tail);
      visual.dispose();
    }
    this.visuals.clear();
    this.context = { model, features, textures: this.textures };
    this.model = model;
    this.features = features;
    this.scale = scale;
  }

  ensure(id) {
    let visual = this.visuals.get(id);
    if (!visual) {
      visual = new BodyVisual(id, this.context);
      this.visuals.set(id, visual);
      this.parent.add(visual.group);
      if (visual.tail) this.parent.add(visual.tail);
    }
    return visual;
  }

  /** True radius in model units, or null where the worldview implies no size. */
  trueRadius(id, distanceToObserver, telescope) {
    const { units } = this.model;
    if (id === 'sun' || id === 'moon') {
      if (units === 'earth-diameters') return 0.5; // "the Sun is equal to the Earth"
      if (units === 'au') return kmToModel(BODY_RADIUS_KM[id], units);
      // Elsewhere the scale of distances is not the real one, so size the
      // luminaries to look half a degree across from the Earth, as they do.
      return distanceToObserver * Math.tan((LUMINARY_SEMIDIAMETER * Math.PI) / 180);
    }
    if (id === 'earth') {
      if (units === 'schematic') return this.model.earthRadius;
      return kmToModel(BODY_RADIUS_KM.earth, units);
    }
    const km = BODY_RADIUS_KM[id];
    if (!km) return null;
    // In Ptolemy's units a modern planetary radius is meaningful only as the
    // anachronism of pointing a telescope at his cosmos.
    if (units === 'earth-radii') return telescope ? kmToModel(km, units) : null;
    return kmToModel(km, units);
  }

  /**
   * Angular semi-diameter of a body as the observer sees it, degrees, or zero
   * where the worldview implies no size. The minimum size on screen is left out:
   * it is a few pixels, and this exists so that a disc large enough to matter can
   * be kept whole inside the frame.
   * @param {string} id
   * @param {{pos:number[], aperture?:number}} body
   * @param {number[]} observer observer position, model units
   * @param {boolean} telescope
   */
  angularRadius(id, body, observer, telescope) {
    const distance = Math.hypot(body.pos[0] - observer[0], body.pos[1] - observer[1], body.pos[2] - observer[2]);
    if (distance === 0) return 0;
    const real = this.trueRadius(id, distance, telescope);
    if (real === null) return 0;
    const drawn = body.aperture === undefined ? real : real * ventNarrowing(body.aperture);
    return (Math.atan(drawn / distance) * 180) / Math.PI;
  }

  /**
   * @param {object} p
   * @param {Object<string,{pos:number[],aperture?:number}>} p.bodies
   * @param {import('three').PerspectiveCamera} p.camera
   * @param {number} p.viewportHeight CSS pixels
   * @param {import('three').Vector3} p.cameraLocal camera position in the heavens group's frame
   * @param {number[]} p.observer observer position, model units
   * @param {boolean} p.telescope whether planets are resolved into lit globes
   * @param {boolean} p.skyView
   */
  update({ bodies, camera, viewportHeight, cameraLocal, observer, telescope, skyView, selected, showLabels, earthSpin }) {
    const pixel = (2 * Math.tan((camera.fov * Math.PI) / 360)) / viewportHeight;
    const seen = new Set();
    const { a, b } = this.scratch;

    for (const [id, body] of Object.entries(bodies)) {
      seen.add(id);
      const visual = this.ensure(id);
      visual.group.visible = true;
      toThree(body.pos, this.scale, visual.group.position);

      const isSatellite = SATELLITES.has(id);
      const toObserver = Math.hypot(body.pos[0] - observer[0], body.pos[1] - observer[1], body.pos[2] - observer[2]);
      const lit = id === 'moon' || id === 'earth' ? true : id === 'sun' ? false : telescope;

      const perPixel = pixel * cameraLocal.distanceTo(visual.group.position);
      if (visual.fixedSize) {
        // Built at its true proportions in model units, so it takes the scene's scale.
        visual.group.scale.setScalar(this.scale);
        visual.screenRadius = onScreenRadius(visual.extentRadius * this.scale, perPixel, MIN_PIXELS.earth);
      } else {
        const kind = isSatellite ? 'satellite' : MIN_PIXELS[id] ? id : 'planet';
        const minimum = MIN_PIXELS[kind] * perPixel;
        const real = this.trueRadius(id, toObserver, telescope);
        let radius = Math.max(real === null ? 0 : real * this.scale, minimum);
        if (body.aperture !== undefined) radius *= ventNarrowing(body.aperture);
        visual.group.scale.setScalar(radius);
        visual.mesh.material = lit ? visual.litMaterial : visual.pointMaterial;
        visual.screenRadius = onScreenRadius(radius, perPixel, MIN_PIXELS[kind]);
      }

      // Through a telescope a disc can be dozens of pixels across, so the name is
      // set off from the limb rather than from the centre.
      const gap = Math.round(Math.min(visual.screenRadius, 400) + LABEL_GAP);
      if (gap !== visual.labelGap) {
        visual.labelGap = gap;
        visual.label.element.style.paddingLeft = `${gap}px`;
      }

      // Anaximander's Sun and Moon are fire seen through a vent, so they shine by themselves.
      if (isVent(this.model, id)) {
        visual.mesh.material = visual.pointMaterial;
        const open = body.aperture ?? 1;
        visual.pointMaterial.color.set(BODIES[id].color).multiplyScalar(ventBrightness(open));
        visual.glow.material.opacity = 0.2 + 0.8 * open;
        visual.glow.visible = true;
      } else {
        visual.glow.visible = id === 'sun' || (!lit && !visual.fixedSize);
      }

      if (id === 'jupiter' && visual.belted !== telescope) {
        // Swapping a map for none changes the shader, so it must be rebuilt.
        visual.belted = telescope;
        visual.litMaterial.map = telescope ? visual.beltedMap : null;
        visual.litMaterial.color.set(telescope ? '#ffffff' : BODIES.jupiter.color);
        visual.litMaterial.needsUpdate = true;
      }
      if (visual.saturnExtra) visual.saturnExtra.visible = telescope;
      if (id === 'earth' && earthSpin && !visual.fixedSize) visual.mesh.quaternion.copy(earthSpin);

      // In the view from Earth we stand inside the Earth, except on Anaximander's drum.
      if (id === 'earth') visual.group.visible = !skyView || visual.fixedSize;

      if (visual.tail) {
        // The tail hangs off the parent, not the body's group, so its visibility
        // has to be kept in step explicitly. It needs the Sun to point away from.
        visual.tail.visible = visual.group.visible && Boolean(bodies.sun);
      }
      if (visual.tail && bodies.sun) {
        // The tail streams away from the Sun and grows as the comet nears it.
        toThree(body.pos, this.scale, a);
        toThree(bodies.sun.pos, this.scale, b);
        const away = a.clone().sub(b);
        const r = away.length() / this.scale;
        away.normalize().multiplyScalar(Math.min(2.6, 1.6 / (r * r + 0.15)) * this.scale);
        const p = visual.tail.geometry.attributes.position;
        p.setXYZ(0, a.x, a.y, a.z);
        p.setXYZ(1, a.x + away.x, a.y + away.y, a.z + away.z);
        p.needsUpdate = true;
      }

      let labelVisible = showLabels && visual.group.visible;
      if (labelVisible && isSatellite && body.parent && bodies[body.parent]) {
        // Hide a moon's name while it is lost in the glare of its planet.
        toThree(bodies[body.parent].pos, this.scale, b);
        const apart = visual.group.position.distanceTo(b) / (pixel * cameraLocal.distanceTo(b));
        labelVisible = apart > 16;
      }
      visual.label.visible = labelVisible;
      visual.label.element.classList.toggle('selected', id === selected);
    }

    for (const [id, visual] of this.visuals) {
      if (!seen.has(id)) {
        visual.group.visible = false;
        visual.label.visible = false;
        if (visual.tail) visual.tail.visible = false;
      }
    }
  }

  /**
   * The names currently shown, with where each sits on screen and how much it
   * matters, for the stage to resolve against the guide captions in one pass.
   * The selected body outranks everything; otherwise LABEL_RANK decides.
   * @returns {{label: CSS2DObject, rank: number, box: number[]}[]}
   */
  labelCandidates(camera, width, height, selected) {
    const candidates = [];
    for (const [id, visual] of this.visuals) {
      if (!visual.label.visible) continue;
      const p = this.scratch.a.copy(visual.group.position).applyMatrix4(this.parent.matrixWorld).project(camera);
      if (p.z < -1 || p.z > 1) continue;
      candidates.push({
        label: visual.label,
        rank: id === selected ? -1 : LABEL_RANK.indexOf(id),
        box: labelBox(p.x, p.y, width, height, visual.labelGap ?? LABEL_GAP, BODIES[id].name.length, LABEL_CHAR_WIDTH, LABEL_HALF_HEIGHT),
      });
    }
    return candidates;
  }

  /** Meshes that can be clicked, with the body each belongs to. */
  pickables() {
    const list = [];
    for (const [id, visual] of this.visuals) {
      if (visual.group.visible) {
        visual.mesh.userData.bodyId = id;
        list.push(visual.mesh);
      }
    }
    return list;
  }

  positionOf(id, target) {
    const visual = this.visuals.get(id);
    return visual ? target.copy(visual.group.position) : null;
  }
}
