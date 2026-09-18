/**
 * The stage: owns the three.js scene and turns an era's model into a picture.
 *
 * Two views are offered. "The cosmos" stands outside and shows the machinery a
 * worldview posits. "The sky from Earth" stands where an observer stood and
 * shows what that machinery was built to reproduce. They are the same model at
 * the same instant, which is the point: every figure in the first exists to
 * account for the second.
 *
 * Everything belonging to the heavens hangs from one group, so the daily
 * rotation of a geocentric cosmos is a single rotation of that group.
 */
import {
  AmbientLight,
  BufferGeometry,
  Float32BufferAttribute,
  Group,
  Line,
  LineBasicMaterial,
  PerspectiveCamera,
  PointLight,
  Quaternion,
  Raycaster,
  Scene,
  SRGBColorSpace,
  Vector2,
  Vector3,
  WebGLRenderer,
} from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CSS2DRenderer } from 'three/addons/renderers/CSS2DRenderer.js';
import { atan2d, asind, wrap180, wrap360 } from '../core/angles.js';
import { celestialPoleInEcliptic } from '../core/sky.js';
import { JD_J2000, precessionToJ2000 } from '../core/time.js';
import { rotateZ, sub, toLonLat } from '../core/vec.js';
import { BODIES } from '../data/eras.js';
import { BodyLayer } from './bodies.js';
import { CameraMemory } from './cameraMemory.js';
import { toThree } from './frame.js';
import { COSMOS_FOV, DefaultFraming, FRAME_UNITS, cosmosDistance, skyAim } from './framing.js';
import { GuideLayer } from './guides.js';
import { resolveOverlaps } from './labels.js';
import { SkyControls } from './skyControls.js';
import { StarField } from './stars.js';
import { TrailLayer } from './trails.js';

const OBLIQUITY = 23.44;
/** Degrees the sky turns per day relative to the Earth: one sidereal rotation. */
const SIDEREAL_DEG_PER_DAY = 360.98564736629;
/** Above this many simulated days per second the daily rotation only flickers, so it is held still. */
export const DIURNAL_SPEED_LIMIT = 0.3;
/** Longest gap, in trail steps, that is filled in rather than treated as a jump. */
const MAX_TRAIL_CATCHUP = 48;
/**
 * Samples laid down behind a body when its trail starts afresh. A trail is a
 * record of where the body has been, so it should already exist on arrival: at
 * the usual step this reaches back about four years, enough for two retrograde
 * loops of Mars and four of Jupiter. It leaves room in the trail to grow.
 */
const TRAIL_PREFILL = 1000;

/** About which bodies circle the sky unless a model says otherwise: the pole of the ecliptic. */
const ECLIPTIC_POLE = [0, 0, 1];

/** Where an ecliptic is drawn the Sun's sky trail would only retrace it. */
const SUN_ONLY = new Set(['sun']);
const NOTHING = new Set();

const NEVER_TRAILED = new Set(['earth', 'io', 'europa', 'ganymede', 'callisto', 'titan']);
const Y_UP = new Vector3(0, 1, 0);

export class Stage {
  /**
   * @param {HTMLElement} container
   * @param {{onSelect: (id: string|null) => void, onUserLook: () => void}} callbacks
   */
  constructor(container, { onSelect, onUserLook }) {
    this.container = container;
    this.onSelect = onSelect;

    this.renderer = new WebGLRenderer({ antialias: true, logarithmicDepthBuffer: true });
    this.renderer.outputColorSpace = SRGBColorSpace;
    this.renderer.setClearColor(0x03050b);
    container.appendChild(this.renderer.domElement);

    this.labels = new CSS2DRenderer();
    this.labels.domElement.className = 'label-layer';
    container.appendChild(this.labels.domElement);

    this.scene = new Scene();
    this.camera = new PerspectiveCamera(COSMOS_FOV, 1, 1e-5, 1e7);
    this.scene.add(new AmbientLight(0xffffff, 0.09));

    this.heavens = new Group();
    this.scene.add(this.heavens);
    this.sunlight = new PointLight(0xfff4e0, 3.2, 0, 0);
    this.heavens.add(this.sunlight);

    this.stars = new StarField();
    this.heavens.add(this.stars.group);
    this.skyDome = new Group();
    this.heavens.add(this.skyDome);

    this.bodies = new BodyLayer(this.heavens);
    this.guides = new GuideLayer(this.heavens);
    this.trails = new TrailLayer(this.heavens, this.skyDome);

    const sightGeometry = new BufferGeometry();
    sightGeometry.setAttribute('position', new Float32BufferAttribute(new Float32Array(6), 3));
    this.sightLine = new Line(sightGeometry, new LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.55, depthWrite: false }));
    this.sightLine.frustumCulled = false;
    this.heavens.add(this.sightLine);

    this.orbit = new OrbitControls(this.camera, this.renderer.domElement);
    this.orbit.enableDamping = true;
    this.orbit.dampingFactor = 0.08;
    this.orbit.minDistance = 1e-4;
    this.orbit.maxDistance = 4000;
    this.skyControls = new SkyControls(this.renderer.domElement, onUserLook);

    this.view = 'cosmos';
    this.model = null;
    this.lastState = null;
    this.trailClock = null;
    this.wasFrozen = false;
    this.followed = new Vector3();
    this.hasFollowed = false;
    /** The body the outside camera rides along with, or null for the centre of the cosmos. */
    this.following = null;
    this.cameraMemory = new CameraMemory();
    this.framing = new DefaultFraming();
    // The camera is the user's once they have actually moved it. A pointer-down
    // is not that: it fires for the click that selects a body. See framing.js.
    this.orbit.addEventListener('start', () => this.framing.interactionStarted());
    this.orbit.addEventListener('end', () => this.framing.interactionEnded());
    this.orbit.addEventListener('change', () => this.framing.cameraChanged());
    // The controls apply a wheel zoom after closing the interaction, so report it directly.
    this.renderer.domElement.addEventListener(
      'wheel',
      () => {
        if (this.orbit.enabled) this.framing.relinquished();
      },
      { passive: true },
    );

    this.raycaster = new Raycaster();
    this.pointer = { x: 0, y: 0, moved: false };
    this.installPicking();

    this.scratch = { a: new Vector3(), b: new Vector3(), c: new Vector3(), q: new Quaternion(), q2: new Quaternion() };
    this.resize();
  }

  /** A press and release without a drag selects whatever body lies under the pointer. */
  installPicking() {
    const el = this.renderer.domElement;
    el.addEventListener('pointerdown', (e) => {
      this.pointer = { x: e.clientX, y: e.clientY, moved: false };
    });
    el.addEventListener('pointermove', (e) => {
      if (Math.hypot(e.clientX - this.pointer.x, e.clientY - this.pointer.y) > 5) this.pointer.moved = true;
    });
    el.addEventListener('pointerup', (e) => {
      if (this.pointer.moved) return;
      const rect = el.getBoundingClientRect();
      const ndc = new Vector2(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
      this.raycaster.setFromCamera(ndc, this.camera);
      const hits = this.raycaster.intersectObjects(this.bodies.pickables(), false);
      this.onSelect(hits.length ? hits[0].object.userData.bodyId : null);
    });
  }

  resize() {
    const width = this.container.clientWidth || 1;
    const height = this.container.clientHeight || 1;
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    this.renderer.setPixelRatio(ratio);
    this.renderer.setSize(width, height);
    this.labels.setSize(width, height);
    this.stars.setPixelRatio(ratio);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.width = width;
    this.height = height;
    // A window narrowed or a phone turned upright would otherwise cut the sides
    // off a cosmos that fitted a moment ago. Not if the user has moved the camera.
    if (this.model && this.framing.shouldReframe(this.view)) this.reframe();
  }

  /** Sets the outside camera to the whole-cosmos distance for the current viewport, keeping its direction. */
  reframe() {
    const direction = this.camera.position.clone().sub(this.orbit.target);
    if (direction.lengthSq() === 0) return;
    this.camera.position.copy(this.orbit.target).add(direction.setLength(this.defaultDistance()));
    this.orbit.update();
  }

  /** Installs an era: a new model, fresh visuals, and the camera framed on the whole cosmos. */
  setEra(era) {
    this.era = era;
    this.model = era.createModel();
    this.scale = FRAME_UNITS / this.model.frameRadius;
    this.geocentric = this.model.center === 'earth';
    this.bodies.configure({ model: this.model, features: era.features, scale: this.scale });
    this.guides.configure({ scale: this.scale });
    this.trails.configure();
    this.trailClock = null;
    this.lastState = null;
    this.hasFollowed = false;
    this.stars.setMagnitudeLimit(era.features.magnitudeLimit);
    // Sky trails are bounded by the angle swept about this axis, in scene coordinates.
    const axis = toThree(this.model.skyAxis ?? ECLIPTIC_POLE).normalize();
    this.skyAxis = [axis.x, axis.y, axis.z];
    // A remembered camera is a point in the previous era's coordinates and scale.
    // Restoring it here would undo the framing below, so it is forgotten.
    this.cameraMemory.invalidate();
    this.resetCamera();
  }

  /** Distance of the sphere that sky trails and the line of sight are projected onto, scene units. */
  get domeRadius() {
    // A geocentric cosmos has a real stellar sphere to project onto. Otherwise
    // the stars are too remote to share a picture with the orbits, so a nearer
    // dome around the Earth stands in for them.
    return this.geocentric ? this.model.starRadius * this.scale * 0.995 : FRAME_UNITS * 1.55;
  }

  /** Frames the whole cosmos, from the direction that suits this worldview, and stops following any body. */
  resetCamera() {
    this.camera.fov = COSMOS_FOV;
    this.camera.updateProjectionMatrix();
    this.following = null;
    this.orbit.target.set(0, 0, 0);
    this.camera.up.copy(Y_UP);
    const view = this.model?.defaultView ?? { azimuth: 0, elevation: 31 };
    this.placeCosmosCamera(this.defaultDistance(), view.azimuth, view.elevation);
    this.camera.lookAt(0, 0, 0);
    this.hasFollowed = false;
    this.orbit.update();
    this.framing.established();
  }

  /** How far back the outside camera must stand for this era's cosmos to fit this viewport. */
  defaultDistance() {
    const mustSee = (this.model?.fitHalfWidth ?? this.model?.frameRadius ?? 0) * (this.scale ?? 0);
    return cosmosDistance(mustSee, this.camera.aspect);
  }

  placeCosmosCamera(distance, azimuth, elevation) {
    const az = (azimuth * Math.PI) / 180;
    const el = (elevation * Math.PI) / 180;
    const offset = new Vector3(Math.sin(az) * Math.cos(el), Math.sin(el), Math.cos(az) * Math.cos(el)).multiplyScalar(distance);
    this.camera.position.copy(this.orbit.target).add(offset);
    this.orbit.update();
  }

  /**
   * Places the outside camera explicitly: distance in scene units, angles in
   * degrees. This is a deliberate placement, so the default framing no longer
   * stands and a later resize will leave the camera alone.
   */
  setCosmosCamera(distance, azimuth, elevation) {
    this.placeCosmosCamera(distance, azimuth, elevation);
    this.framing.relinquished();
  }

  setView(view) {
    if (view === this.view) return;
    this.view = view;
    const sky = view === 'sky';
    this.orbit.enabled = !sky;
    this.skyControls.enabled = sky;
    if (sky) {
      // Remember where the outside camera stood, so returning restores it.
      this.cameraMemory.save(this.camera.position, this.orbit.target);
      this.skyControls.setFov(60);
      this.pendingSkyAim = true;
    } else {
      this.camera.fov = COSMOS_FOV;
      this.camera.updateProjectionMatrix();
      this.camera.up.copy(Y_UP);
      // Null if the era changed while we were away: then frame the new cosmos whole.
      const remembered = this.cameraMemory.take();
      if (remembered) {
        this.camera.position.copy(remembered.position);
        this.orbit.target.copy(remembered.target);
        this.followed.copy(remembered.target);
        this.orbit.update();
        // The window may have changed shape while we were looking at the sky.
        if (this.framing.shouldReframe('cosmos')) this.reframe();
      } else {
        this.resetCamera();
      }
    }
  }

  /**
   * Moves the outside camera in to frame a body's own machinery, and rides along
   * with it from then on. Selecting a body does not do this by itself: one
   * usually wants to study a planet's circles with the whole cosmos still in view.
   */
  zoomToSelected(selected) {
    if (!selected || !this.lastState || this.view !== 'cosmos') return;
    const body = this.lastState.bodies[selected];
    if (!body) return;
    this.following = selected;
    // A close-up is the user's choice, so a later resize must not undo it.
    this.framing.relinquished();
    // A body with satellites is framed by the farthest of them. Otherwise frame
    // the largest small circle it carries; failing that, stand off by a
    // fraction of its distance from the centre.
    let radius = 0;
    for (const other of Object.values(this.lastState.bodies)) {
      if (other.parent === selected) {
        radius = Math.max(radius, Math.hypot(other.pos[0] - body.pos[0], other.pos[1] - body.pos[1], other.pos[2] - body.pos[2]) * 1.25);
      }
    }
    if (radius === 0) {
      const local = ['epicycle', 'epicyclet', 'wheel'];
      for (const g of this.lastState.guides) {
        if (g.body === selected && local.includes(g.role) && g.radius) radius = Math.max(radius, g.radius);
      }
    }
    if (radius === 0 && selected === 'earth' && this.model.drum) radius = this.model.drum.diameter * 0.8;
    if (radius === 0) radius = Math.max(Math.hypot(...body.pos) * 0.12, this.model.frameRadius * 0.004);
    const distance = radius * this.scale * 4.2;
    const direction = this.camera.position.clone().sub(this.orbit.target).normalize();
    this.camera.position.copy(this.orbit.target).add(direction.multiplyScalar(distance));
    this.orbit.update();
  }

  /** Rotation of the heavens about the celestial pole, and the matching orientation of the Earth. */
  diurnal(jd, enabled, frozen) {
    const { q, q2, a } = this.scratch;
    const pole = toThree(rotateZ(celestialPoleInEcliptic(OBLIQUITY), precessionToJ2000(jd)), 1, a).normalize();
    const align = q2.setFromUnitVectors(Y_UP, pole).clone();
    const turning = enabled && !frozen;
    const angle = (((SIDEREAL_DEG_PER_DAY * (jd - JD_J2000)) % 360) * Math.PI) / 180;

    if (this.model.diurnal === 'optional' && turning && this.view === 'cosmos') {
      // The heavens turn westward once a day; the Earth stays exactly as it was.
      this.heavens.quaternion.setFromAxisAngle(pole, -angle);
      return q.copy(this.heavens.quaternion).invert().multiply(align).clone();
    }
    this.heavens.quaternion.identity();
    if (this.model.diurnal === 'earth' && turning) {
      // The Earth turns eastward; the heavens are at rest.
      return q.setFromAxisAngle(pole, angle).multiply(align).clone();
    }
    return align;
  }

  /** Records where every trailed body is at one instant. */
  recordTrailSample(jd, frozen) {
    const { a, b } = this.scratch;
    const { bodies } = this.model.state(jd, { guides: false, freezeDiurnal: frozen });
    const observer = this.model.observer(jd);
    for (const [id, body] of Object.entries(bodies)) {
      if (NEVER_TRAILED.has(id) || (id === 'moon' && this.era.id !== 'anaximander')) continue;
      toThree(body.pos, this.scale, a);
      toThree(sub(body.pos, observer), 1, b).normalize();
      this.trails.sample(id, a, b, this.skyAxis);
    }
  }

  /**
   * Adds trail samples at fixed steps of simulated time, so trails do not depend
   * on frame rate.
   * @param {number} playDirection +1 when time runs forwards, -1 when backwards
   */
  sampleTrails(jd, frozen, playDirection) {
    const step = this.era.id === 'anaximander' && !frozen ? 1 / 240 : this.era.id === 'anaximander' ? 1 : 1.5;
    if (frozen !== this.wasFrozen) {
      this.trails.clear();
      this.trailClock = null;
      this.wasFrozen = frozen;
    }
    if (this.trailClock === null || Math.abs(jd - this.trailClock) > step * MAX_TRAIL_CATCHUP) {
      // The first frame, or a jump in time. Rather than draw a chord across the
      // gap, or start with nothing, lay the trail down behind the body: oldest
      // sample first, so that it fades toward the past. "Behind" follows the
      // direction of play, so running time backwards trails into the future.
      this.trails.clear();
      for (let k = TRAIL_PREFILL; k >= 1; k -= 1) this.recordTrailSample(jd - playDirection * k * step, frozen);
      this.trailClock = jd;
      return;
    }
    const direction = Math.sign(jd - this.trailClock);
    while (Math.abs(jd - this.trailClock) >= step) {
      this.trailClock += direction * step;
      this.recordTrailSample(this.trailClock, frozen);
    }
  }

  /**
   * Draws one frame.
   * @param {object} state the application state (see ui/app.js)
   */
  frame(state) {
    const { jd, selected, toggles } = state;
    const sky = this.view === 'sky';
    const frozen = Math.abs(state.speed) > DIURNAL_SPEED_LIMIT && state.playing;
    this.frozen = frozen;
    const { a, b, c } = this.scratch;

    const modelState = this.model.state(jd, { guides: true, selected, freezeDiurnal: frozen });
    this.lastState = modelState;
    const observer = this.model.observer(jd);
    const telescope = this.era.features.telescope || toggles.anachronisticTelescope;

    const earthSpin = this.diurnal(jd, toggles.diurnal, frozen);
    this.sampleTrails(jd, frozen, state.speed < 0 ? -1 : 1);

    if (modelState.bodies.sun) toThree(modelState.bodies.sun.pos, this.scale, this.sunlight.position);

    // The camera, before anything is sized relative to it.
    this.heavens.updateMatrixWorld(true);
    const observerWorld = this.heavens.localToWorld(toThree(observer, this.scale, a).clone());
    if (sky) {
      this.camera.position.copy(observerWorld);
      const target = selected && modelState.bodies[selected] ? modelState.bodies[selected] : null;
      // One decision, every frame. Arrival and tracking used to be decided
      // separately, and the frame after arrival undid what arrival had done.
      const aimAt = target ?? modelState.bodies.mars ?? modelState.bodies.sun;
      const toBody = toThree(sub(aimAt.pos, observer), 1, b);
      const aim = skyAim({
        horizon: this.model.skyFrame === 'horizon',
        pending: Boolean(this.pendingSkyAim),
        tracking: Boolean(toggles.track && target),
        toBody: [toBody.x, toBody.y, toBody.z],
        fov: this.skyControls.fov,
        // A body is not a point: magnified, the whole disc has to stay in the frame.
        bodyRadius: target ? this.bodies.angularRadius(selected, target, observer, telescope) : 0,
      });
      if (aim) this.skyControls.lookAlong(b.fromArray(aim));
      this.pendingSkyAim = false;
      this.skyControls.apply(this.camera);
    } else {
      // Keep the camera's offset from a followed body, so the view rides along with it.
      if (this.following && !modelState.bodies[this.following]) this.following = null;
      const target = this.following ? modelState.bodies[this.following].pos : [0, 0, 0];
      const targetWorld = this.heavens.localToWorld(toThree(target, this.scale, b).clone());
      if (this.hasFollowed) this.camera.position.add(c.copy(targetWorld).sub(this.followed));
      this.followed.copy(targetWorld);
      this.hasFollowed = true;
      this.orbit.target.copy(targetWorld);
      this.orbit.update();
    }
    this.camera.updateMatrixWorld(true);

    const cameraLocal = this.heavens.worldToLocal(this.camera.position.clone());
    const pixelSize = (2 * Math.tan((this.camera.fov * Math.PI) / 360)) / this.height;
    const observerLocal = toThree(observer, this.scale, new Vector3());

    // From the Earth the stars are a backdrop around the observer. From outside,
    // they sit on the sphere the worldview gives them.
    this.stars.place({
      center: sky ? observerLocal : new Vector3(0, 0, 0),
      radius: this.model.starRadius * this.scale,
      basis: modelState.starBasis ?? null,
      precession: precessionToJ2000(jd),
    });
    const hasEcliptic = this.model.skyFrame === 'ecliptic';
    this.stars.setVisibility({ figures: toggles.constellations, circles: toggles.circles && hasEcliptic && this.circlesMeaningful(sky) });

    this.bodies.update({
      bodies: modelState.bodies,
      camera: this.camera,
      viewportHeight: this.height,
      cameraLocal,
      observer,
      telescope,
      skyView: sky,
      selected,
      showLabels: toggles.labels,
      earthSpin,
    });
    this.guides.update({
      guides: modelState.guides,
      selected,
      show: { machinery: toggles.machinery, shells: toggles.shells },
      // From the Earth, geometrical constructions are only clutter, but physical
      // objects such as Anaximander's wheels are what one is looking at.
      fromEarth: sky,
      pixelSize,
      cameraLocal,
    });

    // Names and captions are resolved in one pass. Resolved separately, a
    // caption such as "empty focus" can print straight across a body's name.
    const labels = [
      ...this.bodies.labelCandidates(this.camera, this.width, this.height, selected),
      ...this.guides.labelCandidates(this.camera, this.width, this.height),
    ];
    for (const index of resolveOverlaps(labels)) labels[index].label.visible = false;

    this.skyDome.position.copy(observerLocal);
    this.skyDome.scale.setScalar(this.domeRadius);
    const sightOn = toggles.lineOfSight && !sky && selected && modelState.bodies[selected] && selected !== 'earth';
    this.trails.update({
      showSpace: toggles.trails && !sky,
      showSky: toggles.trails && (sky || Boolean(sightOn)),
      skyOnlyFor: sky ? null : selected,
      // With a body singled out, the others' paths recede, as their machinery does.
      emphasised: selected && modelState.bodies[selected] ? selected : null,
      exclude: NEVER_TRAILED,
      skyExclude: hasEcliptic ? SUN_ONLY : NOTHING,
    });

    this.sightLine.visible = Boolean(sightOn);
    if (sightOn) {
      const direction = toThree(sub(modelState.bodies[selected].pos, observer), 1, b).normalize();
      const end = c.copy(observerLocal).addScaledVector(direction, this.domeRadius);
      const p = this.sightLine.geometry.attributes.position;
      p.setXYZ(0, observerLocal.x, observerLocal.y, observerLocal.z);
      p.setXYZ(1, end.x, end.y, end.z);
      p.needsUpdate = true;
      this.sightLine.material.color.set(BODIES[selected].color);
    }

    this.renderer.render(this.scene, this.camera);
    this.labels.render(this.scene, this.camera);
  }

  /**
   * What an observer on the Earth would record for a body: where it is, how far
   * from the Sun it stands, and whether it is moving forwards or backwards.
   */
  readout(jd, id) {
    if (!this.model || !id) return null;
    const at = (t) => {
      // Evaluate in the same regime as the picture on screen.
      const { bodies } = this.model.state(t, { guides: false, freezeDiurnal: Boolean(this.frozen) });
      const o = this.model.observer(t);
      return { bodies, body: bodies[id], observer: o };
    };
    const now = at(jd);
    if (!now.body) return null;
    const v = sub(now.body.pos, now.observer);
    const distance = Math.hypot(...v);

    if (this.model.skyFrame === 'horizon') {
      // Anaximander's frame is the observer's own: x east, y north, z up.
      return { frame: 'horizon', altitude: asind(v[2] / distance), azimuth: wrap360(atan2d(v[0], v[1])), distance, units: this.model.units };
    }
    const here = toLonLat(v);
    const later = at(jd + 0.5);
    const drift = wrap180(toLonLat(sub(later.body.pos, later.observer)).lon - here.lon);
    const result = { frame: 'ecliptic', longitude: here.lon, latitude: here.lat, distance, units: this.model.units, retrograde: drift < 0 };
    if (id !== 'sun' && now.bodies.sun) {
      result.elongation = wrap180(here.lon - toLonLat(sub(now.bodies.sun.pos, now.observer)).lon);
    }
    // A body at the observer's own position has no direction.
    return distance === 0 ? null : result;
  }

  /**
   * Whether the ecliptic and equator are worth drawing. From the Earth, always.
   * From outside, only when the stellar sphere is near enough to share the
   * picture, as it is for Ptolemy or Tycho. Around a Copernican system the sphere
   * is thousands of times farther off, and all that shows of a great circle on it
   * is one unexplained line across the frame.
   */
  circlesMeaningful(sky) {
    return sky || this.model.starRadius <= 3 * this.model.frameRadius;
  }

  /** Roles of the machinery currently drawn for a body, for the legend. */
  legend(id) {
    return this.guides.rolesFor(id);
  }
}
