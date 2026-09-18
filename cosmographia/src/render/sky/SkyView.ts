import {
  AdditiveBlending,
  BackSide,
  BufferAttribute,
  BufferGeometry,
  Color,
  Group,
  Matrix3,
  Mesh,
  PerspectiveCamera,
  Points,
  Quaternion,
  Scene,
  ShaderMaterial,
  SphereGeometry,
  Sprite,
  SpriteMaterial,
  Vector3,
} from 'three';
import { CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import type { LineMaterial } from 'three/addons/lines/LineMaterial.js';
import type { LineSegments2 } from 'three/addons/lines/LineSegments2.js';
import { DEG, seededRandom, ZODIAC_SIGNS } from '../../astro/math';
import { lstDeg } from '../../astro/time';
import { eclipticToHorizonMatrix, ECLIPTIC_TO_THREE, OBLIQUITY_J2000_DEG, obliquityDeg, precessionMatrix, raDecToEclipticJ2000 } from '../../astro/frames';
import { geocentric, TRUTH_BODIES, type TruthBodyId } from '../../astro/ephemeris';
import { NOVAE, novaMagnitude } from '../../astro/novae';
import type { Mechanism } from '../../models/mechanism';
import type { ConstellationSet } from '../../models/era';
import type { BodyDef } from '../../models/types';
import type { FrameContext } from '../types';
import { UI_COLORS } from '../palette';
import { circlePoints, createLineMaterial, createPolyline, createSegments, disposeLineMaterial, DynamicPolyline } from '../lines';
import { createBodyMaterial, createMarkerMaterial, createStarMaterial, createSunMaterial } from '../materials';
import { glowTexture, SURFACE_TEXTURES } from '../textures';
import { constellationLabels, constellationSegments, createStarGeometry, namedStars } from '../starCatalog';
import { TrailSampler } from '../trails';
import { isVisibleAt } from '../cosmos/CosmosView';
import { labelVisibleAt } from './labelVisibility';

const STAR_R = 1000;
const BODY_R = 900;
const TRAIL_R = 890;
const TRAIL_SAMPLES = 220;
const MARKER_CAPACITY = 64;

/** J2000 equatorial -> galactic rotation (rows are galactic axes). */
const EQ_TO_GAL = new Matrix3().set(
  -0.0548755604, -0.8734370902, -0.4838350155,
  0.4941094279, -0.44482963, 0.7469822445,
  -0.867666149, -0.1980763734, 0.4559837762,
);

const PLANET_PIXELS: Record<string, number> = { mercury: 6, venus: 10, mars: 8, jupiter: 9, saturn: 8 };

interface SkyTrail {
  body: BodyDef;
  sampler: TrailSampler;
  line: DynamicPolyline;
  points: Float32Array;
  colors: Float32Array;
  rgb: [number, number, number];
}

function label(text: string, className: string): CSS2DObject {
  const el = document.createElement('div');
  el.className = className;
  el.textContent = text;
  return new CSS2DObject(el);
}

/** The view from the Earth: the astronomer's sky, Stellarium-style. */
export class SkyView {
  readonly scene = new Scene();
  readonly camera = new PerspectiveCamera(70, 1, 0.5, 6000);

  private readonly skyRoot = new Group();
  private readonly j2000 = new Group();
  private readonly horizonRoot = new Group();
  private readonly atmosphere: Mesh;
  private readonly ground: Group;
  private readonly milkyWay: Mesh;
  private readonly stars: Points;
  private constellationLines: LineSegments2 | null = null;
  private constellationMaterial: LineMaterial | null = null;
  private constellationLabelObjects: CSS2DObject[] = [];
  private readonly starLabels: { obj: CSS2DObject; mag: number }[] = [];
  private readonly eclipticGroup = new Group();
  private readonly equatorGroup = new Group();
  /** Labels whose base visibility is simply "shown" (their groups carry the layer toggles). */
  private readonly gridLabels: CSS2DObject[] = [];
  private readonly horizonGrid = new Group();
  private readonly markers: Points;
  private readonly markerGeometry = new BufferGeometry();
  private readonly sun: Group;
  private readonly sunGlow: Sprite;
  private readonly moon: Mesh;
  private readonly moonMaterial: ShaderMaterial;
  private readonly bodyLabels = new Map<string, CSS2DObject>();
  private readonly ghostLabels = new Map<string, CSS2DObject>();
  private readonly ghostLines = new Map<string, DynamicPolyline>();
  private readonly novaLabels = new Map<string, CSS2DObject>();
  private trails: SkyTrail[] = [];
  private mechanism: Mechanism | null = null;
  private constellationSet: ConstellationSet | null = null;
  private readonly tmp = new Vector3();
  private readonly tmp2 = new Vector3();
  private readonly trailObserver = new Vector3();
  private readonly trailCurrent = new Vector3();
  private readonly observer = new Vector3();
  private readonly directions = new Map<string, Vector3>();
  private galacticT = Number.NaN;
  private time = 0;

  // Look state (horizon frame): azimuth from north through east, altitude, field of view.
  az = 180;
  alt = 20;
  fov = 75;
  private tracking: string | null = null;

  constructor() {
    this.scene.background = new Color('#02040a');
    this.scene.add(this.skyRoot, this.horizonRoot);
    this.skyRoot.matrixAutoUpdate = false;
    this.j2000.matrixAutoUpdate = false;
    this.skyRoot.add(this.j2000);

    this.atmosphere = this.buildAtmosphere();
    this.horizonRoot.add(this.atmosphere);
    this.milkyWay = this.buildMilkyWay();
    this.skyRoot.add(this.milkyWay);

    this.stars = new Points(createStarGeometry({ radius: STAR_R }), createStarMaterial());
    this.stars.frustumCulled = false;
    this.stars.renderOrder = 1;
    this.j2000.add(this.stars);

    for (const s of namedStars()) {
      const obj = label(s.name, 'sky-star-label');
      obj.position.copy(s.dir).multiplyScalar(STAR_R);
      obj.center.set(-0.12, 0.5);
      this.j2000.add(obj);
      this.starLabels.push({ obj, mag: s.mag });
    }

    this.buildEcliptic();
    this.buildEquator();
    this.buildHorizonGrid();
    this.ground = this.buildGround();
    this.horizonRoot.add(this.ground);

    const markerPositions = new Float32Array(MARKER_CAPACITY * 3);
    this.markerGeometry.setAttribute('position', new BufferAttribute(markerPositions, 3));
    this.markerGeometry.setAttribute('color', new BufferAttribute(new Float32Array(MARKER_CAPACITY * 3), 3));
    this.markerGeometry.setAttribute('size', new BufferAttribute(new Float32Array(MARKER_CAPACITY), 1));
    this.markerGeometry.setAttribute('alpha', new BufferAttribute(new Float32Array(MARKER_CAPACITY), 1));
    this.markerGeometry.setAttribute('shape', new BufferAttribute(new Float32Array(MARKER_CAPACITY), 1));
    this.markers = new Points(this.markerGeometry, createMarkerMaterial());
    this.markers.frustumCulled = false;
    this.markers.renderOrder = 3;
    this.skyRoot.add(this.markers);

    this.sun = new Group();
    const sunCore = new Mesh(new SphereGeometry(1, 32, 16), createSunMaterial('#fffbe8', '#ffc45a'));
    sunCore.scale.setScalar(BODY_R * Math.tan(0.27 * DEG) * 1.6);
    this.sun.add(sunCore);
    this.sunGlow = new Sprite(new SpriteMaterial({ map: glowTexture(), color: '#ffd98a', blending: AdditiveBlending, depthWrite: false, transparent: true }));
    this.sunGlow.scale.setScalar(150);
    this.sun.add(this.sunGlow);
    this.sun.renderOrder = 4;
    this.skyRoot.add(this.sun);

    this.moonMaterial = createBodyMaterial({ color: '#ffffff', map: SURFACE_TEXTURES.moon(), lit: true });
    this.moonMaterial.uniforms.ambient.value = 0.03;
    this.moon = new Mesh(new SphereGeometry(1, 48, 24), this.moonMaterial);
    this.moon.scale.setScalar(BODY_R * Math.tan(0.26 * DEG) * 2.2);
    this.moon.renderOrder = 4;
    this.skyRoot.add(this.moon);

    for (const nova of NOVAE) {
      const obj = label(nova.name, 'sky-nova-label');
      obj.position.copy(raDecToEclipticJ2000(nova.ra, nova.dec)).multiplyScalar(STAR_R);
      obj.center.set(-0.08, 1.2);
      this.j2000.add(obj);
      this.novaLabels.set(nova.id, obj);
    }

    this.updateCamera();
  }

  private buildAtmosphere(): Mesh {
    const material = new ShaderMaterial({
      uniforms: {
        sunDir: { value: new Vector3(0, -1, 0) },
        daylight: { value: 0 },
        enabled: { value: 1 },
      },
      vertexShader: /* glsl */ `
        varying vec3 vDir;
        void main() {
          vDir = normalize(position);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        uniform vec3 sunDir;
        uniform float daylight;
        uniform float enabled;
        varying vec3 vDir;
        void main() {
          vec3 d = normalize(vDir);
          float alt = d.y;
          vec3 nightZenith = vec3(0.004, 0.007, 0.018);
          vec3 nightHorizon = vec3(0.02, 0.028, 0.05);
          vec3 dayZenith = vec3(0.16, 0.36, 0.72);
          vec3 dayHorizon = vec3(0.62, 0.77, 0.92);
          float h = pow(1.0 - clamp(alt, 0.0, 1.0), 3.0);
          vec3 night = mix(nightZenith, nightHorizon, h);
          vec3 day = mix(dayZenith, dayHorizon, h);
          vec3 col = mix(night, day, daylight * enabled);
          // Twilight glow toward the Sun near the horizon.
          float sunAlt = sunDir.y;
          float towardSun = pow(max(dot(normalize(vec3(d.x, 0.0, d.z)), normalize(vec3(sunDir.x, 0.0, sunDir.z))), 0.0), 3.0);
          float twilight = smoothstep(-0.32, -0.02, sunAlt) * (1.0 - smoothstep(0.05, 0.3, sunAlt));
          col += vec3(0.55, 0.26, 0.08) * twilight * towardSun * h * enabled;
          float glow = pow(max(dot(d, normalize(sunDir)), 0.0), 64.0);
          col += vec3(1.0, 0.85, 0.6) * glow * daylight * enabled * 0.6;
          gl_FragColor = vec4(col, 1.0);
          #include <colorspace_fragment>
        }
      `,
      side: BackSide,
      depthWrite: false,
    });
    const mesh = new Mesh(new SphereGeometry(4000, 64, 32), material);
    mesh.renderOrder = -10;
    return mesh;
  }

  private buildMilkyWay(): Mesh {
    const material = new ShaderMaterial({
      uniforms: {
        toGalactic: { value: new Matrix3() },
        intensity: { value: 1 },
      },
      vertexShader: /* glsl */ `
        varying vec3 vLocal;
        varying vec3 vWorld;
        void main() {
          vLocal = position;
          vWorld = (modelMatrix * vec4(position, 1.0)).xyz;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        uniform mat3 toGalactic;
        uniform float intensity;
        varying vec3 vLocal;
        varying vec3 vWorld;
        float hash(vec3 p) { return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453); }
        float noise(vec3 p) {
          vec3 i = floor(p); vec3 f = fract(p); f = f * f * (3.0 - 2.0 * f);
          return mix(mix(mix(hash(i), hash(i + vec3(1,0,0)), f.x), mix(hash(i + vec3(0,1,0)), hash(i + vec3(1,1,0)), f.x), f.y),
                     mix(mix(hash(i + vec3(0,0,1)), hash(i + vec3(1,0,1)), f.x), mix(hash(i + vec3(0,1,1)), hash(i + vec3(1,1,1)), f.x), f.y), f.z);
        }
        void main() {
          vec3 g = toGalactic * normalize(vLocal);
          float b = asin(clamp(g.z, -1.0, 1.0));
          float l = atan(g.y, g.x);
          float width = 0.12 + 0.07 * pow(cos(l * 0.5), 2.0);
          float band = exp(-pow(b / width, 2.0)) * (0.45 + 0.55 * pow(cos(l * 0.5), 2.0));
          float bulge = exp(-(pow(l / 0.45, 2.0) + pow(b / 0.2, 2.0))) * 0.8;
          float rift = exp(-pow((b - 0.03) / 0.025, 2.0)) * smoothstep(-0.2, 0.3, l) * (1.0 - smoothstep(0.6, 1.3, l)) * 0.55;
          float n = noise(g * 9.0) * 0.55 + noise(g * 23.0) * 0.45;
          float v = (band + bulge) * (0.55 + 0.6 * n) - rift * band;
          float alt = normalize(vWorld).y;
          v *= smoothstep(-0.05, 0.25, alt) * 0.9 + 0.1;
          gl_FragColor = vec4(vec3(0.62, 0.66, 0.78) * max(v, 0.0) * 0.16 * intensity, 1.0);
        }
      `,
      side: BackSide,
      depthWrite: false,
      transparent: true,
      blending: AdditiveBlending,
    });
    const mesh = new Mesh(new SphereGeometry(3500, 96, 48), material);
    mesh.renderOrder = -5;
    return mesh;
  }

  private buildEcliptic(): void {
    const mat = createLineMaterial({ color: UI_COLORS.ecliptic, width: 1.3, opacity: 0.55 });
    this.eclipticGroup.add(createPolyline(circlePoints(STAR_R * 0.99, 360), mat));
    const ticks: number[] = [];
    for (let i = 0; i < 360; i += 5) {
      const a = i * DEG;
      const len = i % 30 === 0 ? 0.035 : 0.008;
      const r = STAR_R * 0.99;
      ticks.push(r * Math.cos(a), r * Math.sin(a), -r * len, r * Math.cos(a), r * Math.sin(a), r * len);
    }
    this.eclipticGroup.add(createSegments(new Float32Array(ticks), createLineMaterial({ color: UI_COLORS.ecliptic, width: 1.1, opacity: 0.6 })));
    ZODIAC_SIGNS.forEach((sign, i) => {
      const obj = label(`${sign.glyph} ${sign.name}`, 'sky-zodiac-label');
      const a = (i * 30 + 15) * DEG;
      obj.position.set(STAR_R * Math.cos(a), STAR_R * Math.sin(a), -STAR_R * 0.03);
      this.eclipticGroup.add(obj);
      this.gridLabels.push(obj);
    });
    const equinox = label('\u2648\uFE0E 0\u00B0 (vernal equinox)', 'sky-zodiac-label equinox');
    equinox.position.set(STAR_R, 0, STAR_R * 0.05);
    this.eclipticGroup.add(equinox);
    this.gridLabels.push(equinox);
    this.skyRoot.add(this.eclipticGroup);
  }

  private buildEquator(): void {
    const mat = createLineMaterial({ color: UI_COLORS.equator, width: 1.1, opacity: 0.35, dashed: true });
    const line = createPolyline(circlePoints(STAR_R * 0.99, 360), mat);
    mat.dashSize = 12;
    mat.gapSize = 10;
    this.equatorGroup.add(line);
    const eq = label('celestial equator', 'sky-grid-label');
    eq.position.set(0, STAR_R * 0.99, 0);
    this.equatorGroup.add(eq);
    this.gridLabels.push(eq);
    this.skyRoot.add(this.equatorGroup);
  }

  private buildHorizonGrid(): void {
    const pts: number[] = [];
    const R = STAR_R * 0.98;
    for (const altDeg of [30, 60]) {
      const r = R * Math.cos(altDeg * DEG);
      const y = R * Math.sin(altDeg * DEG);
      for (let i = 0; i < 180; i++) {
        const a0 = (i / 180) * Math.PI * 2;
        const a1 = ((i + 1) / 180) * Math.PI * 2;
        pts.push(r * Math.sin(a0), y, -r * Math.cos(a0), r * Math.sin(a1), y, -r * Math.cos(a1));
      }
    }
    for (let az = 0; az < 360; az += 30) {
      for (let i = 0; i < 20; i++) {
        const b0 = (i / 20) * 80 * DEG;
        const b1 = ((i + 1) / 20) * 80 * DEG;
        const s = Math.sin(az * DEG);
        const c = Math.cos(az * DEG);
        pts.push(R * Math.cos(b0) * s, R * Math.sin(b0), -R * Math.cos(b0) * c, R * Math.cos(b1) * s, R * Math.sin(b1), -R * Math.cos(b1) * c);
      }
    }
    this.horizonGrid.add(createSegments(new Float32Array(pts), createLineMaterial({ color: UI_COLORS.horizonGrid, width: 1, opacity: 0.18 })));
    const horizonLine = createPolyline(
      (() => {
        const p = circlePoints(R, 360);
        const out = new Float32Array(p.length);
        for (let i = 0; i < p.length; i += 3) {
          out[i] = p[i];
          out[i + 1] = 0;
          out[i + 2] = p[i + 1];
        }
        return out;
      })(),
      createLineMaterial({ color: '#c9b38a', width: 1.3, opacity: 0.4 }),
    );
    this.horizonGrid.add(horizonLine);
    const cardinals: [string, number][] = [
      ['N', 0],
      ['NE', 45],
      ['E', 90],
      ['SE', 135],
      ['S', 180],
      ['SW', 225],
      ['W', 270],
      ['NW', 315],
    ];
    for (const [name, az] of cardinals) {
      const obj = label(name, name.length === 1 ? 'sky-cardinal' : 'sky-cardinal minor');
      obj.position.set(R * Math.sin(az * DEG), R * 0.02, -R * Math.cos(az * DEG));
      this.horizonRoot.add(obj);
    }
    this.horizonRoot.add(this.horizonGrid);
  }

  private buildGround(): Group {
    const group = new Group();
    const material = new ShaderMaterial({
      uniforms: { daylight: { value: 0 } },
      vertexShader: /* glsl */ `
        varying float vAlt;
        void main() {
          vAlt = normalize(position).y;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        uniform float daylight;
        varying float vAlt;
        void main() {
          vec3 night = mix(vec3(0.028, 0.03, 0.036), vec3(0.012, 0.012, 0.016), clamp(-vAlt * 3.0, 0.0, 1.0));
          vec3 day = mix(vec3(0.33, 0.3, 0.22), vec3(0.16, 0.15, 0.11), clamp(-vAlt * 3.0, 0.0, 1.0));
          gl_FragColor = vec4(mix(night, day, daylight), 1.0);
          #include <colorspace_fragment>
        }
      `,
      side: BackSide,
    });
    // A low, irregular hill line so the horizon reads as a landscape rather than a ruler.
    const cols = 720;
    const R = 940;
    const rand = seededRandom(42);
    const heights: number[] = [];
    let h = 0;
    for (let i = 0; i < cols; i++) {
      h = h * 0.93 + (rand() - 0.5) * 3.2;
      heights.push(Math.max(-2, h));
    }
    const positions: number[] = [];
    const indices: number[] = [];
    const bottom = -R * 0.8;
    for (let i = 0; i <= cols; i++) {
      const a = (i / cols) * Math.PI * 2;
      const top = 3 + heights[i % cols] * 2.2 + 6 * Math.sin(a * 3 + 1) + 4 * Math.sin(a * 7);
      positions.push(R * Math.sin(a), Math.max(top, -2), -R * Math.cos(a), R * Math.sin(a) * 0.2, bottom, -R * Math.cos(a) * 0.2);
    }
    for (let i = 0; i < cols; i++) {
      const a = i * 2;
      indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
    const g = new BufferGeometry();
    g.setAttribute('position', new BufferAttribute(new Float32Array(positions), 3));
    g.setIndex(indices);
    const hills = new Mesh(g, material);
    hills.material.side = 2;
    hills.renderOrder = 5;
    group.add(hills);
    const floor = new Mesh(new SphereGeometry(930, 64, 16, 0, Math.PI * 2, Math.PI / 2 + 0.01, Math.PI / 2), material);
    floor.renderOrder = 5;
    group.add(floor);
    return group;
  }

  /** Adopt a model and its constellation set. */
  setModel(mechanism: Mechanism, constellations: ConstellationSet): void {
    this.mechanism = mechanism;
    for (const tr of this.trails) {
      this.skyRoot.remove(tr.line.line);
      disposeLineMaterial(tr.line.line.material as LineMaterial);
      tr.line.dispose();
    }
    this.trails = [];
    for (const obj of this.bodyLabels.values()) {
      obj.element.remove();
      this.skyRoot.remove(obj);
    }
    this.bodyLabels.clear();
    this.directions.clear();

    for (const def of mechanism.model.bodies) {
      if (def.id === mechanism.model.earthBody || def.inSky === false) continue;
      const obj = label(def.name, `sky-body-label sky-${def.kind}`);
      obj.center.set(-0.15, 1.1);
      this.skyRoot.add(obj);
      this.bodyLabels.set(def.id, obj);
      // The Sun's path is the ecliptic itself; trails are for bodies whose paths tell a story.
      if (def.trailDays && def.kind !== 'satellite' && def.kind !== 'sun' && def.kind !== 'fire') {
        const rgb = new Color(def.appearance.color).toArray() as [number, number, number];
        const material = createLineMaterial({ color: '#ffffff', width: 1.5, opacity: 0.85 }, { vertexColors: true, additive: true });
        const line = new DynamicPolyline(TRAIL_SAMPLES + 1, material, true);
        line.line.renderOrder = 2;
        this.skyRoot.add(line.line);
        const sampler = new TrailSampler(TRAIL_SAMPLES, (t, out) => {
          mechanism.sample(def.node, t, 'true', out);
          mechanism.sample(mechanism.model.observerNode, t, 'true', this.trailObserver);
          return out.sub(this.trailObserver).normalize().multiplyScalar(TRAIL_R);
        });
        this.trails.push({
          body: def,
          sampler,
          line,
          points: new Float32Array((TRAIL_SAMPLES + 1) * 3),
          colors: new Float32Array((TRAIL_SAMPLES + 1) * 3),
          rgb,
        });
      }
    }

    if (constellations !== this.constellationSet) {
      this.constellationSet = constellations;
      if (this.constellationLines) {
        this.j2000.remove(this.constellationLines);
        this.constellationLines.geometry.dispose();
        disposeLineMaterial(this.constellationMaterial!);
      }
      this.constellationMaterial = createLineMaterial({ color: UI_COLORS.constellation, width: 1, opacity: 0.32 });
      this.constellationLines = createSegments(constellationSegments(constellations, STAR_R * 0.995), this.constellationMaterial);
      this.constellationLines.renderOrder = 1;
      this.j2000.add(this.constellationLines);
      for (const obj of this.constellationLabelObjects) {
        obj.element.remove();
        this.j2000.remove(obj);
      }
      this.constellationLabelObjects = constellationLabels(constellations).map((c) => {
        const obj = label(c.name, 'sky-constellation-label');
        obj.position.copy(c.dir).multiplyScalar(STAR_R);
        this.j2000.add(obj);
        return obj;
      });
    }
  }

  /** Point the view at a body and keep tracking it until the user drags. */
  lookAt(bodyId: string | null): void {
    this.tracking = bodyId;
  }

  drag(dx: number, dy: number, height: number): void {
    this.tracking = null;
    const k = this.fov / height;
    this.az = (this.az - dx * k + 360) % 360;
    this.alt = Math.max(-85, Math.min(89.5, this.alt + dy * k));
    this.updateCamera();
  }

  zoom(deltaY: number): void {
    this.fov = Math.max(1.5, Math.min(120, this.fov * Math.pow(1.0015, deltaY)));
    this.camera.fov = this.fov;
    this.camera.updateProjectionMatrix();
  }

  private updateCamera(): void {
    const a = this.az * DEG;
    const b = this.alt * DEG;
    this.camera.position.set(0, 0, 0);
    this.camera.up.set(0, 1, 0);
    this.camera.lookAt(Math.sin(a) * Math.cos(b), Math.sin(b), -Math.cos(a) * Math.cos(b));
    this.camera.fov = this.fov;
    this.camera.updateProjectionMatrix();
  }

  /** Direction (three world) of a body this frame, if drawn. */
  worldDirection(bodyId: string, out: Vector3): Vector3 | null {
    const d = this.directions.get(bodyId);
    if (!d) return null;
    return out.copy(d).applyMatrix4(this.skyRoot.matrixWorld).normalize();
  }

  update(ctx: FrameContext): void {
    const m = ctx.mechanism;
    if (m !== this.mechanism) return;
    const model = m.model;
    const t = ctx.t;
    this.time += ctx.dt;
    const eps = obliquityDeg(t.T);
    const horizon = ctx.skyMode === 'horizon';
    const loc = ctx.era.location;

    if (horizon) eclipticToHorizonMatrix(eps, lstDeg(t.ut, loc.lon), loc.lat, this.skyRoot.matrix);
    else this.skyRoot.matrix.copy(ECLIPTIC_TO_THREE);
    this.skyRoot.matrixWorldNeedsUpdate = true;
    this.j2000.matrix.setFromMatrix3(precessionMatrix(t.T));
    this.j2000.matrixWorldNeedsUpdate = true;
    this.equatorGroup.rotation.x = -eps * DEG;

    if (!Number.isFinite(this.galacticT) || Math.abs(t.T - this.galacticT) > 0.02) {
      this.galacticT = t.T;
      // ecliptic of date -> J2000 ecliptic -> J2000 equatorial -> galactic
      const precInv = precessionMatrix(t.T).transpose();
      const e = OBLIQUITY_J2000_DEG * DEG;
      const eclToEq = new Matrix3().set(1, 0, 0, 0, Math.cos(e), -Math.sin(e), 0, Math.sin(e), Math.cos(e));
      (this.milkyWay.material as ShaderMaterial).uniforms.toGalactic.value.copy(EQ_TO_GAL).multiply(eclToEq).multiply(precInv);
    }

    this.scene.updateMatrixWorld();

    // Directions from the observer to every body, in the ecliptic of date.
    this.observer.copy(m.node(model.observerNode).worldPos);
    for (const def of model.bodies) {
      if (def.id === model.earthBody || def.inSky === false) continue;
      let d = this.directions.get(def.id);
      if (!d) {
        d = new Vector3();
        this.directions.set(def.id, d);
      }
      d.copy(m.node(def.node).worldPos).sub(this.observer).normalize();
    }

    const sunDef = model.bodies.find((b) => b.kind === 'sun');
    const sunDirEcl = sunDef ? this.directions.get(sunDef.id)! : geocentric('sun', t.jd, this.tmp).normalize().clone();
    const sunWorld = this.tmp.copy(sunDirEcl).applyMatrix4(this.skyRoot.matrixWorld).normalize();
    // Civil twilight darkens quickly: full night once the Sun is 7° down, full day 5° up.
    const daylight = horizon && ctx.layers.atmosphere ? smooth(-0.12, 0.09, sunWorld.y) : 0;
    const atm = this.atmosphere.material as ShaderMaterial;
    atm.uniforms.sunDir.value.copy(sunWorld);
    atm.uniforms.daylight.value = daylight;
    atm.uniforms.enabled.value = horizon && ctx.layers.atmosphere ? 1 : 0;
    this.ground.visible = horizon;
    (this.ground.children[0] as Mesh<BufferGeometry, ShaderMaterial>).material.uniforms.daylight.value = daylight;
    this.horizonGrid.visible = horizon && ctx.layers.grid;
    for (const child of this.horizonRoot.children) {
      if (child instanceof CSS2DObject) child.visible = horizon;
    }

    const starFade = 1 - daylight * 0.985;
    const sm = this.stars.material as ShaderMaterial;
    sm.uniforms.pixelRatio.value = ctx.pixelRatio;
    sm.uniforms.scale.value = Math.min(2.4, Math.max(1, Math.sqrt(70 / this.fov)));
    sm.uniforms.fade.value = starFade;
    sm.uniforms.horizonFade.value = horizon ? 1 : 0;
    (this.milkyWay.material as ShaderMaterial).uniforms.intensity.value = starFade;

    const constellationsOn = ctx.layers.constellations;
    if (this.constellationLines && this.constellationMaterial) {
      this.constellationLines.visible = constellationsOn;
      this.constellationMaterial.opacity = 0.32 * starFade;
    }
    const labelsOn = ctx.layers.labels;
    for (const obj of this.constellationLabelObjects) obj.visible = constellationsOn && labelsOn && starFade > 0.4;
    const magLimit = this.fov > 60 ? 1.0 : this.fov > 25 ? 1.8 : 2.6;
    for (const s of this.starLabels) s.obj.visible = labelsOn && s.mag <= magLimit && starFade > 0.4;
    this.eclipticGroup.visible = ctx.layers.grid;
    this.equatorGroup.visible = ctx.layers.grid;
    for (const obj of this.gridLabels) obj.visible = true;

    // Bodies of the worldview.
    const positions = this.markerGeometry.getAttribute('position') as BufferAttribute;
    const colors = this.markerGeometry.getAttribute('color') as BufferAttribute;
    const sizes = this.markerGeometry.getAttribute('size') as BufferAttribute;
    const alphas = this.markerGeometry.getAttribute('alpha') as BufferAttribute;
    const shapes = this.markerGeometry.getAttribute('shape') as BufferAttribute;
    let n = 0;
    const push = (dir: Vector3, radius: number, color: Color, size: number, alpha: number, shape: number) => {
      if (n >= MARKER_CAPACITY) return;
      positions.setXYZ(n, dir.x * radius, dir.y * radius, dir.z * radius);
      colors.setXYZ(n, color.r, color.g, color.b);
      sizes.setX(n, size);
      alphas.setX(n, alpha);
      shapes.setX(n, shape);
      n++;
    };
    const color = new Color();
    const magFade = 1 - daylight * 0.8;

    this.sun.visible = false;
    this.moon.visible = false;
    for (const def of model.bodies) {
      const obj = this.bodyLabels.get(def.id);
      const dir = this.directions.get(def.id);
      if (!obj || !dir) continue;
      const visible = isVisibleAt(def, t.jd);
      obj.visible = visible && labelsOn;
      if (!visible) continue;
      obj.position.copy(dir).multiplyScalar(BODY_R);
      (obj.element as HTMLElement).classList.toggle('selected', def.id === ctx.selected);
      if (def.kind === 'sun' || def.kind === 'fire') {
        this.sun.visible = def.kind === 'sun';
        this.sun.position.copy(dir).multiplyScalar(BODY_R);
        this.sunGlow.material.opacity = 0.75 + 0.25 * daylight;
        if (def.kind === 'fire') {
          color.set(def.appearance.color);
          push(dir, BODY_R, color, 14, 1, 0);
        }
      } else if (def.kind === 'moon') {
        this.moon.visible = true;
        this.moon.position.copy(dir).multiplyScalar(BODY_R);
        // Turn the near side of the Moon toward the observer.
        this.moon.quaternion.setFromUnitVectors(new Vector3(1, 0, 0), this.tmp2.copy(dir).negate());
        this.moon.quaternion.multiply(new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), Math.PI / 2));
        const moonNode = m.node(def.node).worldPos;
        const sunNode = model.sunNode ? m.node(model.sunNode).worldPos : null;
        const toSun = sunNode ? this.tmp2.copy(sunNode).sub(moonNode) : this.tmp2.copy(sunDirEcl);
        this.moonMaterial.uniforms.sunDir.value.copy(toSun.normalize().transformDirection(this.skyRoot.matrixWorld));
      } else {
        color.set(def.appearance.color);
        const px = def.kind === 'planet' ? (PLANET_PIXELS[def.id] ?? 7) : def.kind === 'comet' ? 9 : def.kind === 'counter-earth' ? 9 : 5;
        push(dir, BODY_R, color, px * (def.id === ctx.selected ? 1.35 : 1), magFade, 0);
      }
    }

    // Novae among the fixed stars.
    const novaDir = new Vector3();
    for (const nova of NOVAE) {
      const mag = novaMagnitude(nova, t.jd);
      const obj = this.novaLabels.get(nova.id)!;
      obj.visible = mag !== null && labelsOn;
      if (mag === null) continue;
      raDecToEclipticJ2000(nova.ra, nova.dec, novaDir).applyMatrix3(precessionMatrix(t.T));
      color.set('#fff4dc');
      push(novaDir, STAR_R * 0.99, color, Math.max(3, 12 - 1.6 * mag), starFade, 0);
    }

    // Modern ephemeris ghosts: where the bodies really were.
    const ghostsOn = ctx.layers.ghosts;
    const ghostColor = new Color(UI_COLORS.ghost);
    for (const id of TRUTH_BODIES) {
      let line = this.ghostLines.get(id);
      let ghostLabel = this.ghostLabels.get(id);
      if (!line) {
        line = new DynamicPolyline(2, createLineMaterial({ color: UI_COLORS.ghostLine, width: 1.2, opacity: 0.7, dashed: true }), false);
        (line.line.material as LineMaterial).dashSize = 4;
        (line.line.material as LineMaterial).gapSize = 3;
        line.line.renderOrder = 3;
        this.skyRoot.add(line.line);
        this.ghostLines.set(id, line);
        ghostLabel = label('', 'sky-ghost-label');
        ghostLabel.center.set(-0.1, -0.6);
        this.skyRoot.add(ghostLabel);
        this.ghostLabels.set(id, ghostLabel);
      }
      if (!ghostsOn) {
        line.line.visible = false;
        ghostLabel!.visible = false;
        continue;
      }
      const truthDir = geocentric(id as TruthBodyId, t.jd, this.tmp2).normalize();
      push(truthDir, BODY_R * 0.995, ghostColor, 16, 0.95, 1);
      const modelBody = model.bodies.find((b) => b.truth === id);
      const modelDir = modelBody ? this.directions.get(modelBody.id) : undefined;
      ghostLabel!.visible = labelsOn;
      ghostLabel!.position.copy(truthDir).multiplyScalar(BODY_R);
      if (modelDir) {
        const err = (modelDir.angleTo(truthDir) * 180) / Math.PI;
        (ghostLabel!.element as HTMLElement).textContent = `real ${modelBody!.name}: ${err.toFixed(err < 10 ? 1 : 0)}\u00B0 off`;
        const a = modelDir.clone().multiplyScalar(BODY_R);
        const b = truthDir.clone().multiplyScalar(BODY_R);
        line.update(new Float32Array([a.x, a.y, a.z, b.x, b.y, b.z]), 2);
      } else {
        (ghostLabel!.element as HTMLElement).textContent = `real ${id[0].toUpperCase()}${id.slice(1)} (absent from this worldview)`;
        line.line.visible = false;
      }
    }

    for (let i = n; i < MARKER_CAPACITY; i++) alphas.setX(i, 0);
    positions.needsUpdate = true;
    colors.needsUpdate = true;
    sizes.needsUpdate = true;
    alphas.needsUpdate = true;
    shapes.needsUpdate = true;
    (this.markers.material as ShaderMaterial).uniforms.pixelRatio.value = ctx.pixelRatio;

    for (const tr of this.trails) {
      const on = ctx.layers.trails && isVisibleAt(tr.body, t.jd);
      tr.line.line.visible = on;
      if (!on) continue;
      const dir = this.directions.get(tr.body.id);
      if (!dir) continue;
      const current = this.trailCurrent.copy(dir).multiplyScalar(TRAIL_R);
      const span = tr.body.kind === 'moon' ? 6 : Math.min(tr.body.trailDays!, 400);
      const count = tr.sampler.fill(t.jd, span, current, tr.points, tr.colors, tr.rgb);
      tr.line.update(tr.points, count, tr.colors);
    }

    // Labels are HTML and ignore depth: hide those below the horizon. Every label's base visibility
    // was assigned earlier in this frame, so culling never persists into the next one.
    this.scene.updateMatrixWorld();
    const world = this.tmp2;
    this.scene.traverse((o) => {
      if (!(o instanceof CSS2DObject) || o.parent === this.horizonRoot) return;
      world.setFromMatrixPosition(o.matrixWorld);
      o.visible = labelVisibleAt(o.visible, horizon, world.y);
    });

    if (this.tracking) {
      const d = this.worldDirection(this.tracking, this.tmp);
      if (d) {
        const targetAz = ((Math.atan2(d.x, -d.z) / DEG) + 360) % 360;
        // A body below the horizon is looked toward, not into the ground.
        const floor = horizon ? 14 : -85;
        const targetAlt = Math.max(floor, Math.asin(Math.max(-1, Math.min(1, d.y))) / DEG);
        const k = Math.min(1, ctx.dt * 4);
        let dAz = targetAz - this.az;
        if (dAz > 180) dAz -= 360;
        if (dAz < -180) dAz += 360;
        this.az = (this.az + dAz * k + 360) % 360;
        this.alt += (Math.max(-85, Math.min(89.5, targetAlt)) - this.alt) * k;
        this.updateCamera();
      }
    }
  }

  /** Body nearest a screen point (CSS px), within `radius` px. */
  pick(x: number, y: number, width: number, height: number, radius = 24): string | null {
    let best: string | null = null;
    let bestD = radius;
    const v = new Vector3();
    for (const [id, d] of this.directions) {
      v.copy(d).multiplyScalar(BODY_R).applyMatrix4(this.skyRoot.matrixWorld).project(this.camera);
      if (v.z > 1 || v.z < -1) continue;
      const sx = ((v.x + 1) / 2) * width;
      const sy = ((1 - v.y) / 2) * height;
      const dist = Math.hypot(sx - x, sy - y);
      if (dist < bestD) {
        bestD = dist;
        best = id;
      }
    }
    return best;
  }

  resize(width: number, height: number): void {
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }

  /** Aim at an altitude/azimuth (degrees). */
  setLook(az: number, alt: number, fov?: number): void {
    this.tracking = null;
    this.az = az;
    this.alt = alt;
    if (fov) this.fov = fov;
    this.updateCamera();
  }
}

function smooth(edge0: number, edge1: number, x: number): number {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}
