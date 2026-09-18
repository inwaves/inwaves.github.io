/**
 * The fixed stars: a real catalogue, so the sky is recognisable and the planets'
 * loops can be followed against actual constellations.
 *
 * Stars are drawn as round points of constant pixel size whatever their
 * distance, and are never depth-tested, because in every worldview they are the
 * backdrop. The sphere they sit on, however, has a real radius: Anaximander puts
 * it nearer than the Moon, Ptolemy just beyond Saturn, Copernicus immeasurably
 * far, and from outside it reads as the closed sphere the ancients believed in.
 */
import {
  AdditiveBlending,
  BufferGeometry,
  Float32BufferAttribute,
  Group,
  LineBasicMaterial,
  LineLoop,
  LineSegments,
  Matrix4,
  Points,
  ShaderMaterial,
  Vector3,
} from 'three';
import { DEG } from '../core/angles.js';
import { equatorPointInEcliptic } from '../core/sky.js';
import { fromLonLat } from '../core/vec.js';
import constellationData from '../data/constellations.json';
import starData from '../data/stars.json';
import { IDENTITY, basisMatrix, toThree } from './frame.js';

/** Mean obliquity at J2000, for the celestial equator drawn on the sphere. */
const OBLIQUITY_J2000 = 23.4392911;

/** Approximate colour of a star from its B-V colour index. */
function colorFromBv(bv) {
  const stops = [
    [-0.35, [0.62, 0.72, 1.0]],
    [0.0, [0.82, 0.88, 1.0]],
    [0.6, [1.0, 0.97, 0.9]],
    [1.2, [1.0, 0.82, 0.62]],
    [2.0, [1.0, 0.62, 0.42]],
  ];
  const x = Math.max(stops[0][0], Math.min(stops.at(-1)[0], bv));
  for (let i = 1; i < stops.length; i += 1) {
    if (x <= stops[i][0]) {
      const [x0, c0] = stops[i - 1];
      const [x1, c1] = stops[i];
      const t = (x - x0) / (x1 - x0);
      return c0.map((v, k) => v + (c1[k] - v) * t);
    }
  }
  return stops.at(-1)[1];
}

const VERTEX = /* glsl */ `
  attribute float size;
  attribute vec3 tint;
  attribute float glow;
  uniform float pixelRatio;
  varying vec3 vTint;
  varying float vGlow;
  void main() {
    vTint = tint;
    vGlow = glow;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = size * pixelRatio;
  }
`;

const FRAGMENT = /* glsl */ `
  varying vec3 vTint;
  varying float vGlow;
  void main() {
    float d = length(gl_PointCoord - vec2(0.5)) * 2.0;
    // Written as one minus an increasing ramp: GLSL leaves smoothstep undefined
    // when its first edge is not below its second.
    float alpha = (1.0 - smoothstep(0.25, 1.0, d)) * vGlow;
    if (alpha <= 0.001) discard;
    gl_FragColor = vec4(vTint, alpha);
  }
`;

function ring(points, color, opacity) {
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(points, 3));
  const material = new LineBasicMaterial({ color, transparent: true, opacity, depthTest: false, depthWrite: false });
  const loop = new LineLoop(geometry, material);
  loop.frustumCulled = false;
  loop.renderOrder = -9;
  return loop;
}

export class StarField {
  constructor() {
    this.group = new Group();
    this.group.matrixAutoUpdate = false;
    this.matrix = new Matrix4();
    this.orientation = new Matrix4();
    this.scaling = new Vector3();

    const { stars } = starData;
    this.count = stars.length / 4;
    /** Magnitudes in draw order (brightest first), for applying a limiting magnitude. */
    this.magnitudes = new Float32Array(this.count);
    const positions = new Float32Array(this.count * 3);
    const sizes = new Float32Array(this.count);
    const tints = new Float32Array(this.count * 3);
    const glows = new Float32Array(this.count);
    const v = toThree([0, 0, 0]);
    for (let i = 0; i < this.count; i += 1) {
      const [lambda, beta, mag, bv] = [stars[i * 4], stars[i * 4 + 1], stars[i * 4 + 2], stars[i * 4 + 3]];
      toThree(fromLonLat(lambda, beta), 1, v);
      positions.set([v.x, v.y, v.z], i * 3);
      this.magnitudes[i] = mag;
      sizes[i] = 0.9 + 7 * 10 ** (-0.2 * (mag + 1.44));
      glows[i] = Math.max(0.28, Math.min(1, 1.12 - 0.13 * mag));
      tints.set(colorFromBv(bv), i * 3);
    }

    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
    geometry.setAttribute('size', new Float32BufferAttribute(sizes, 1));
    geometry.setAttribute('tint', new Float32BufferAttribute(tints, 3));
    geometry.setAttribute('glow', new Float32BufferAttribute(glows, 1));
    this.material = new ShaderMaterial({
      vertexShader: VERTEX,
      fragmentShader: FRAGMENT,
      uniforms: { pixelRatio: { value: 1 } },
      transparent: true,
      depthTest: false,
      depthWrite: false,
      blending: AdditiveBlending,
    });
    this.points = new Points(geometry, this.material);
    this.points.frustumCulled = false;
    this.points.renderOrder = -10;
    this.group.add(this.points);

    // Constellation figures, as separate segments on the same sphere.
    const segments = [];
    const a = toThree([0, 0, 0]);
    const b = toThree([0, 0, 0]);
    for (const constellation of constellationData.constellations) {
      for (const path of constellation.lines) {
        for (let i = 1; i < path.length; i += 1) {
          toThree(fromLonLat(path[i - 1][0], path[i - 1][1]), 1, a);
          toThree(fromLonLat(path[i][0], path[i][1]), 1, b);
          segments.push(a.x, a.y, a.z, b.x, b.y, b.z);
        }
      }
    }
    const lineGeometry = new BufferGeometry();
    lineGeometry.setAttribute('position', new Float32BufferAttribute(segments, 3));
    this.figures = new LineSegments(
      lineGeometry,
      new LineBasicMaterial({ color: 0x5f7fb8, transparent: true, opacity: 0.32, depthTest: false, depthWrite: false }),
    );
    this.figures.frustumCulled = false;
    this.figures.renderOrder = -9;
    this.group.add(this.figures);

    // The ecliptic, and the celestial equator of J2000 (turned to the date by precession).
    const ecliptic = [];
    const equator = [];
    for (let i = 0; i < 256; i += 1) {
      const t = (i / 256) * 360;
      toThree(fromLonLat(t, 0), 1, a);
      ecliptic.push(a.x, a.y, a.z);
      toThree(equatorPointInEcliptic(t, OBLIQUITY_J2000), 1, a);
      equator.push(a.x, a.y, a.z);
    }
    // The ecliptic is the line every planet's path is measured against, so it has
    // to read as gold even at one pixel wide; a muted gold there reads as grey.
    this.ecliptic = ring(ecliptic, 0xf2b632, 0.85);
    this.equator = ring(equator, 0x6fb6c9, 0.4);
    this.group.add(this.ecliptic, this.equator);
  }

  /** Shows only stars at least as bright as `limit`. The catalogue is sorted by magnitude. */
  setMagnitudeLimit(limit) {
    let n = 0;
    while (n < this.count && this.magnitudes[n] <= limit) n += 1;
    this.points.geometry.setDrawRange(0, n);
    this.visibleCount = n;
  }

  setPixelRatio(ratio) {
    this.material.uniforms.pixelRatio.value = ratio;
  }

  /**
   * @param {object} p
   * @param {import('three').Vector3} p.center centre of the stellar sphere, scene units
   * @param {number} p.radius radius of the sphere, scene units
   * @param {{x:number[],y:number[],z:number[]}|null} p.basis where the model says the ecliptic axes point
   * @param {number} p.precession degrees; turns the equator from J2000 to the date
   */
  place({ center, radius, basis, precession }) {
    if (basis) basisMatrix(this.orientation, basis);
    else this.orientation.copy(IDENTITY);
    this.matrix.copy(this.orientation).scale(this.scaling.setScalar(radius));
    this.matrix.setPosition(center);
    this.group.matrix.copy(this.matrix);
    this.group.matrixWorldNeedsUpdate = true;
    this.equator.rotation.y = precession * DEG;
  }

  setVisibility({ figures, circles }) {
    this.figures.visible = figures;
    this.ecliptic.visible = circles;
    this.equator.visible = circles;
  }
}
