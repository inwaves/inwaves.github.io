import {
  AdditiveBlending,
  BoxGeometry,
  BufferAttribute,
  BufferGeometry,
  CylinderGeometry,
  DodecahedronGeometry,
  DoubleSide,
  EdgesGeometry,
  Group,
  IcosahedronGeometry,
  Mesh,
  MeshBasicMaterial,
  Object3D,
  OctahedronGeometry,
  PerspectiveCamera,
  Points,
  Quaternion,
  RingGeometry,
  Scene,
  ShaderMaterial,
  SphereGeometry,
  Sprite,
  SpriteMaterial,
  TetrahedronGeometry,
  TorusGeometry,
  Vector3,
  Color,
} from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import type { LineMaterial } from 'three/addons/lines/LineMaterial.js';
import { DEG } from '../../astro/math';
import { gmstDeg } from '../../astro/time';
import { obliquityDeg, precessionMatrix } from '../../astro/frames';
import type { Mechanism } from '../../models/mechanism';
import type { BodyDef, ConstructDef, LinkDef, SectorDef } from '../../models/types';
import { SATURN_POLE_J2000 } from '../../models/shared/keplerian';
import type { FrameContext } from '../types';
import { LINE_STYLES, SHELL_STYLES, UI_COLORS } from '../palette';
import { circlePoints, createLineMaterial, createPolyline, createSegments, disposeLineMaterial, DynamicPolyline, ellipsePoints } from '../lines';
import { createBodyMaterial, createShellMaterial, createStarMaterial, createSunMaterial } from '../materials';
import { drumSideTexture, drumTopTexture, glowTexture, ringTexture, SURFACE_TEXTURES } from '../textures';
import { createStarGeometry } from '../starCatalog';
import { TrailSampler } from '../trails';
import { WindowCache } from '../windowCache';
import { anchoredBox, declutter, type LabelBox } from '../declutter';
import { LabelSizeCache } from '../labelSizes';
import { timeContext } from '../../models/mechanism';

const TRAIL_SAMPLES = 240;

interface ConstructVisual {
  object: Object3D;
  def: ConstructDef;
  nodeId: string;
  associatedBody: string | null;
  materials: (LineMaterial | ShaderMaterial | MeshBasicMaterial)[];
  baseOpacity: number[];
  label?: CSS2DObject;
}

interface BodyVisual {
  def: BodyDef;
  group: Group;
  spin: Group;
  mesh: Mesh;
  material: ShaderMaterial;
  glow?: Sprite;
  extras: Object3D[];
  label: CSS2DObject;
  labelEl: HTMLDivElement;
  tail?: DynamicPolyline;
}

interface LinkVisual {
  def: LinkDef;
  line: DynamicPolyline;
  material: LineMaterial;
  associatedBody: string | null;
  points: Float32Array;
}

interface TrailVisual {
  body: BodyDef;
  sampler: TrailSampler;
  line: DynamicPolyline;
  points: Float32Array;
  colors: Float32Array;
  rgb: [number, number, number];
}

interface SectorVisual {
  def: SectorDef;
  mesh: Mesh;
  geometry: BufferGeometry;
  cache: WindowCache<Vector3>;
}

const SECTOR_SUBDIVISIONS = 14;
const SECTOR_COLORS: [number, number, number][] = [
  [0.85, 0.7, 0.42],
  [0.52, 0.8, 0.88],
];

const sphereGeometry = new SphereGeometry(1, 48, 24);

function makeLabel(text: string, className: string): [CSS2DObject, HTMLDivElement] {
  const el = document.createElement('div');
  el.className = className;
  el.textContent = text;
  const obj = new CSS2DObject(el);
  obj.center.set(0, 1.4);
  return [obj, el];
}

/** The view from outside: the worldview's machinery in three dimensions. */
export class CosmosView {
  readonly scene = new Scene();
  readonly camera = new PerspectiveCamera(45, 1, 0.01, 20000);
  controls: OrbitControls;

  private readonly ecliptic = new Group();
  private readonly diurnal = new Group();
  private readonly content = new Group();
  private readonly nodeGroups = new Map<string, Group>();
  private constructs: ConstructVisual[] = [];
  private readonly bodies = new Map<string, BodyVisual>();
  private links: LinkVisual[] = [];
  private trails: TrailVisual[] = [];
  private sectors: SectorVisual[] = [];
  private readonly labelSizes = new LabelSizeCache();
  private stars: Points | null = null;
  private readonly starGroup = new Group();
  private mechanism: Mechanism | null = null;
  private followTarget: string | null = null;
  private readonly tmp = new Vector3();
  private readonly tmp2 = new Vector3();
  private readonly tmpQ = new Quaternion();
  private lastTrailFrame = '';
  private sunTime = 0;

  constructor(domElement: HTMLElement) {
    this.scene.background = new Color('#04060d');
    this.ecliptic.rotation.x = -Math.PI / 2;
    this.scene.add(this.ecliptic);
    this.ecliptic.add(this.diurnal);
    this.diurnal.add(this.content);
    this.content.add(this.starGroup);
    this.starGroup.matrixAutoUpdate = false;
    this.camera.position.set(60, 45, 90);
    this.controls = new OrbitControls(this.camera, domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.rotateSpeed = 0.6;
    this.controls.zoomSpeed = 1.1;
    this.controls.minDistance = 0.05;
    this.controls.maxDistance = 6000;
  }

  /** Rebuild the scene for a model. */
  setModel(mechanism: Mechanism, era: FrameContext['era']): void {
    this.clearModel();
    this.mechanism = mechanism;
    const model = mechanism.model;
    const bodyIds = new Set(model.bodies.map((b) => b.id));
    const associated = (nodeId: string, focus?: string) => {
      if (focus) return focus;
      const prefix = nodeId.split('.')[0];
      return bodyIds.has(prefix) && nodeId.includes('.') ? prefix : null;
    };

    for (const node of mechanism.nodes) {
      const group = new Group();
      this.content.add(group);
      this.nodeGroups.set(node.def.id, group);
      for (const def of node.def.constructs ?? []) {
        const visual = this.buildConstruct(def, node.def.id, associated(node.def.id, def.focusBody));
        group.add(visual.object);
        this.constructs.push(visual);
      }
    }

    for (const def of model.links ?? []) {
      const style = LINE_STYLES[def.style];
      const material = createLineMaterial(style);
      const line = new DynamicPolyline(2, material, false);
      this.content.add(line.line);
      this.links.push({ def, line, material, associatedBody: associated(def.from, def.focusBody), points: new Float32Array(6) });
    }

    const tint = era.knowledgeYear < 1500 ? 0.6 : era.knowledgeYear < 1680 ? 0.3 : 0;
    for (const def of model.bodies) {
      this.bodies.set(def.id, this.buildBody(def, tint));
    }

    for (const def of model.bodies) {
      if (!def.trailDays || def.kind === 'earth') continue;
      const rgb = new Color(def.appearance.color).toArray() as [number, number, number];
      const material = createLineMaterial({ color: UI_COLORS.trail, width: 1.6, opacity: 0.9 }, { vertexColors: true, additive: true });
      const line = new DynamicPolyline(TRAIL_SAMPLES + 1, material, true);
      this.content.add(line.line);
      const sampler = new TrailSampler(TRAIL_SAMPLES, (t, out) => this.trailPoint(def, t, out));
      this.trails.push({
        body: def,
        sampler,
        line,
        points: new Float32Array((TRAIL_SAMPLES + 1) * 3),
        colors: new Float32Array((TRAIL_SAMPLES + 1) * 3),
        rgb,
      });
    }

    for (const def of model.sectors ?? []) {
      const vertices = def.count * SECTOR_SUBDIVISIONS * 3;
      const geometry = new BufferGeometry();
      geometry.setAttribute('position', new BufferAttribute(new Float32Array(vertices * 3), 3));
      geometry.setAttribute('color', new BufferAttribute(new Float32Array(vertices * 3), 3));
      const mesh = new Mesh(
        geometry,
        new MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.32, side: DoubleSide, depthWrite: false, blending: AdditiveBlending }),
      );
      mesh.frustumCulled = false;
      this.content.add(mesh);
      this.sectors.push({ def, mesh, geometry, cache: new WindowCache<Vector3>() });
    }

    const starMaterial = createStarMaterial();
    this.stars = new Points(
      createStarGeometry({
        radius: model.stars.displayRadius,
        depthFactor: model.stars.mode === 'infinite' ? 5 : undefined,
        sizeScale: model.stars.mode === 'infinite' ? 0.9 : 0.8,
      }),
      starMaterial,
    );
    this.stars.frustumCulled = false;
    this.starGroup.add(this.stars);

    this.controls.target.set(0, 0, 0);
    const d = model.cameraDistance;
    this.camera.position.set(d * 0.55, d * 0.42, d * 0.72);
    this.camera.near = Math.max(0.005, d / 20000);
    this.camera.far = d * 400;
    this.camera.updateProjectionMatrix();
    this.controls.update();
    this.followTarget = null;
  }

  private trailPoint(def: BodyDef, t: FrameContext['t'], out: Vector3): Vector3 {
    const m = this.mechanism!;
    m.sample(def.node, t, 'display', out);
    if (this.lastTrailFrame === 'earth') {
      m.sample(m.model.observerNode, t, 'display', this.tmp2);
      out.sub(this.tmp2);
    }
    return out;
  }

  private buildConstruct(def: ConstructDef, nodeId: string, associatedBody: string | null): ConstructVisual {
    const materials: ConstructVisual['materials'] = [];
    const baseOpacity: number[] = [];
    let object: Object3D;
    let labelAnchor = new Vector3();
    switch (def.kind) {
      case 'sphere': {
        const style = SHELL_STYLES[def.style] ?? SHELL_STYLES.crystal!;
        const group = new Group();
        const mat = createShellMaterial({ ...style, opacity: def.opacity ?? style.opacity }, !!def.cutaway);
        const mesh = new Mesh(sphereGeometry, mat);
        mesh.scale.setScalar(def.radius);
        mesh.renderOrder = -2;
        group.add(mesh);
        materials.push(mat);
        baseOpacity.push(mat.uniforms.opacity.value as number);
        if (def.graticule && style.graticule) {
          const gm = createLineMaterial({ color: style.color, width: 1, opacity: style.graticule });
          const pts: number[] = [];
          for (let lat = -60; lat <= 60; lat += 30) {
            const r = Math.cos(lat * DEG) * def.radius;
            const z = Math.sin(lat * DEG) * def.radius;
            for (let i = 0; i < 96; i++) {
              const a0 = (i / 96) * Math.PI * 2;
              const a1 = ((i + 1) / 96) * Math.PI * 2;
              pts.push(r * Math.cos(a0), r * Math.sin(a0), z, r * Math.cos(a1), r * Math.sin(a1), z);
            }
          }
          for (let lon = 0; lon < 180; lon += 30) {
            const c = Math.cos(lon * DEG);
            const s = Math.sin(lon * DEG);
            for (let i = 0; i < 96; i++) {
              const a0 = (i / 96) * Math.PI * 2;
              const a1 = ((i + 1) / 96) * Math.PI * 2;
              const r = def.radius;
              pts.push(r * Math.cos(a0) * c, r * Math.cos(a0) * s, r * Math.sin(a0), r * Math.cos(a1) * c, r * Math.cos(a1) * s, r * Math.sin(a1));
            }
          }
          const seg = createSegments(new Float32Array(pts), gm);
          group.add(seg);
          materials.push(gm);
          baseOpacity.push(gm.opacity);
        }
        object = group;
        labelAnchor = new Vector3(0, -def.radius * 0.71, def.radius * 0.71);
        break;
      }
      case 'circle':
      case 'ellipse': {
        const style = LINE_STYLES[def.style];
        const mat = createLineMaterial({ ...style, dashed: style.dashed || (def.kind === 'circle' && def.dashed) });
        const pts = def.kind === 'circle' ? circlePoints(def.radius) : ellipsePoints(def.a, def.e);
        object = createPolyline(pts, mat);
        materials.push(mat);
        baseOpacity.push(mat.opacity);
        labelAnchor = def.kind === 'circle' ? new Vector3(def.radius * 0.707, def.radius * 0.707, 0) : new Vector3(0, def.a, 0);
        break;
      }
      case 'torus': {
        const style = SHELL_STYLES[def.style] ?? SHELL_STYLES.mist!;
        const mat = createShellMaterial(style, false);
        object = new Mesh(new TorusGeometry(def.radius, def.tube, 24, 160), mat);
        materials.push(mat);
        baseOpacity.push(style.opacity);
        labelAnchor = new Vector3(def.radius, 0, def.tube * 2);
        break;
      }
      case 'drum': {
        const mat = new MeshBasicMaterial({ color: '#8a6a45' });
        const mesh = new Mesh(new CylinderGeometry(def.radius, def.radius, def.height, 64), mat);
        mesh.rotation.x = Math.PI / 2;
        object = mesh;
        materials.push(mat);
        baseOpacity.push(1);
        break;
      }
      case 'axis': {
        const style = LINE_STYLES[def.style];
        const mat = createLineMaterial(style);
        const [dx, dy, dz] = def.direction ?? [0, 0, 1];
        const n = Math.hypot(dx, dy, dz) || 1;
        const L = def.length / n;
        object = createPolyline(new Float32Array([-dx * L, -dy * L, -dz * L, dx * L, dy * L, dz * L]), mat);
        materials.push(mat);
        baseOpacity.push(mat.opacity);
        labelAnchor = new Vector3(dx * L, dy * L, dz * L);
        break;
      }
      case 'marker': {
        const style = LINE_STYLES[def.style];
        const mat = createLineMaterial(style);
        const s = def.size;
        if (def.shape === 'ring') {
          object = createPolyline(circlePoints(s * 0.5, 48), mat);
        } else if (def.shape === 'cross') {
          object = createSegments(new Float32Array([-s, 0, 0, s, 0, 0, 0, -s, 0, 0, s, 0]), mat);
        } else {
          const dm = new MeshBasicMaterial({ color: style.color, transparent: true, opacity: style.opacity });
          object = new Mesh(sphereGeometry, dm);
          object.scale.setScalar(s * 0.3);
          materials.push(dm);
          baseOpacity.push(style.opacity);
          break;
        }
        materials.push(mat);
        baseOpacity.push(mat.opacity);
        labelAnchor = new Vector3(s, s, 0);
        break;
      }
      case 'polyhedron': {
        const style = LINE_STYLES[def.style];
        const geometries: Record<typeof def.solid, () => BufferGeometry> = {
          tetrahedron: () => new TetrahedronGeometry(def.circumradius),
          cube: () => new BoxGeometry((2 * def.circumradius) / Math.sqrt(3), (2 * def.circumradius) / Math.sqrt(3), (2 * def.circumradius) / Math.sqrt(3)),
          octahedron: () => new OctahedronGeometry(def.circumradius),
          dodecahedron: () => new DodecahedronGeometry(def.circumradius),
          icosahedron: () => new IcosahedronGeometry(def.circumradius),
        };
        const geometry = geometries[def.solid]();
        const group = new Group();
        const edges = new EdgesGeometry(geometry);
        const arr = edges.getAttribute('position').array as Float32Array;
        const mat = createLineMaterial(style);
        group.add(createSegments(new Float32Array(arr), mat));
        const faceMat = new MeshBasicMaterial({
          color: style.color,
          transparent: true,
          opacity: 0.05,
          side: DoubleSide,
          depthWrite: false,
          blending: AdditiveBlending,
        });
        group.add(new Mesh(geometry, faceMat));
        materials.push(mat, faceMat);
        baseOpacity.push(mat.opacity, 0.05);
        object = group;
        labelAnchor = new Vector3(0, 0, def.circumradius * 1.05);
        break;
      }
    }
    let label: CSS2DObject | undefined;
    if (def.label) {
      [label] = makeLabel(def.label, `construct-label construct-${def.style}`);
      label.position.copy(labelAnchor);
      object.add(label);
    }
    return { object, def, nodeId, associatedBody, materials, baseOpacity, label };
  }

  private buildBody(def: BodyDef, tint: number): BodyVisual {
    const a = def.appearance;
    const group = new Group();
    const spin = new Group();
    group.add(spin);
    this.content.add(group);
    let material: ShaderMaterial;
    let mesh: Mesh;
    const extras: Object3D[] = [];
    if (a.surface === 'sun' || a.surface === 'fire') {
      material = a.surface === 'sun' ? createSunMaterial('#fff4d6', '#ff9a2e') : createSunMaterial('#ffd08a', '#e2401a');
      mesh = new Mesh(sphereGeometry, material);
    } else if (a.shape === 'drum') {
      material = createBodyMaterial({ color: '#ffffff', map: drumTopTexture(), lit: false });
      const side = createBodyMaterial({ color: '#ffffff', map: drumSideTexture(), lit: false });
      mesh = new Mesh(new CylinderGeometry(1, 1, 2 / 3, 96), [side, material, side]);
      mesh.rotation.x = Math.PI / 2;
    } else {
      const textureFor: Partial<Record<typeof a.surface, () => ReturnType<(typeof SURFACE_TEXTURES)['earth']>>> = {
        earth: SURFACE_TEXTURES.earth,
        moon: SURFACE_TEXTURES.moon,
        jupiter: SURFACE_TEXTURES.jupiter,
        saturn: SURFACE_TEXTURES.saturn,
        mars: SURFACE_TEXTURES.mars,
        mercury: SURFACE_TEXTURES.mercury,
        venus: SURFACE_TEXTURES.venus,
        'counter-earth': SURFACE_TEXTURES.counter,
      };
      const map = textureFor[a.surface]?.() ?? null;
      material = createBodyMaterial({ color: map ? '#ffffff' : a.color, map, lit: true, tint: a.surface === 'earth' || a.surface === 'moon' ? tint : 0 });
      mesh = new Mesh(sphereGeometry, material);
      if (def.kind !== 'comet') mesh.rotation.x = Math.PI / 2;
    }
    spin.add(mesh);
    let glow: Sprite | undefined;
    if (a.glow) {
      glow = new Sprite(
        new SpriteMaterial({ map: glowTexture(), color: a.glow, blending: AdditiveBlending, depthWrite: false, transparent: true, opacity: a.emissive ? 0.9 : 0.35 }),
      );
      group.add(glow);
    }
    if (a.rings === 'rings') {
      const ringGeo = new RingGeometry(1.25, 2.3, 128, 1);
      // Remap UVs radially so the strip texture reads from inner to outer edge.
      const pos = ringGeo.getAttribute('position');
      const uv = ringGeo.getAttribute('uv');
      for (let i = 0; i < pos.count; i++) {
        const r = Math.hypot(pos.getX(i), pos.getY(i));
        uv.setXY(i, (r - 1.25) / (2.3 - 1.25), 0.5);
      }
      const ring = new Mesh(
        ringGeo,
        new MeshBasicMaterial({ map: ringTexture(), transparent: true, side: DoubleSide, depthWrite: false }),
      );
      // Saturn's ring plane: perpendicular to its IAU pole.
      ring.quaternion.setFromUnitVectors(new Vector3(0, 0, 1), SATURN_POLE_J2000);
      spin.add(ring);
      extras.push(ring);
    } else if (a.rings === 'ears') {
      const ears = new Group();
      ears.quaternion.setFromUnitVectors(new Vector3(0, 0, 1), SATURN_POLE_J2000);
      for (const side of [-1, 1]) {
        const ear = new Mesh(sphereGeometry, material);
        ear.scale.setScalar(0.42);
        ear.position.set(side * 1.55, 0, 0);
        ears.add(ear);
      }
      spin.add(ears);
      extras.push(ears);
    }
    let tail: DynamicPolyline | undefined;
    if (def.kind === 'comet') {
      const tm = createLineMaterial({ color: '#cfeeff', width: 3.5, opacity: 0.75 }, { additive: true });
      tail = new DynamicPolyline(2, tm, false);
      this.content.add(tail.line);
    }
    const [label, labelEl] = makeLabel(def.name, `body-label body-${def.kind}`);
    group.add(label);
    return { def, group, spin, mesh, material, glow, extras, label, labelEl, tail };
  }

  private clearModel(): void {
    const disposeObject = (obj: Object3D) => {
      obj.traverse((o) => {
        const m = o as Mesh;
        if (m.geometry && m.geometry !== sphereGeometry) m.geometry.dispose();
        const mat = (m as { material?: unknown }).material;
        const list = Array.isArray(mat) ? mat : mat ? [mat] : [];
        for (const x of list) {
          if ((x as LineMaterial).isLineMaterial) disposeLineMaterial(x as LineMaterial);
          else (x as ShaderMaterial).dispose?.();
        }
        if (o instanceof CSS2DObject) o.element.remove();
      });
    };
    for (const child of [...this.content.children]) {
      if (child === this.starGroup) continue;
      disposeObject(child);
      this.content.remove(child);
    }
    if (this.stars) {
      this.stars.geometry.dispose();
      (this.stars.material as ShaderMaterial).dispose();
      this.starGroup.remove(this.stars);
      this.stars = null;
    }
    this.nodeGroups.clear();
    this.constructs = [];
    this.bodies.clear();
    this.links = [];
    this.trails = [];
    this.sectors = [];
    this.labelSizes.clear();
  }

  /** Move the camera target smoothly onto a body and keep it there. */
  follow(bodyId: string | null): void {
    this.followTarget = bodyId;
  }

  resetCamera(): void {
    if (!this.mechanism) return;
    const d = this.mechanism.model.cameraDistance;
    this.followTarget = null;
    this.controls.target.set(0, 0, 0);
    this.camera.position.set(d * 0.55, d * 0.42, d * 0.72);
    this.controls.update();
  }

  update(ctx: FrameContext): void {
    const m = ctx.mechanism;
    if (m !== this.mechanism) return;
    const model = m.model;
    const t = ctx.t;
    const eps = obliquityDeg(t.T);
    const gmst = gmstDeg(t.ut);
    this.sunTime += ctx.dt;

    // Daily rotation: rotate the heavens about the celestial pole so the Earth stays still.
    const pole = this.tmp.set(0, Math.sin(eps * DEG), Math.cos(eps * DEG));
    if (ctx.diurnalLock && model.diurnal !== 'earth') this.diurnal.quaternion.setFromAxisAngle(pole, -gmst * DEG);
    else this.diurnal.quaternion.identity();

    // Anaximander's drum reads best with its flat top level: put the observer's zenith up.
    this.ecliptic.quaternion.setFromAxisAngle(this.tmp2.set(1, 0, 0), -Math.PI / 2);
    if (model.cosmosUp === 'zenith' && ctx.diurnalLock && model.diurnal === 'heavens') {
      const lat = ctx.era.location.lat * DEG;
      const lon = ctx.era.location.lon * DEG;
      const zenith = this.tmp2.set(Math.cos(lat) * Math.cos(lon), Math.cos(lat) * Math.sin(lon), Math.sin(lat));
      zenith.applyQuaternion(this.tmpQ.setFromAxisAngle(new Vector3(1, 0, 0), -eps * DEG));
      zenith.applyQuaternion(this.ecliptic.quaternion);
      this.ecliptic.quaternion.premultiply(this.tmpQ.setFromUnitVectors(zenith.normalize(), new Vector3(0, 1, 0)));
    }

    // Precess the star field to the equinox of date.
    this.starGroup.matrix.setFromMatrix3(precessionMatrix(t.T));
    this.starGroup.matrixWorldNeedsUpdate = true;
    if (this.stars) {
      const sm = this.stars.material as ShaderMaterial;
      sm.uniforms.pixelRatio.value = ctx.pixelRatio;
      sm.uniforms.scale.value = 1;
    }
    this.starGroup.visible = true;

    for (const node of m.nodes) {
      const g = this.nodeGroups.get(node.def.id)!;
      g.position.copy(node.displayPos);
      g.quaternion.copy(node.worldRot);
      g.scale.setScalar(node.childScale);
    }
    this.scene.updateMatrixWorld();

    const selected = ctx.selected;
    for (const c of this.constructs) {
      const layerOn = ctx.layers[c.def.layer];
      const unrelated = !!(selected && c.associatedBody && c.associatedBody !== selected);
      // Shells of other bodies are hidden outright: stacked translucent spheres are costly and add clutter.
      c.object.visible = layerOn && !(unrelated && (c.def.kind === 'sphere' || c.def.kind === 'torus'));
      if (!c.object.visible) continue;
      const dim = unrelated ? 0.1 : 1;
      c.materials.forEach((mat, i) => {
        if ((mat as LineMaterial).isLineMaterial) (mat as LineMaterial).opacity = c.baseOpacity[i] * dim;
        else if ((mat as ShaderMaterial).uniforms?.dim) (mat as ShaderMaterial).uniforms.dim.value = dim;
        else (mat as MeshBasicMaterial).opacity = c.baseOpacity[i] * dim;
      });
      if (c.label) {
        const show = ctx.layers.labels && (c.associatedBody === null || c.associatedBody === selected);
        c.label.visible = show;
      }
    }

    for (const link of this.links) {
      const on = ctx.layers[link.def.layer];
      link.line.line.visible = on;
      if (!on) continue;
      const a = m.node(link.def.from).displayPos;
      const b = m.node(link.def.to).displayPos;
      link.points.set([a.x, a.y, a.z, b.x, b.y, b.z]);
      link.line.update(link.points, 2);
      const dim = selected && link.associatedBody && link.associatedBody !== selected ? 0.18 : 1;
      link.material.opacity = LINE_STYLES[link.def.style].opacity * dim;
    }

    const sunNode = model.sunNode ? m.node(model.sunNode) : null;
    const camPos = this.camera.position;
    const worldPerPixel = (d: number) => (2 * d * Math.tan((this.camera.fov * DEG) / 2)) / ctx.height;
    for (const bv of this.bodies.values()) {
      const def = bv.def;
      const node = m.node(def.node);
      const visible = isVisibleAt(def, t.jd);
      bv.group.visible = visible;
      if (bv.tail) bv.tail.line.visible = visible;
      if (!visible) continue;
      bv.group.position.copy(node.displayPos);
      bv.group.updateMatrixWorld();
      const worldPos = this.tmp.setFromMatrixPosition(bv.group.matrixWorld);
      const d = worldPos.distanceTo(camPos);
      const minPx = def.kind === 'satellite' ? 2.2 : def.kind === 'comet' ? 3 : 3.5;
      const r = Math.max(def.appearance.radius, minPx * worldPerPixel(d));
      bv.spin.scale.setScalar(r);
      if (bv.glow) bv.glow.scale.setScalar(r * (def.appearance.emissive ? 9 : 4.5));

      // Orientation: the Earth turns once a sidereal day about the celestial pole.
      if (def.kind === 'earth') {
        bv.spin.quaternion.setFromAxisAngle(new Vector3(1, 0, 0), -eps * DEG);
        this.tmpQ.setFromAxisAngle(new Vector3(0, 0, 1), gmst * DEG);
        bv.spin.quaternion.multiply(this.tmpQ);
        if (def.appearance.shape === 'drum') {
          const lat = ctx.era.location.lat * DEG;
          const lon = ctx.era.location.lon * DEG;
          const zenith = new Vector3(Math.cos(lat) * Math.cos(lon), Math.cos(lat) * Math.sin(lon), Math.sin(lat));
          bv.spin.quaternion.multiply(new Quaternion().setFromUnitVectors(new Vector3(0, 0, 1), zenith));
        }
      }
      if (def.kind === 'satellite' || def.kind === 'planet' || def.kind === 'moon' || def.kind === 'counter-earth' || def.kind === 'earth') {
        if (sunNode) {
          const dir = this.tmp2.copy(sunNode.worldPos).sub(node.worldPos);
          if (dir.lengthSq() < 1e-12) dir.set(1, 0, 0);
          dir.normalize().transformDirection(this.content.matrixWorld);
          bv.material.uniforms.sunDir.value.copy(dir);
        }
      }
      if (bv.material.uniforms.time) bv.material.uniforms.time.value = this.sunTime;
      bv.label.visible = ctx.layers.labels;
      bv.labelEl.classList.toggle('selected', def.id === selected);

      if (bv.tail && sunNode) {
        const away = this.tmp2.copy(node.displayPos).sub(sunNode.displayPos).normalize();
        const len = Math.min(12, 0.9 / Math.max(0.05, node.worldPos.distanceTo(sunNode.worldPos)));
        const p = node.displayPos;
        bv.tail.update(new Float32Array([p.x, p.y, p.z, p.x + away.x * len, p.y + away.y * len, p.z + away.z * len]), 2);
      }
    }

    const frameKey = ctx.trailFrame;
    if (frameKey !== this.lastTrailFrame) {
      this.lastTrailFrame = frameKey;
      for (const tr of this.trails) tr.sampler.invalidate();
    }
    const observerDisplay = m.node(model.observerNode).displayPos;
    for (const tr of this.trails) {
      const on = ctx.layers.trails && isVisibleAt(tr.body, t.jd);
      tr.line.line.visible = on;
      if (!on) continue;
      const current = this.tmp.copy(m.node(tr.body.node).displayPos);
      if (frameKey === 'earth') current.sub(observerDisplay);
      const count = tr.sampler.fill(t.jd, tr.body.trailDays!, current, tr.points, tr.colors, tr.rgb);
      if (frameKey === 'earth') {
        for (let i = 0; i < count; i++) {
          tr.points[i * 3] += observerDisplay.x;
          tr.points[i * 3 + 1] += observerDisplay.y;
          tr.points[i * 3 + 2] += observerDisplay.z;
        }
      }
      tr.line.update(tr.points, count, tr.colors);
    }

    for (const sv of this.sectors) {
      const on = ctx.layers[sv.def.layer];
      sv.mesh.visible = on;
      if (!on) continue;
      this.updateSectors(sv, t.jd);
    }

    if (this.followTarget) {
      const bv = this.bodies.get(this.followTarget);
      if (bv && bv.group.visible) {
        const target = this.tmp.setFromMatrixPosition(bv.group.matrixWorld);
        const delta = this.tmp2.copy(target).sub(this.controls.target);
        const k = Math.min(1, ctx.dt * 6);
        this.controls.target.addScaledVector(delta, k);
        this.camera.position.addScaledVector(delta, k);
      }
    }
    this.controls.update();
    if (ctx.layers.labels) this.declutterLabels(ctx);
  }

  /** Hide body labels that would overlap a more important one on screen. */
  private declutterLabels(ctx: FrameContext): void {
    const boxes: LabelBox[] = [];
    const v = new Vector3();
    const priorityOf = (kind: string, id: string) =>
      id === ctx.selected ? 0 : kind === 'sun' || kind === 'earth' || kind === 'fire' ? 1 : kind === 'planet' ? 2 : kind === 'satellite' ? 4 : 3;
    for (const bv of this.bodies.values()) {
      if (!bv.group.visible || !bv.label.visible) continue;
      v.setFromMatrixPosition(bv.group.matrixWorld).project(this.camera);
      if (v.z > 1 || v.z < -1) continue;
      // Hidden labels measure zero (display:none); the cache keeps their last real size.
      const { width, height } = this.labelSizes.size(bv.def.id, bv.labelEl.offsetWidth, bv.labelEl.offsetHeight, {
        width: bv.def.name.length * 6.6 + 6,
        height: 20,
      });
      boxes.push(
        anchoredBox(
          bv.def.id,
          ((v.x + 1) / 2) * ctx.width,
          ((1 - v.y) / 2) * ctx.height,
          width,
          height,
          bv.label.center,
          priorityOf(bv.def.kind, bv.def.id),
        ),
      );
    }
    const shown = declutter(boxes);
    for (const box of boxes) {
      if (!shown.has(box.id)) this.bodies.get(box.id)!.label.visible = false;
    }
  }
  /** Kepler's second law: wedges swept in equal times, alternately coloured. */
  private updateSectors(sv: SectorVisual, jd: number): void {
    const m = this.mechanism!;
    const def = sv.def;
    const bodyNode = m.model.bodies.find((b) => b.id === def.body)?.node;
    if (!bodyNode) return;
    const step = def.periodDays / def.count;
    const sub = step / SECTOR_SUBDIVISIONS;
    const k0 = Math.floor(jd / step);
    const center = m.node(def.center).displayPos;
    const positions = sv.geometry.getAttribute('position') as BufferAttribute;
    const colors = sv.geometry.getAttribute('color') as BufferAttribute;
    const sample = (index: number): Vector3 => sv.cache.get(index, (i) => m.sample(bodyNode, timeContext(i * sub), 'display', new Vector3()));
    let v = 0;
    for (let w = 0; w < def.count; w++) {
      const startIndex = (k0 - w - 1) * SECTOR_SUBDIVISIONS;
      const [cr, cg, cb] = SECTOR_COLORS[(k0 - w) % 2 === 0 ? 0 : 1];
      const fade = 1 - (w / def.count) * 0.55;
      for (let s = 0; s < SECTOR_SUBDIVISIONS; s++) {
        const a = sample(startIndex + s);
        const b = sample(startIndex + s + 1);
        for (const p of [center, a, b]) {
          positions.setXYZ(v, p.x, p.y, p.z);
          colors.setXYZ(v, cr * fade * 0.5, cg * fade * 0.5, cb * fade * 0.5);
          v++;
        }
      }
    }
    positions.needsUpdate = true;
    colors.needsUpdate = true;
    // Keep only the window just drawn, whichever way time is running.
    sv.cache.retain((k0 - def.count - 1) * SECTOR_SUBDIVISIONS, k0 * SECTOR_SUBDIVISIONS);
  }

  /** Body nearest to a screen position (CSS px), within `radius` px. */
  pick(x: number, y: number, width: number, height: number, radius = 22): string | null {
    let best: string | null = null;
    let bestD = radius;
    const v = new Vector3();
    for (const bv of this.bodies.values()) {
      if (!bv.group.visible) continue;
      v.setFromMatrixPosition(bv.group.matrixWorld).project(this.camera);
      if (v.z > 1) continue;
      const sx = ((v.x + 1) / 2) * width;
      const sy = ((1 - v.y) / 2) * height;
      const d = Math.hypot(sx - x, sy - y);
      if (d < bestD) {
        bestD = d;
        best = bv.def.id;
      }
    }
    return best;
  }

  resize(width: number, height: number): void {
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }

  dispose(): void {
    this.clearModel();
    this.controls.dispose();
  }
}

/** Whether a time-limited body (a comet) is shown at a Julian Date. */
export function isVisibleAt(def: BodyDef, jd: number): boolean {
  return (def.visibleFrom === undefined || jd >= def.visibleFrom) && (def.visibleTo === undefined || jd <= def.visibleTo);
}
