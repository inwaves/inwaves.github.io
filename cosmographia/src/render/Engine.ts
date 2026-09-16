import { WebGLRenderer } from 'three';
import { CSS2DRenderer } from 'three/addons/renderers/CSS2DRenderer.js';
import { Mechanism, timeContext } from '../models/mechanism';
import { getEra } from '../models/registry';
import { resolveOptions, type EraDefinition } from '../models/era';
import { MAX_JD, MIN_JD, useStore } from '../state/store';
import { CosmosView } from './cosmos/CosmosView';
import { SkyView } from './sky/SkyView';
import { setLineResolution } from './lines';
import { bodyReadout, clockReadout } from './readouts';
import { telescopeReadout } from './telescope';
import type { FrameContext } from './types';

const PUBLISH_INTERVAL = 0.15;
const CLICK_SLOP = 5;

/**
 * Owns the WebGL context, both views and the simulation clock. It reads UI state from the store
 * every frame and publishes clock and selection readouts back at a modest rate.
 */
export class Engine {
  private readonly renderer: WebGLRenderer;
  private readonly cosmosLabels = new CSS2DRenderer();
  private readonly skyLabels = new CSS2DRenderer();
  readonly cosmos: CosmosView;
  readonly sky = new SkyView();
  private mechanism: Mechanism | null = null;
  private era: EraDefinition | null = null;
  private modelKey = '';
  private jd = 0;
  private jumpNonce = -1;
  private lookNonce = -1;
  private focusNonce = -1;
  private cameraNonce = -1;
  private last = performance.now();
  private publishTimer = 0;
  private raf = 0;
  private width = 1;
  private height = 1;
  private pixelRatio = 1;
  private readonly observer: ResizeObserver;
  private pointer = { down: false, x: 0, y: 0, lastX: 0, lastY: 0, travel: 0 };
  private lastView = '';
  private disposed = false;

  constructor(private readonly container: HTMLElement) {
    this.renderer = new WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    this.renderer.setPixelRatio(this.pixelRatio);
    this.renderer.domElement.className = 'scene-canvas';
    container.appendChild(this.renderer.domElement);
    for (const labels of [this.cosmosLabels, this.skyLabels]) {
      labels.domElement.className = 'label-layer';
      container.appendChild(labels.domElement);
    }
    this.cosmos = new CosmosView(this.renderer.domElement);

    const canvas = this.renderer.domElement;
    canvas.addEventListener('pointerdown', this.onPointerDown);
    window.addEventListener('pointermove', this.onPointerMove);
    window.addEventListener('pointerup', this.onPointerUp);
    canvas.addEventListener('wheel', this.onWheel, { passive: false });
    canvas.addEventListener('dblclick', this.onDoubleClick);

    this.observer = new ResizeObserver(() => this.resize());
    this.observer.observe(container);
    this.resize();
  }

  start(): void {
    this.last = performance.now();
    const loop = (now: number) => {
      if (this.disposed) return;
      this.frame(now);
      this.raf = requestAnimationFrame(loop);
    };
    this.raf = requestAnimationFrame(loop);
  }

  dispose(): void {
    this.disposed = true;
    cancelAnimationFrame(this.raf);
    this.observer.disconnect();
    const canvas = this.renderer.domElement;
    canvas.removeEventListener('pointerdown', this.onPointerDown);
    window.removeEventListener('pointermove', this.onPointerMove);
    window.removeEventListener('pointerup', this.onPointerUp);
    canvas.removeEventListener('wheel', this.onWheel);
    canvas.removeEventListener('dblclick', this.onDoubleClick);
    this.cosmos.dispose();
    this.renderer.dispose();
    canvas.remove();
    this.cosmosLabels.domElement.remove();
    this.skyLabels.domElement.remove();
  }

  private resize(): void {
    const rect = this.container.getBoundingClientRect();
    this.width = Math.max(1, Math.floor(rect.width));
    this.height = Math.max(1, Math.floor(rect.height));
    this.renderer.setSize(this.width, this.height);
    this.cosmosLabels.setSize(this.width, this.height);
    this.skyLabels.setSize(this.width, this.height);
    this.cosmos.resize(this.width, this.height);
    this.sky.resize(this.width, this.height);
    setLineResolution(this.width, this.height);
  }

  private ensureModel(): void {
    const s = useStore.getState();
    const era = getEra(s.eraId);
    const options = resolveOptions(era, s.options[s.eraId]);
    const key = `${era.id}:${JSON.stringify(options)}`;
    if (key === this.modelKey) return;
    const eraChanged = this.era?.id !== era.id;
    this.modelKey = key;
    this.era = era;
    this.mechanism = new Mechanism(era.build(options));
    this.cosmos.setModel(this.mechanism, era);
    this.sky.setModel(this.mechanism, era.constellations);
    if (!eraChanged) this.cosmos.follow(s.focus.body);
  }

  private frame(now: number): void {
    const s = useStore.getState();
    const dt = Math.min(0.1, Math.max(0, (now - this.last) / 1000));
    this.last = now;
    this.ensureModel();
    const m = this.mechanism!;
    const era = this.era!;

    if (s.jump.nonce !== this.jumpNonce) {
      this.jumpNonce = s.jump.nonce;
      this.jd = s.jump.jd;
    } else if (s.playing && !s.introOpen) {
      this.jd += s.speed * dt;
      if (this.jd < MIN_JD || this.jd > MAX_JD) {
        this.jd = Math.max(MIN_JD, Math.min(MAX_JD, this.jd));
        useStore.setState({ playing: false });
      }
    }
    if (s.cameraReset !== this.cameraNonce) {
      this.cameraNonce = s.cameraReset;
      this.cosmos.resetCamera();
    }
    if (s.focus.nonce !== this.focusNonce) {
      this.focusNonce = s.focus.nonce;
      this.cosmos.follow(s.focus.body);
    }
    if (s.look.nonce !== this.lookNonce) {
      this.lookNonce = s.look.nonce;
      this.sky.lookAt(s.look.body);
    }

    const t = timeContext(this.jd);
    m.evaluate(t);
    const ctx: FrameContext = {
      t,
      mechanism: m,
      era,
      layers: s.layers,
      selected: s.selected,
      diurnalLock: s.diurnalLock,
      trailFrame: s.trailFrame,
      skyMode: s.skyMode,
      width: this.width,
      height: this.height,
      pixelRatio: this.pixelRatio,
      dt,
      speed: s.playing ? s.speed : 0,
    };

    if (s.view !== this.lastView) {
      this.lastView = s.view;
      this.cosmos.controls.enabled = s.view === 'cosmos';
      this.cosmosLabels.domElement.style.display = s.view === 'cosmos' ? '' : 'none';
      this.skyLabels.domElement.style.display = s.view === 'sky' ? '' : 'none';
    }
    if (s.view === 'cosmos') {
      this.cosmos.update(ctx);
      this.renderer.render(this.cosmos.scene, this.cosmos.camera);
      this.cosmosLabels.render(this.cosmos.scene, this.cosmos.camera);
    } else {
      this.sky.update(ctx);
      this.renderer.render(this.sky.scene, this.sky.camera);
      this.skyLabels.render(this.sky.scene, this.sky.camera);
    }

    this.publishTimer += dt;
    if (this.publishTimer >= PUBLISH_INTERVAL) {
      this.publishTimer = 0;
      useStore.setState({
        clock: clockReadout(era, t),
        readout: s.selected ? bodyReadout(m, s.selected, t) : null,
        telescope: s.telescopeOpen && s.selected ? telescopeReadout(m, era, s.selected) : null,
      });
    }
  }

  private onPointerDown = (e: PointerEvent) => {
    this.pointer = { down: true, x: e.clientX, y: e.clientY, lastX: e.clientX, lastY: e.clientY, travel: 0 };
  };

  private onPointerMove = (e: PointerEvent) => {
    if (!this.pointer.down) return;
    const dx = e.clientX - this.pointer.lastX;
    const dy = e.clientY - this.pointer.lastY;
    this.pointer.lastX = e.clientX;
    this.pointer.lastY = e.clientY;
    this.pointer.travel += Math.abs(dx) + Math.abs(dy);
    if (useStore.getState().view === 'sky' && this.pointer.travel > CLICK_SLOP) {
      this.sky.drag(dx, dy, this.height);
    }
  };

  private onPointerUp = (e: PointerEvent) => {
    if (!this.pointer.down) return;
    this.pointer.down = false;
    if (this.pointer.travel > CLICK_SLOP) return;
    const rect = this.renderer.domElement.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    if (x < 0 || y < 0 || x > rect.width || y > rect.height) return;
    const s = useStore.getState();
    const id = s.view === 'cosmos' ? this.cosmos.pick(x, y, this.width, this.height) : this.sky.pick(x, y, this.width, this.height);
    s.select(id);
  };

  private onDoubleClick = () => {
    const s = useStore.getState();
    if (!s.selected) return;
    if (s.view === 'cosmos') s.focusOn(s.selected);
    else s.lookAt(s.selected);
  };

  private onWheel = (e: WheelEvent) => {
    if (useStore.getState().view !== 'sky') return;
    e.preventDefault();
    this.sky.zoom(e.deltaY);
  };
}
