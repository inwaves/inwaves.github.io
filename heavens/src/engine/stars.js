// The sphere of the fixed stars: real stars (to magnitude 6.5), IAU constellation figures and
// names, the ecliptic with its zodiac band, the celestial equator of date (which precesses)
// and the twelve signs counted from the equinox of date.
import * as THREE from 'three';
import { CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import { celestialPole, equinoxLongitudeDeg } from './time.js';

const DEG = Math.PI / 180;
const OBLIQUITY_J2000 = 23.4392911 * DEG;

/** Equatorial (RA, Dec in degrees, J2000) -> unit vector in scene coordinates (ecliptic frame). */
export function equatorialToScene(raDeg, decDeg, out = new THREE.Vector3()) {
  const ra = raDeg * DEG;
  const dec = decDeg * DEG;
  const xe = Math.cos(dec) * Math.cos(ra);
  const ye = Math.cos(dec) * Math.sin(ra);
  const ze = Math.sin(dec);
  const ce = Math.cos(OBLIQUITY_J2000);
  const se = Math.sin(OBLIQUITY_J2000);
  const x = xe;
  const y = ye * ce + ze * se; // ecliptic y (toward longitude 90)
  const z = -ye * se + ze * ce; // ecliptic pole
  return out.set(x, z, -y);
}

function bvToColor(bv) {
  const stops = [
    [-0.4, [0.62, 0.72, 1.0]],
    [0.0, [0.78, 0.84, 1.0]],
    [0.3, [0.96, 0.96, 1.0]],
    [0.6, [1.0, 0.96, 0.88]],
    [1.0, [1.0, 0.86, 0.68]],
    [1.6, [1.0, 0.74, 0.52]],
  ];
  const v = Math.max(stops[0][0], Math.min(stops[stops.length - 1][0], bv));
  for (let k = 0; k < stops.length - 1; k++) {
    const [a, ca] = stops[k];
    const [b, cb] = stops[k + 1];
    if (v <= b) {
      const f = (v - a) / (b - a);
      return ca.map((c, i) => c + (cb[i] - c) * f);
    }
  }
  return stops[stops.length - 1][1];
}

const starVertex = /* glsl */ `
  attribute float size;
  attribute vec3 starColor;
  uniform float uScale;
  varying vec3 vColor;
  #include <common>
  #include <logdepthbuf_pars_vertex>
  void main() {
    vColor = starColor;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = size * uScale;
    #include <logdepthbuf_vertex>
  }`;

const starFragment = /* glsl */ `
  varying vec3 vColor;
  #include <common>
  #include <logdepthbuf_pars_fragment>
  void main() {
    #include <logdepthbuf_fragment>
    float d = length(gl_PointCoord - vec2(0.5));
    float a = smoothstep(0.5, 0.12, d);
    gl_FragColor = vec4(vColor * a, a);
  }`;

function label(text, cls) {
  const div = document.createElement('div');
  div.className = `label ${cls}`;
  const span = document.createElement('span');
  span.textContent = text;
  div.appendChild(span);
  return new CSS2DObject(div);
}

function circlePoints(n = 256, lat = 0) {
  const pts = [];
  const c = Math.cos(lat);
  for (let k = 0; k < n; k++) {
    const a = (Math.PI * 2 * k) / n;
    pts.push(new THREE.Vector3(c * Math.cos(a), Math.sin(lat), -c * Math.sin(a)));
  }
  return pts;
}

const SIGNS = ['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo', 'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'];

export class SkyDome {
  constructor() {
    this.group = new THREE.Group();
    this.group.name = 'sky';
    this.ready = false;
    this.parts = {};
    this._pole = new THREE.Vector3();
    this._up = new THREE.Vector3(0, 1, 0);
    this.scatter = false;
  }

  async load(url) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`sky data: HTTP ${res.status}`);
    const data = await res.json();
    this.build(data);
  }

  /** Fallback when the catalogue cannot be loaded: a random but plausible star field. */
  buildProcedural(count = 3000) {
    const stars = [];
    let s = 12345;
    const rnd = () => {
      s = (s * 1664525 + 1013904223) >>> 0;
      return s / 4294967296;
    };
    for (let k = 0; k < count; k++) {
      const ra = rnd() * 360 - 180;
      const dec = (Math.asin(rnd() * 2 - 1) / DEG);
      stars.push([ra, dec, 2 + rnd() * 4.5, rnd() * 1.4 - 0.2]);
    }
    this.build({ stars, lines: [], names: [] });
  }

  build(data) {
    const g = this.group;
    const n = data.stars.length;
    const onSphere = new Float32Array(n * 3);
    const scattered = new Float32Array(n * 3);
    const sizes = new Float32Array(n);
    const colors = new Float32Array(n * 3);
    const v = new THREE.Vector3();
    let seed = 99;
    const rnd = () => {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 4294967296;
    };
    data.stars.forEach(([ra, dec, mag, bv], k) => {
      equatorialToScene(ra, dec, v);
      onSphere.set([v.x, v.y, v.z], k * 3);
      // Brighter stars nearer, in a Newtonian unbounded universe.
      const depth = 1.4 + 3.8 * Math.min(1, Math.max(0, (mag + 1.5) / 8)) + rnd() * 0.7;
      scattered.set([v.x * depth, v.y * depth, v.z * depth], k * 3);
      sizes[k] = Math.min(8.5, Math.max(1.4, (7.0 - mag) * 1.25));
      const [r, gg, b] = bvToColor(bv);
      const boost = mag < 1.5 ? 1.0 : 0.92;
      colors.set([r * boost, gg * boost, b * boost], k * 3);
    });
    this.onSphere = new THREE.BufferAttribute(onSphere, 3);
    this.scattered = new THREE.BufferAttribute(scattered, 3);
    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', this.onSphere);
    geom.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    geom.setAttribute('starColor', new THREE.BufferAttribute(colors, 3));
    const mat = new THREE.ShaderMaterial({
      uniforms: { uScale: { value: Math.min(window.devicePixelRatio || 1, 2) } },
      vertexShader: starVertex,
      fragmentShader: starFragment,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const stars = new THREE.Points(geom, mat);
    stars.frustumCulled = false;
    stars.renderOrder = -5;
    g.add(stars);
    this.parts.stars = stars;

    // constellation figures
    const linePts = [];
    for (const poly of data.lines) {
      for (let k = 0; k < poly.length - 1; k++) {
        linePts.push(equatorialToScene(poly[k][0], poly[k][1]), equatorialToScene(poly[k + 1][0], poly[k + 1][1]));
      }
    }
    const lines = new THREE.LineSegments(
      new THREE.BufferGeometry().setFromPoints(linePts),
      new THREE.LineBasicMaterial({ color: 0x34507f, transparent: true, opacity: 0.38, depthWrite: false }),
    );
    lines.renderOrder = -4;
    g.add(lines);
    this.parts.lines = lines;

    // constellation names
    const names = new THREE.Group();
    for (const [, name, ra, dec] of data.names) {
      const l = label(name, 'const');
      l.position.copy(equatorialToScene(ra, dec));
      names.add(l);
    }
    g.add(names);
    this.parts.names = names;

    // translucent shell of the fixed stars
    const shell = new THREE.Mesh(
      new THREE.SphereGeometry(1, 64, 40),
      new THREE.MeshBasicMaterial({ color: 0x6f8fd0, transparent: true, opacity: 0.05, side: THREE.BackSide, depthWrite: false }),
    );
    shell.renderOrder = -6;
    const shellWire = new THREE.Group();
    for (let k = 0; k < 6; k++) {
      const ring = new THREE.LineLoop(
        new THREE.BufferGeometry().setFromPoints(circlePoints(180)),
        new THREE.LineBasicMaterial({ color: 0x6f8fd0, transparent: true, opacity: 0.12, depthWrite: false }),
      );
      ring.rotation.x = (Math.PI / 6) * k;
      shellWire.add(ring);
    }
    const shellGroup = new THREE.Group();
    shellGroup.add(shell, shellWire);
    g.add(shellGroup);
    this.parts.shell = shellGroup;

    // ecliptic and zodiac band (fixed in this frame)
    const ecl = new THREE.Group();
    ecl.add(new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(circlePoints(360)), new THREE.LineBasicMaterial({ color: 0xe0b860, transparent: true, opacity: 0.75 })));
    for (const lat of [-8, 8]) {
      const band = new THREE.LineLoop(
        new THREE.BufferGeometry().setFromPoints(circlePoints(360, lat * DEG)),
        new THREE.LineDashedMaterial({ color: 0xe0b860, transparent: true, opacity: 0.3, dashSize: 0.02, gapSize: 0.02 }),
      );
      band.computeLineDistances();
      ecl.add(band);
    }
    const eclLabel = label('ecliptic', 'sign');
    eclLabel.position.set(Math.cos(200 * DEG), 0.012, -Math.sin(200 * DEG));
    ecl.add(eclLabel);
    g.add(ecl);
    this.parts.ecliptic = ecl;

    // celestial equator of date: a circle perpendicular to the pole of date
    const eq = new THREE.Group();
    eq.add(new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(circlePoints(360)), new THREE.LineBasicMaterial({ color: 0x6fb1ff, transparent: true, opacity: 0.6 })));
    const poleMark = label('north celestial pole', 'pole');
    poleMark.position.set(0, 1.0, 0);
    eq.add(poleMark);
    const eqLabel = label('celestial equator', 'pole');
    eqLabel.position.set(Math.cos(20 * DEG), 0.012, -Math.sin(20 * DEG));
    eq.add(eqLabel);
    g.add(eq);
    this.parts.equator = eq;

    // zodiac signs counted from the equinox of date
    const signs = new THREE.Group();
    for (let k = 0; k < 12; k++) {
      const lon = (15 + 30 * k) * DEG;
      const l = label(SIGNS[k], 'sign');
      l.position.set(1.03 * Math.cos(lon), -0.04, -1.03 * Math.sin(lon));
      signs.add(l);
      const b = 30 * k * DEG;
      const tick = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(Math.cos(b), -0.03, -Math.sin(b)),
          new THREE.Vector3(Math.cos(b), 0.03, -Math.sin(b)),
        ]),
        new THREE.LineBasicMaterial({ color: 0xe0b860, transparent: true, opacity: 0.6 }),
      );
      signs.add(tick);
    }
    g.add(signs);
    this.parts.signs = signs;

    // Anaximander's wheels of fire: decorative rings carrying the stars
    const wheels = new THREE.Group();
    for (let k = 0; k < 7; k++) {
      const torus = new THREE.Mesh(
        new THREE.TorusGeometry(1, 0.006, 8, 180),
        new THREE.MeshBasicMaterial({ color: 0xff9a4a, transparent: true, opacity: 0.35, depthWrite: false }),
      );
      torus.rotation.x = Math.PI / 2 + (k - 3) * 0.22;
      torus.rotation.y = k * 0.9;
      wheels.add(torus);
    }
    g.add(wheels);
    this.parts.wheels = wheels;

    this.ready = true;
    this.setEpoch(0);
  }

  setRadius(r) {
    this.group.scale.setScalar(r);
  }

  /** Stars on a sphere (every model before Newton) or scattered in depth. */
  setScatter(on) {
    if (!this.ready || this.scatter === on) return;
    this.scatter = on;
    this.parts.stars.geometry.setAttribute('position', on ? this.scattered : this.onSphere);
    this.parts.stars.geometry.attributes.position.needsUpdate = true;
  }

  setVisibility({ stars = true, lines = true, names = false, shell = true, ecliptic = true, signs = false, wheels = false }) {
    if (!this.ready) return;
    this.parts.stars.visible = stars;
    this.parts.lines.visible = stars && lines;
    this.parts.names.visible = stars && names;
    this.parts.shell.visible = shell;
    this.parts.ecliptic.visible = ecliptic;
    this.parts.equator.visible = ecliptic;
    this.parts.signs.visible = signs;
    this.parts.wheels.visible = wheels;
  }

  /** Orient the equator of date and the signs of the zodiac for simulation time t. */
  setEpoch(t) {
    if (!this.ready) return;
    celestialPole(t, this._pole);
    this.parts.equator.quaternion.setFromUnitVectors(this._up, this._pole);
    this.parts.signs.rotation.y = equinoxLongitudeDeg(t) * DEG;
  }

  setPixelRatio(pr) {
    if (this.parts.stars) this.parts.stars.material.uniforms.uScale.value = Math.min(pr, 2);
  }
}
