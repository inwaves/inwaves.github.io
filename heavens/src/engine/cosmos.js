// Turns a declarative model (a list of nodes with motions) into animated three.js objects:
// bodies, mechanism points and arms, orbit guides with centre/equant/focus markers,
// crystalline spheres, sublunary shells, trails, Kepler's polyhedra and equal-area sectors.
import * as THREE from 'three';
import { CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import {
  computeOffset, circleGuidePoints, ellipseGuidePoints, ellipseEmptyFocus, hippopedeGuidePoints,
  eudoxusLongitude, motionMinPeriod, planeToWorld, circleCentre, circleBaseCentre, equantPoint, tiltQuaternion, ellipseOffset, TAU, DEG,
} from './motion.js';
import { Trail } from './trails.js';
import { glowTexture, moonTexture, sunTexture, earthTexture, ringTexture } from './textures.js';
import { celestialPole } from './time.js';

const ZERO = new THREE.Vector3();
const COLOR_CENTRE = 0xffffff;
const COLOR_EQUANT = 0xff4fd8;
const COLOR_FOCUS = 0x8fd6ff;

function makeLabel(text, cls = '') {
  const div = document.createElement('div');
  div.className = `label ${cls}`.trim();
  const span = document.createElement('span');
  span.textContent = text;
  div.appendChild(span);
  return new CSS2DObject(div);
}

function lineFrom(points, color, opacity, loop = true) {
  const geom = new THREE.BufferGeometry().setFromPoints(points);
  const mat = new THREE.LineBasicMaterial({ color, transparent: true, opacity, depthWrite: false });
  return loop ? new THREE.LineLoop(geom, mat) : new THREE.Line(geom, mat);
}

function marker(color, size = 0.09) {
  return new THREE.Mesh(new THREE.SphereGeometry(size, 12, 8), new THREE.MeshBasicMaterial({ color }));
}

function greatCircles(radius, color, opacity) {
  const g = new THREE.Group();
  const pts = [];
  for (let k = 0; k < 128; k++) {
    const a = (TAU * k) / 128;
    pts.push(new THREE.Vector3(radius * Math.cos(a), 0, radius * Math.sin(a)));
  }
  for (let k = 0; k < 3; k++) {
    const ring = lineFrom(pts, color, opacity);
    if (k === 1) ring.rotation.x = Math.PI / 2;
    if (k === 2) ring.rotation.z = Math.PI / 2;
    g.add(ring);
  }
  return g;
}

function disposeObject(obj) {
  obj.traverse((o) => {
    if (o.isCSS2DObject) o.element.remove();
    if (o.geometry) o.geometry.dispose();
    if (o.material) {
      const mats = Array.isArray(o.material) ? o.material : [o.material];
      for (const m of mats) m.dispose();
    }
  });
}

export class Cosmos {
  constructor(model) {
    this.model = model;
    this.group = new THREE.Group();
    this.group.name = `cosmos:${model.id}`;
    this.nodes = [];
    this.byId = new Map();
    this.bodyMeshes = [];
    this.flags = {};
    this.frameId = null;
    this.lastT = null;
    this.earthView = false;
    this._highlight = new Set();
    this._pole = new THREE.Vector3();
    this._qSpin = new THREE.Quaternion();
    this._qTilt = new THREE.Quaternion();
    this._up = new THREE.Vector3(0, 1, 0);
    this._tmpCentre = new THREE.Vector3();
    this._tmpBase = new THREE.Vector3();
    this._build();
  }

  // ----------------------------------------------------------------------------- build

  _order(defs) {
    const byId = new Map(defs.map((d) => [d.id, d]));
    const out = [];
    const seen = new Set();
    const visit = (d, stack = new Set()) => {
      if (seen.has(d.id)) return;
      if (stack.has(d.id)) throw new Error(`Cyclic parent chain at ${d.id}`);
      stack.add(d.id);
      if (d.parent) {
        const p = byId.get(d.parent);
        if (!p) throw new Error(`Node ${d.id} references missing parent ${d.parent}`);
        visit(p, stack);
      }
      seen.add(d.id);
      out.push(d);
    };
    defs.forEach((d) => visit(d));
    return out;
  }

  _build() {
    const defs = this._order(this.model.bodies);
    defs.forEach((def, index) => {
      const node = {
        def, index, id: def.id,
        parent: def.parent ? this.byId.get(def.parent) : null,
        pos: new THREE.Vector3(),
        mesh: null, guide: null, guideFixed: null, crankArm: null, hippo: null, arm: null, sphere: null, trail: null, label: null, markers: [], markerLabels: [],
        lam: 0, nextSample: 0, interval: 1,
      };
      this.nodes.push(node);
      this.byId.set(def.id, node);
      this._buildVisuals(node);
    });
    this.pos = this.nodes.map((n) => n.pos);
    this.scratch = this.nodes.map(() => new THREE.Vector3());
    this.trailNodes = this.nodes.filter((n) => n.trail);
    this._buildShells();
    this._buildSolids();
    this._buildSweeps();
  }

  _buildVisuals(node) {
    const { def } = node;
    if (def.kind === 'belt') {
      this._buildBelt(node);
      return;
    }
    const isPoint = def.kind === 'point';

    // body or mechanism point
    node.mesh = isPoint ? this._makePointMesh(def) : this._makeBodyMesh(def);
    node.mesh.userData.nodeId = def.id;
    this.group.add(node.mesh);
    if (!isPoint) this.bodyMeshes.push(node.mesh);

    // label
    if (def.name && def.label !== false) {
      node.label = makeLabel(def.name, isPoint ? 'point' : '');
      node.mesh.add(node.label);
    }

    // guide (orbit curve and markers), positioned at the parent each frame
    if (def.motion && def.motion.type !== 'fixed' && def.guide !== false) {
      node.guide = this._makeGuide(node);
      if (node.guide) this.group.add(node.guide);
      if (node.guideFixed) this.group.add(node.guideFixed);
    }

    // arm from parent to node
    const armWanted = def.arm ?? (isPoint || (node.parent && node.parent.def.kind === 'point'));
    if (node.parent && armWanted) {
      const geom = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]);
      node.arm = new THREE.Line(geom, new THREE.LineBasicMaterial({ color: def.color || 0xffffff, transparent: true, opacity: isPoint ? 0.3 : 0.55, depthWrite: false }));
      node.arm.frustumCulled = false;
      this.group.add(node.arm);
    }

    // crystalline sphere carrying this node
    if (def.sphere) {
      node.sphere = this._makeSphere(node);
      this.group.add(node.sphere);
    }

    // trail
    const trailWanted = def.trail ?? !isPoint;
    if (trailWanted && def.motion && def.motion.type !== 'fixed') {
      node.trail = new Trail({ maxPoints: def.trailMax || 1600, color: def.trailColor || def.color || 0xffffff });
      this.group.add(node.trail.object);
      let minP = Infinity;
      for (let n = node; n; n = n.parent) minP = Math.min(minP, motionMinPeriod(n.def.motion));
      node.interval = def.trailEvery || Math.min(400, Math.max(0.02, minP / 90));
    }
  }

  _buildBelt(node) {
    const { def } = node;
    const n = def.elements.length;
    const geometry = new THREE.BufferGeometry();
    const attr = new THREE.BufferAttribute(new Float32Array(n * 3), 3).setUsage(THREE.DynamicDrawUsage);
    geometry.setAttribute('position', attr);
    const material = new THREE.PointsMaterial({ color: def.color || 0xaaaaaa, size: def.pointSize || 2, sizeAttenuation: false, transparent: true, opacity: 0.85, depthWrite: false });
    node.mesh = new THREE.Points(geometry, material);
    node.mesh.frustumCulled = false;
    node.mesh.userData.nodeId = def.id;
    node.belt = { attr, scratch: new THREE.Vector3() };
    if (def.name) {
      node.label = makeLabel(def.name, 'shell');
      node.label.position.set(def.labelRadius || 0, 0, 0);
      node.mesh.add(node.label);
    }
    this.group.add(node.mesh);
  }

  _makeBodyMesh(def) {
    const size = def.size || 0.2;
    let geometry;
    if (def.shape === 'cylinder') geometry = new THREE.CylinderGeometry(size, size, def.height || size * 0.66, 64);
    else geometry = new THREE.SphereGeometry(size, 48, 32);

    let material;
    if (def.texture === 'sun') material = new THREE.MeshBasicMaterial({ map: sunTexture() });
    else if (def.emissive) material = new THREE.MeshBasicMaterial({ color: def.color });
    else if (def.texture === 'moon') material = new THREE.MeshStandardMaterial({ map: moonTexture(), roughness: 1, metalness: 0 });
    else if (def.texture === 'earth') material = new THREE.MeshStandardMaterial({ map: earthTexture(), roughness: 0.9, metalness: 0 });
    else material = new THREE.MeshStandardMaterial({ color: def.color, roughness: 0.95, metalness: 0 });

    const mesh = new THREE.Mesh(geometry, material);

    if (def.emissive) {
      const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
        map: glowTexture(), color: def.color, transparent: true, opacity: def.glow ?? 0.85,
        blending: THREE.AdditiveBlending, depthWrite: false,
      }));
      sprite.scale.setScalar(size * (def.glowScale || 6));
      mesh.add(sprite);
    }
    if (def.light) {
      mesh.add(new THREE.PointLight(0xfff1d0, def.lightIntensity ?? 2.6, 0, 0));
    }
    if (def.ring) {
      const r = def.ring;
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(size * r.inner, size * r.outer, 96),
        new THREE.MeshStandardMaterial({ map: ringTexture(), transparent: true, side: THREE.DoubleSide, roughness: 1, depthWrite: false }),
      );
      // RingGeometry's UVs are planar; re-map u to the radius so the texture is radial.
      const uv = ring.geometry.attributes.uv;
      const pos = ring.geometry.attributes.position;
      for (let k = 0; k < uv.count; k++) {
        const x = pos.getX(k);
        const y = pos.getY(k);
        const rad = Math.hypot(x, y);
        uv.setXY(k, (rad - size * r.inner) / (size * (r.outer - r.inner)), 0.5);
      }
      ring.geometry.rotateX(-Math.PI / 2);
      ring.quaternion.copy(tiltQuaternion(r.tilt, r.node));
      mesh.add(ring);
    }
    if (def.attachments) {
      for (const a of def.attachments) {
        const blob = new THREE.Mesh(new THREE.SphereGeometry(a.size, 24, 16), new THREE.MeshStandardMaterial({ color: a.color || def.color, roughness: 0.95 }));
        blob.position.set(a.dx || 0, a.dy || 0, a.dz || 0);
        mesh.add(blob);
      }
    }
    if (def.axis) {
      const axis = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, -size * 1.8, 0), new THREE.Vector3(0, size * 1.8, 0)]),
        new THREE.LineBasicMaterial({ color: 0x9fc3ff, transparent: true, opacity: 0.7 }),
      );
      mesh.add(axis);
    }
    return mesh;
  }

  _makePointMesh(def) {
    const m = new THREE.Mesh(
      new THREE.SphereGeometry((def.markerSize || 0.07) * (this.model.markerScale || 1), 12, 8),
      new THREE.MeshBasicMaterial({ color: def.color || 0xffffff, transparent: true, opacity: 0.9 }),
    );
    return m;
  }

  /** Attach a hidden label naming the marker's role and the body it belongs to. */
  _labelMarker(node, mesh, role, cls) {
    const owner = (node.def.name || node.def.id).split(':')[0].trim();
    const label = makeLabel(`${owner}: ${role}`, `marker ${cls}`);
    label.visible = false;
    mesh.add(label);
    node.markerLabels.push(label);
  }

  _makeGuide(node) {
    const { def } = node;
    const m = def.motion;
    const color = def.guideColor ?? def.color ?? 0xffffff;
    const isPoint = def.kind === 'point';
    const opacity = def.guideOpacity ?? (isPoint ? 0.35 : 0.5);
    const g = new THREE.Group();
    const markerSize = 0.09 * (this.model.markerScale || 1) * (def.markerScale || 1);

    if (m.type === 'circle') {
      // The circle and its centre marker move with the centre; the equant and the crank's
      // fixed point stay with the parent.
      g.add(lineFrom(circleGuidePoints(m, 200), color, opacity));
      if (m.eccentric || m.equant) {
        const c = marker(COLOR_CENTRE, markerSize);
        this._labelMarker(node, c, m.equant ? 'centre of deferent' : 'centre of eccentric', 'centre');
        g.add(c);
        node.markers.push(c);
      }
      const fixed = new THREE.Group();
      const q = equantPoint(m);
      if (q) {
        const e = marker(COLOR_EQUANT, markerSize);
        this._labelMarker(node, e, 'equant', '');
        e.position.copy(planeToWorld(q[0], q[1], m.incl, m.node));
        fixed.add(e);
        node.markers.push(e);
      }
      const k = m.eccentric?.crank;
      if (k) {
        const [bx, by] = circleBaseCentre(m);
        const pts = [];
        for (let i = 0; i < 96; i++) {
          const a = (TAU * i) / 96;
          pts.push(planeToWorld(bx + k.radius * Math.cos(a), by + k.radius * Math.sin(a), m.incl, m.node));
        }
        fixed.add(lineFrom(pts, COLOR_CENTRE, 0.45));
        const base = marker(COLOR_CENTRE, markerSize * 0.7);
        this._labelMarker(node, base, 'centre of the crank', 'centre');
        base.position.copy(planeToWorld(bx, by, m.incl, m.node));
        fixed.add(base);
        node.markers.push(base);
        node.crankArm = new THREE.Line(
          new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]),
          new THREE.LineBasicMaterial({ color: COLOR_CENTRE, transparent: true, opacity: 0.5, depthWrite: false }),
        );
        node.crankArm.frustumCulled = false;
        fixed.add(node.crankArm);
      }
      if (fixed.children.length) node.guideFixed = fixed;
      if (def.torus) {
        const torus = new THREE.Mesh(
          new THREE.TorusGeometry(m.radius, def.torus.tube, 16, 200),
          new THREE.MeshBasicMaterial({ color: def.torus.color || color, transparent: true, opacity: def.torus.opacity ?? 0.45, depthWrite: false }),
        );
        torus.geometry.rotateX(Math.PI / 2);
        torus.quaternion.copy(tiltQuaternion(m.incl, m.node));
        g.add(torus);
      }
    } else if (m.type === 'ellipse') {
      g.add(lineFrom(ellipseGuidePoints(m, 256), color, opacity));
      if (def.showFoci !== false && m.e > 0.01) {
        const f = marker(COLOR_FOCUS, markerSize * 0.8);
        this._labelMarker(node, f, 'empty focus', 'focus');
        f.position.copy(ellipseEmptyFocus(m));
        g.add(f);
        node.markers.push(f);
      }
    } else if (m.type === 'eudoxus') {
      const hippo = new THREE.Group();
      hippo.add(lineFrom(hippopedeGuidePoints(m, 256), color, 0.85, false));
      g.add(hippo);
      node.hippo = hippo;
      const zod = lineFrom(circleGuidePoints({ radius: m.radius }, 200), color, 0.18);
      g.add(zod);
    } else {
      return null;
    }
    return g;
  }

  _makeSphere(node) {
    const { def } = node;
    const m = def.motion || {};
    const radius = def.sphereRadius ?? m.radius;
    const color = def.sphereColor ?? 0x8fb8ff;
    const g = new THREE.Group();
    const mesh = new THREE.Mesh(
      new THREE.SphereGeometry(radius, 64, 40),
      new THREE.MeshPhysicalMaterial({
        color, transparent: true, opacity: def.sphereOpacity ?? 0.045, roughness: 0.2, metalness: 0,
        side: THREE.FrontSide, depthWrite: false,
        emissive: new THREE.Color(color), emissiveIntensity: 0.35,
      }),
    );
    mesh.renderOrder = -2;
    g.add(mesh);
    g.add(greatCircles(radius, color, 0.14));
    if (m.type === 'circle' && m.eccentric) {
      const [cx, cy] = circleBaseCentre(m);
      g.userData.offset = planeToWorld(cx, cy, m.incl, m.node);
    }
    return g;
  }

  _buildShells() {
    this.shells = new THREE.Group();
    for (const s of this.model.shells || []) {
      const mesh = new THREE.Mesh(
        new THREE.SphereGeometry(s.radius, 64, 40),
        new THREE.MeshPhysicalMaterial({
          color: s.color, transparent: true, opacity: s.opacity ?? 0.1, roughness: 0.3, metalness: 0,
          side: s.inside ? THREE.BackSide : THREE.FrontSide, depthWrite: false,
          emissive: new THREE.Color(s.emissive ?? s.color), emissiveIntensity: s.emissiveIntensity ?? 0.55,
        }),
      );
      mesh.renderOrder = -3;
      this.shells.add(mesh);
      if (s.wire) this.shells.add(greatCircles(s.radius, s.color, 0.2));
      if (s.name) {
        const l = makeLabel(s.name, 'shell');
        l.position.set(0, s.radius, 0);
        this.shells.add(l);
      }
    }
    this.group.add(this.shells);
  }

  _buildSolids() {
    this.solids = null;
    const list = this.model.extras?.solids;
    if (!list) return;
    this.solids = new THREE.Group();
    const mat = new THREE.LineBasicMaterial({ color: 0xd8c27a, transparent: true, opacity: 0.55, depthWrite: false });
    for (const s of list) {
      let geom;
      switch (s.type) {
        case 'cube': { const side = (2 * s.radius) / Math.sqrt(3); geom = new THREE.BoxGeometry(side, side, side); break; }
        case 'tetrahedron': geom = new THREE.TetrahedronGeometry(s.radius); break;
        case 'octahedron': geom = new THREE.OctahedronGeometry(s.radius); break;
        case 'dodecahedron': geom = new THREE.DodecahedronGeometry(s.radius); break;
        case 'icosahedron': geom = new THREE.IcosahedronGeometry(s.radius); break;
        default: continue;
      }
      const edges = new THREE.LineSegments(new THREE.EdgesGeometry(geom), mat);
      geom.dispose();
      this.solids.add(edges);
      const l = makeLabel(s.label || s.type, 'shell');
      l.position.set(0, s.radius * 0.95, 0);
      this.solids.add(l);
    }
    this.group.add(this.solids);
  }

  _buildSweeps() {
    this.sweeps = [];
    for (const node of this.nodes) {
      const sw = node.def.sweep;
      if (!sw || node.def.motion?.type !== 'ellipse') continue;
      const steps = sw.steps || 32;
      const mk = (color) => {
        const geom = new THREE.BufferGeometry();
        geom.setAttribute('position', new THREE.BufferAttribute(new Float32Array((steps + 2) * 3), 3).setUsage(THREE.DynamicDrawUsage));
        const idx = [];
        for (let k = 1; k <= steps; k++) idx.push(0, k, k + 1);
        geom.setIndex(idx);
        const mesh = new THREE.Mesh(geom, new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.32, side: THREE.DoubleSide, depthWrite: false }));
        mesh.frustumCulled = false;
        this.group.add(mesh);
        return mesh;
      };
      this.sweeps.push({ node, steps, days: sw.days || 40, meshes: [mk(0xffa060), mk(0x60c0ff)] });
    }
  }

  // ---------------------------------------------------------------------------- update

  _computePositions(t, arr) {
    for (const node of this.nodes) {
      const parentPos = node.parent ? arr[node.parent.index] : ZERO;
      const out = arr[node.index];
      computeOffset(node.def.motion, t, out).add(parentPos);
      if (node.def.motion?.type === 'eudoxus') node.lam = eudoxusLongitude(node.def.motion, t);
    }
  }

  applyFlags(flags) {
    this.flags = { ...flags };
    const f = this.flags;
    const ev = this.earthView;
    const mech = !!f.mechanism && !ev;
    for (const node of this.nodes) {
      const isPoint = node.def.kind === 'point';
      const lit = this._highlight.has(node.id);
      if (node.guide) node.guide.visible = !!f.guides;
      if (node.guideFixed) node.guideFixed.visible = !!f.guides && !ev;
      for (const m of node.markers) m.visible = mech;
      for (const l of node.markerLabels) l.visible = mech && !!f.labels && lit;
      if (node.arm) node.arm.visible = mech;
      if (isPoint) node.mesh.visible = mech;
      if (node.sphere) node.sphere.visible = !!f.spheres;
      if (node.trail) node.trail.object.visible = !!f.trails;
      if (node.label) node.label.visible = !!f.labels && (!isPoint || mech);
    }
    this.shells.visible = !!f.spheres && !ev;
    if (this.solids) this.solids.visible = !!f.solids;
    for (const sw of this.sweeps) for (const m of sw.meshes) m.visible = !!f.sweep;
    const earth = this.byId.get('earth');
    if (earth) earth.mesh.visible = !ev;
  }

  /** Label the mechanism markers belonging to this body and the chain that carries it. */
  setHighlight(id) {
    this._highlight = new Set();
    for (let n = this.byId.get(id); n; n = n.parent) this._highlight.add(n.id);
    this.applyFlags(this.flags);
  }

  /** From the Earth the mechanism is invisible: hide markers, arms, points and the Earth itself. */
  setEarthView(on) {
    this.earthView = !!on;
    this.applyFlags(this.flags);
  }

  setFrame(frameId) {
    const id = this.byId.has(frameId) ? frameId : null;
    if (id === this.frameId) return;
    this.frameId = id;
    this.clearTrails();
  }

  clearTrails() {
    for (const n of this.trailNodes) n.trail.clear();
    this.lastT = null;
  }

  update(t, { diurnalAngle = 0 } = {}) {
    this._computePositions(t, this.pos);
    const frameNode = this.frameId ? this.byId.get(this.frameId) : null;
    for (const node of this.nodes) {
      const parentPos = node.parent ? node.parent.pos : ZERO;
      if (node.belt) {
        const { attr, scratch } = node.belt;
        const els = node.def.elements;
        for (let k = 0; k < els.length; k++) {
          ellipseOffset(els[k], t, scratch).add(parentPos);
          attr.setXYZ(k, scratch.x, scratch.y, scratch.z);
        }
        attr.needsUpdate = true;
        continue;
      }
      node.mesh.position.copy(node.pos);
      if (node.guide) {
        node.guide.position.copy(parentPos);
        const m = node.def.motion;
        if (m.type === 'circle' && m.eccentric) {
          const [cx, cy] = circleCentre(m, t);
          node.guide.position.add(planeToWorld(cx, cy, m.incl, m.node, this._tmpCentre));
          if (node.crankArm) {
            const [bx, by] = circleBaseCentre(m);
            const a = node.crankArm.geometry.attributes.position;
            planeToWorld(bx, by, m.incl, m.node, this._tmpBase);
            a.setXYZ(0, this._tmpBase.x, this._tmpBase.y, this._tmpBase.z);
            a.setXYZ(1, this._tmpCentre.x, this._tmpCentre.y, this._tmpCentre.z);
            a.needsUpdate = true;
          }
        }
        if (node.hippo) node.hippo.rotation.y = node.lam;
      }
      if (node.guideFixed) node.guideFixed.position.copy(parentPos);
      if (node.sphere) {
        node.sphere.position.copy(parentPos);
        const sm = node.def.motion;
        if (sm?.type === 'circle' && sm.eccentric?.crank) {
          const [cx, cy] = circleCentre(sm, t);
          node.sphere.position.add(planeToWorld(cx, cy, sm.incl, sm.node, this._tmpCentre));
        } else if (node.sphere.userData.offset) {
          node.sphere.position.add(node.sphere.userData.offset);
        }
      }
      if (node.arm) {
        const a = node.arm.geometry.attributes.position;
        a.setXYZ(0, parentPos.x, parentPos.y, parentPos.z);
        a.setXYZ(1, node.pos.x, node.pos.y, node.pos.z);
        a.needsUpdate = true;
      }
      if (node.def.spin) node.mesh.rotation.y = (TAU * t) / node.def.spin;
      if (node.def.rotates) this._orientEarth(node, t, diurnalAngle);
      if (node.trail) node.trail.object.position.copy(frameNode ? frameNode.pos : ZERO);
    }
    this._sampleTrails(t, frameNode);
    this._updateSweeps(t);
  }

  /** Tilt the Earth's axis to the celestial pole of date and spin it when daily rotation is on. */
  _orientEarth(node, t, diurnalAngle) {
    celestialPole(t, this._pole);
    this._qTilt.setFromUnitVectors(this._up, this._pole);
    this._qSpin.setFromAxisAngle(this._pole, diurnalAngle);
    node.mesh.quaternion.copy(this._qSpin).multiply(this._qTilt);
  }

  _sampleTrails(t, frameNode) {
    const nodes = this.trailNodes;
    if (!nodes.length) return;
    if (this.lastT === null || t < this.lastT - 1e-9) {
      for (const n of nodes) { n.trail.clear(); n.nextSample = t; }
    }
    this.lastT = t;
    let iter = 0;
    const MAX_ITER = 48;
    while (iter < MAX_ITER) {
      let tau = Infinity;
      for (const n of nodes) if (n.nextSample < tau) tau = n.nextSample;
      if (tau > t) break;
      this._computePositions(tau, this.scratch);
      const fp = frameNode ? this.scratch[frameNode.index] : ZERO;
      for (const n of nodes) {
        if (n.nextSample <= tau + 1e-9) {
          n.trail.push(this.scratch[n.index].clone().sub(fp));
          n.nextSample += n.interval;
        }
      }
      iter++;
    }
    if (iter >= MAX_ITER) {
      // Time is advancing faster than the sampler can follow: resynchronise.
      for (const n of nodes) if (n.nextSample < t) n.nextSample = t + n.interval;
    }
  }

  _updateSweeps(t) {
    if (!this.sweeps.length || !this.flags.sweep) return;
    const tmp = new THREE.Vector3();
    for (const sw of this.sweeps) {
      const m = sw.node.def.motion;
      const parentPos = sw.node.parent ? sw.node.parent.pos : ZERO;
      const starts = [t - sw.days, t - sw.days + m.period / 2];
      sw.meshes.forEach((mesh, j) => {
        const a = mesh.geometry.attributes.position;
        a.setXYZ(0, parentPos.x, parentPos.y, parentPos.z);
        for (let k = 0; k <= sw.steps; k++) {
          ellipseOffset(m, starts[j] + (sw.days * k) / sw.steps, tmp).add(parentPos);
          a.setXYZ(k + 1, tmp.x, tmp.y, tmp.z);
        }
        a.needsUpdate = true;
      });
    }
  }

  // ---------------------------------------------------------------------------- queries

  has(id) { return this.byId.has(id); }

  bodySize(id) {
    const node = this.byId.get(id);
    return node ? node.def.size || 0.2 : 0.2;
  }

  /** Camera distance that frames a body together with its epicycle and any satellites. */
  focusDistance(id) {
    const node = this.byId.get(id);
    if (!node) return 3;
    let d = (node.def.size || 0.2) * 12;
    const m = node.def.motion;
    if (node.parent && node.parent.def.kind === 'point' && m?.type === 'circle') d = Math.max(d, m.radius * 2.6);
    for (const child of this.nodes) {
      if (child.parent !== node || child.def.kind === 'point') continue;
      const cm = child.def.motion;
      const r = cm?.radius ?? cm?.a ?? 0;
      if (r) d = Math.max(d, r * 1.5);
    }
    return Math.max(2.5, d);
  }

  bodies() {
    return this.nodes.filter((n) => n.def.kind === 'body').map((n) => ({ id: n.id, name: n.def.name }));
  }

  worldPosition(id, out = new THREE.Vector3()) {
    const node = this.byId.get(id);
    if (!node) return null;
    return node.mesh.getWorldPosition(out);
  }

  setBodyVisible(id, visible) {
    const node = this.byId.get(id);
    if (!node) return;
    node.mesh.visible = visible;
  }

  dispose() {
    disposeObject(this.group);
    for (const n of this.trailNodes) n.trail.dispose();
    this.group.removeFromParent();
  }
}

export { DEG };
