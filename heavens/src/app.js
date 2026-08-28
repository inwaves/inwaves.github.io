import * as THREE from 'three';
import { createScene } from './engine/scene.js';
import { Cosmos } from './engine/cosmos.js';
import { SkyDome } from './engine/stars.js';
import { CameraRig } from './engine/camera.js';
import { MODELS, modelIndexById } from './models/index.js';
import { dateToJD, jdToT, tToJD, formatDate, celestialPole, DAY_SIDEREAL } from './engine/time.js';
import { TAU } from './engine/motion.js';
import { buildTopbar } from './ui/topbar.js';
import { buildTimeline } from './ui/timeline.js';
import { buildControls, TOGGLES } from './ui/controls.js';
import { buildInfo } from './ui/info.js';
import { buildHelp } from './ui/help.js';

const SPEED_MIN = 0.01;
const SPEED_MAX = 1000;
const DIURNAL_MAX_SPEED = 0.5; // days per second above which the daily turn is frozen

export class App {
  constructor(root) {
    this.root = root;
    this.viewport = root.querySelector('#viewport');
    const s = createScene(this.viewport);
    this.renderer = s.renderer;
    this.labelRenderer = s.labelRenderer;
    this.scene = s.scene;
    this.camera = s.camera;
    this.controls = s.controls;

    this.world = new THREE.Group();
    this.scene.add(this.world);
    this.sky = new SkyDome();
    this.world.add(this.sky.group);
    this.rig = new CameraRig(this.camera, this.controls, this.renderer.domElement);
    this.rig.onUserLook = () => { if (this.followId) this.setFollow(null); };

    this.flags = Object.fromEntries(TOGGLES.map((tg) => [tg.id, tg.def]));
    this.frame = 'center';
    this.proportions = 'legible';
    this.followId = null;
    this.viewMode = 'orbit';
    this.paused = false;
    this.speed = 1;
    this.t = 0;
    this.stageIndex = -1;
    this.model = null;
    this.cosmos = null;

    this._tmp = new THREE.Vector3();
    this._pole = new THREE.Vector3();
    this._lastNow = performance.now();
    this._lastDateJD = null;
    this._raycaster = new THREE.Raycaster();
    this._pointer = new THREE.Vector2();
    this._labels = [];
    this._panels = ['topbar', 'info', 'controls', 'timeline'].map((id) => root.querySelector(`#${id}`));

    this._buildUI();
    this._bindKeys();
    this._bindPicking();
  }

  async start() {
    try {
      await this.sky.load(`${import.meta.env.BASE_URL}data/sky.json`);
    } catch (err) {
      console.warn('Star catalogue unavailable; using a procedural star field.', err);
      this.sky.buildProcedural();
    }
    const parseHash = () => {
      let raw = '';
      try {
        raw = decodeURIComponent(location.hash.slice(1));
      } catch {
        raw = '';
      }
      if (!raw.includes('=')) return { stage: raw };
      return Object.fromEntries(new URLSearchParams(raw).entries());
    };
    const applyHash = () => {
      const p = parseHash();
      this._applyingHash = true;
      try {
        let force = false;
        if ((p.scale === 'period' || p.scale === 'legible') && p.scale !== this.proportions) {
          this.proportions = p.scale;
          this.controlsUI.setProportions(p.scale);
          force = true;
        }
        this.loadStage(Math.max(0, modelIndexById(p.stage || '')), { force });
        if (p.view === 'earth' || p.view === 'orbit') this.setViewMode(p.view);
        if (p.frame === 'earth' || p.frame === 'center') this.setFrame(p.frame);
        if (p.speed && Number.isFinite(Number(p.speed))) this.setSpeed(Number(p.speed));
        if (p.follow) this.setFollow(p.follow);
        if (p.paused === '1' || p.paused === '0') this.setPaused(p.paused === '1');
      } finally {
        this._applyingHash = false;
      }
    };
    applyHash();
    window.addEventListener('hashchange', applyHash);
    document.getElementById('loading').hidden = true;
    this.renderer.setAnimationLoop((now) => this._frame(now));
  }

  // ------------------------------------------------------------------------------ UI

  _buildUI() {
    this.topbar = buildTopbar(this.root.querySelector('#topbar'), {
      onPlay: () => this.setPaused(!this.paused),
      onSpeed: (v) => this.setSpeed(v, true),
      onEpoch: () => this.resetTime(),
      onTogglePanel: (name) => this.togglePanel(name),
      onHelp: () => this.help.toggle(),
    });
    this.timeline = buildTimeline(this.root.querySelector('#timeline'), MODELS, (i) => this.loadStage(i));
    this.controlsUI = buildControls(this.root.querySelector('#controls'), {
      onFlag: (id, v) => this.setFlag(id, v),
      onView: (mode) => this.setViewMode(mode),
      onFollow: (id) => this.setFollow(id),
      onFrame: (f) => this.setFrame(f),
      onProportions: (p) => this.setProportions(p),
      onResetCamera: () => this.resetCamera(),
    });
    this.info = buildInfo(this.root.querySelector('#info'), {
      onPrev: () => this.loadStage(this.stageIndex - 1),
      onNext: () => this.loadStage(this.stageIndex + 1),
    });
    this.help = buildHelp(this.root.querySelector('#help'));
    for (const name of ['info', 'controls']) this.topbar.setPanelState(name, true);
    if (window.innerWidth < 860) this.togglePanel('controls');
  }

  togglePanel(name) {
    const panel = this.root.querySelector(`#${name}`);
    panel.classList.toggle('collapsed');
    const open = !panel.classList.contains('collapsed');
    this.topbar.setPanelState(name, open);
    if (open && window.innerWidth < 860) {
      // one panel at a time on small screens
      const other = name === 'info' ? 'controls' : 'info';
      this.root.querySelector(`#${other}`).classList.add('collapsed');
      this.topbar.setPanelState(other, false);
    }
  }

  _bindKeys() {
    window.addEventListener('keydown', (e) => {
      const tag = (e.target && e.target.tagName) || '';
      if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;
      switch (e.key) {
        case ' ': e.preventDefault(); this.setPaused(!this.paused); break;
        case 'ArrowRight': this.loadStage(this.stageIndex + 1); break;
        case 'ArrowLeft': this.loadStage(this.stageIndex - 1); break;
        case ']': this.setSpeed(this.speed * 2); break;
        case '[': this.setSpeed(this.speed / 2); break;
        case '0': this.resetTime(); break;
        case 'e': case 'E': this.setViewMode(this.viewMode === 'earth' ? 'orbit' : 'earth'); break;
        case 'r': case 'R': this.resetCamera(); break;
        case 'f': case 'F': this.setFollow(null); break;
        case 't': case 'T': this.setFlag('trails', !this.flags.trails); break;
        case 'm': case 'M': this.setFlag('mechanism', !this.flags.mechanism); break;
        case 's': case 'S': this.setFlag('spheres', !this.flags.spheres); break;
        case 'l': case 'L': this.setFlag('labels', !this.flags.labels); break;
        case 'd': case 'D': this.setFlag('diurnal', !this.flags.diurnal); break;
        case 'h': case 'H': case '?': this.help.toggle(); break;
        case 'Escape': this.help.hide(); break;
        default: return;
      }
    });
  }

  _bindPicking() {
    const dom = this.renderer.domElement;
    let down = null;
    dom.addEventListener('pointerdown', (e) => { down = { x: e.clientX, y: e.clientY }; });
    dom.addEventListener('pointerup', (e) => {
      if (!down) return;
      const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y);
      down = null;
      if (moved > 5 || !this.cosmos) return;
      const rect = dom.getBoundingClientRect();
      this._pointer.set(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
      this._raycaster.setFromCamera(this._pointer, this.camera);
      // Generous picking: bodies are small, so test against slightly inflated spheres.
      let best = null;
      const sphere = new THREE.Sphere();
      for (const mesh of this.cosmos.bodyMeshes) {
        if (!mesh.visible) continue;
        mesh.getWorldPosition(sphere.center);
        const dist = sphere.center.distanceTo(this.camera.position);
        sphere.radius = Math.max(mesh.geometry.boundingSphere?.radius || 0.2, dist * 0.012);
        const hit = this._raycaster.ray.intersectSphere(sphere, this._tmp);
        if (hit) {
          const d = hit.distanceTo(this.camera.position);
          if (!best || d < best.d) best = { d, id: mesh.userData.nodeId };
        }
      }
      if (best) this.setFollow(best.id);
    });
  }

  // --------------------------------------------------------------------------- state

  loadStage(i, { force = false, keepTime = false } = {}) {
    if (!this.sky.ready) return;
    if (i < 0 || i >= MODELS.length || (i === this.stageIndex && !force)) return;
    const model = MODELS[i];
    if (this.cosmos) this.cosmos.dispose();
    this.stageIndex = i;
    this.model = model;
    this.built = { id: model.id, ...model.build(this.proportions) };
    this._writeHash();
    this.cosmos = new Cosmos(this.built);
    this.world.add(this.cosmos.group);

    if (!keepTime) {
      this.t = this._epochT(model);
      this.setSpeed(model.defaultSpeed ?? 1);
      for (const tg of this.built.extras?.toggles || []) this.flags[tg.id] = tg.def;
      if (model.startPaused) this.setPaused(true);
    }
    this.cosmos.applyFlags(this.flags);
    this.cosmos.setFrame(this.frame === 'earth' ? 'earth' : null);
    this.cosmos.update(this.t);
    this.world.updateMatrixWorld(true);
    this._applySky();
    this.world.quaternion.identity();
    this.sky.group.quaternion.identity();

    if (this.followId && !this.cosmos.has(this.followId)) this.followId = null;
    if (this.viewMode === 'earth' && !this.cosmos.has('earth')) this.setViewMode('orbit');
    this.rig.reset(this.built.camera);
    this._applyEarthView();

    this.info.render(model, i, MODELS.length);
    this.timeline.setActive(i);
    this.controlsUI.setModel({ ...model, extras: this.built.extras }, this.cosmos.bodies(), this.flags);
    this.setFollow(this.followId);
    this._collectLabels();
    this._lastDateJD = null;
    this._updateDate();
  }

  /** Reflect stage and proportions in the URL (replaceState does not fire hashchange). */
  _writeHash() {
    if (this._applyingHash || !this.model) return;
    const hash = this.proportions === 'period' ? `#stage=${this.model.id}&scale=period` : `#${this.model.id}`;
    if (location.hash !== hash) history.replaceState(null, '', hash);
  }

  setProportions(p) {
    if (p !== 'legible' && p !== 'period') return;
    if (p === this.proportions) return;
    this.proportions = p;
    this.controlsUI.setProportions(p);
    if (this.stageIndex >= 0) this.loadStage(this.stageIndex, { force: true, keepTime: true });
    else this._writeHash();
  }

  _applySky() {
    const sk = this.built?.sky || {};
    const f = this.flags;
    this.sky.setRadius(sk.radius || 40);
    this.sky.setScatter(!!sk.scatter);
    this.sky.setVisibility({
      stars: f.stars,
      lines: f.lines,
      names: f.names,
      shell: f.stars && f.spheres && sk.shell !== false,
      ecliptic: f.ecliptic,
      signs: f.signs,
      wheels: !!sk.wheels && f.guides,
    });
  }

  _applyEarthView() {
    this.cosmos.setEarthView(this.viewMode === 'earth');
  }

  setFlag(id, value) {
    this.flags[id] = value;
    this.controlsUI.setFlag(id, value);
    this.cosmos?.applyFlags(this.flags);
    this._applySky();
    if (this.cosmos) this._applyEarthView();
  }

  setPaused(p) {
    this.paused = p;
    this.topbar.setPaused(p);
  }

  setSpeed(v, fromSlider = false) {
    this.speed = Math.min(SPEED_MAX, Math.max(SPEED_MIN, v));
    this.topbar.setSpeed(this.speed, { slider: !fromSlider });
  }

  /** Simulation time (days from J2000) at which a worldview opens. */
  _epochT(model) {
    if (model.epoch === 'now') return jdToT(Date.now() / 86400000 + 2440587.5);
    return jdToT(dateToJD(model.epoch.year, model.epoch.month, model.epoch.day));
  }

  resetTime() {
    const m = this.model;
    if (!m || !this.cosmos) return;
    this.t = this._epochT(m);
    this.cosmos.clearTrails();
  }

  setViewMode(mode) {
    if (!this.cosmos) return;
    if (mode === 'earth' && !this.cosmos.has('earth')) return;
    this.viewMode = mode;
    this.rig.setMode(mode);
    this.controlsUI.setView(mode);
    if (this.cosmos) this._applyEarthView();
    if (mode === 'earth' && this.followId) this._pointAt(this.followId);
  }

  setFollow(id) {
    this.followId = id && this.cosmos?.has(id) ? id : null;
    this.controlsUI.setFollow(this.followId);
    this.cosmos?.setHighlight(this.followId);
    if (!this.followId) return;
    if (this.viewMode === 'earth') {
      this._pointAt(this.followId);
    } else {
      const target = this.cosmos.worldPosition(this.followId, new THREE.Vector3());
      this.rig.focusOn(target, this.cosmos.focusDistance(this.followId));
    }
  }

  _pointAt(id) {
    const target = this.cosmos.worldPosition(id, new THREE.Vector3());
    const eye = this.cosmos.worldPosition('earth', new THREE.Vector3());
    if (target && eye) this.rig.pointAt(target, eye);
  }

  setFrame(f) {
    this.frame = f;
    this.controlsUI.setFrame(f);
    this.cosmos?.setFrame(f === 'earth' ? 'earth' : null);
  }

  resetCamera() {
    if (!this.model) return;
    if (this.viewMode === 'earth') {
      this.rig.yaw = Math.PI;
      this.rig.pitch = 0.15;
      this.rig.fov = 75;
      return;
    }
    this.followId = null;
    this.controlsUI.setFollow(null);
    this.cosmos?.setHighlight(null);
    this.rig.reset(this.built.camera);
  }

  // --------------------------------------------------------------------------- frame

  _frame(now) {
    const dt = Math.min(0.1, (now - this._lastNow) / 1000);
    this._lastNow = now;
    if (!this.paused) this.t += this.speed * dt;

    // Daily rotation: the sphere of stars (with whatever it carries) turns westward about
    // the celestial pole of date; in heliocentric models the Earth turns eastward instead.
    // Faster than DIURNAL_MAX_SPEED the rotation would alias into a blur, so the sky is then
    // shown at the same sidereal time each day, as a planetarium stepping by days does.
    const diurnal = this.flags.diurnal;
    const resolvable = this.paused || this.speed <= DIURNAL_MAX_SPEED;
    const angle = diurnal && resolvable ? -TAU * (((this.t / DAY_SIDEREAL) % 1 + 1) % 1) : 0;
    celestialPole(this.t, this._pole);
    this.world.quaternion.identity();
    this.sky.group.quaternion.identity();
    let earthSpin = 0;
    if (diurnal) {
      switch (this.model.diurnal) {
        case 'cosmos': this.world.quaternion.setFromAxisAngle(this._pole, angle); break;
        case 'stars': this.sky.group.quaternion.setFromAxisAngle(this._pole, angle); break;
        case 'earth': earthSpin = -angle; break;
        default: break;
      }
    }

    this.cosmos.update(this.t, { diurnalAngle: earthSpin });
    this.sky.setEpoch(this.t);

    let followPos = null;
    let eyePos = null;
    if (this.viewMode === 'earth') {
      eyePos = this.cosmos.worldPosition('earth', this._tmp);
      if (this.followId) this._pointAt(this.followId);
    } else if (this.followId) {
      followPos = this.cosmos.worldPosition(this.followId, this._tmp);
    }
    this.rig.update({ followPos, eyePos });

    this.renderer.render(this.scene, this.camera);
    this.labelRenderer.render(this.scene, this.camera);
    this._cullLabels();
    this._updateDate();
  }

  _collectLabels() {
    this._labels = [];
    this.scene.traverse((o) => { if (o.isCSS2DObject) this._labels.push(o); });
  }

  /** Hide any scene label whose anchor falls under a panel, so text never overprints the UI. */
  _cullLabels() {
    const rects = [];
    for (const p of this._panels) {
      if (!p || p.classList.contains('collapsed')) continue;
      rects.push(p.getBoundingClientRect());
    }
    const w = this.viewport.clientWidth;
    const h = this.viewport.clientHeight;
    const v = this._tmp;
    for (const l of this._labels) {
      const el = l.element;
      if (el.style.display === 'none') continue;
      l.getWorldPosition(v).project(this.camera);
      if (v.z < -1 || v.z > 1) continue;
      const x = ((v.x + 1) / 2) * w;
      const y = ((1 - v.y) / 2) * h;
      let hide = false;
      for (const r of rects) {
        if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) { hide = true; break; }
      }
      el.style.visibility = hide ? 'hidden' : '';
    }
  }

  _updateDate() {
    const jd = Math.floor(tToJD(this.t) + 0.5);
    if (jd === this._lastDateJD) return;
    this._lastDateJD = jd;
    this.topbar.setDate(formatDate(tToJD(this.t)));
  }
}
