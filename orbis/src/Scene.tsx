import { useEffect, useRef, useState, type MutableRefObject } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import {
  getBodies,
  getPaths,
  getMarkers,
  tracePath,
  type Body,
  type Vec3,
} from "./model";
import type { ModelId } from "./history";

export interface SceneSettings {
  paths: boolean;
  labels: boolean;
  sphere: boolean;
  trail: boolean;
}
export interface SceneProps {
  model: ModelId;
  clock: MutableRefObject<number>;
  playing: boolean;
  view: "cosmic" | "earth";
  settings: SceneSettings;
  selected: string;
  focusToken: number;
  resetToken: number;
  topView: boolean;
  onSelect: (id: string) => void;
}
const v3 = (v: Vec3) => new THREE.Vector3(...v);

function earthTexture(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 128;
  const ctx = canvas.getContext("2d")!;
  const image = ctx.createImageData(256, 128);
  for (let y = 0; y < 128; y++)
    for (let x = 0; x < 256; x++) {
      const u = (x / 256) * Math.PI * 2,
        v = (y / 128) * Math.PI;
      const field =
        Math.sin(u * 3 + Math.sin(v * 4) * 2) +
        Math.cos(v * 7 + Math.sin(u * 2)) * 0.65 +
        Math.sin(u * 11 + v * 13) * 0.25;
      const land = field > 0.6 && y > 12 && y < 117;
      const ice = y < 9 || y > 119;
      const color = ice
        ? [159, 167, 150]
        : land
          ? [104 + field * 8, 112 + field * 6, 83]
          : [32, 64 + field * 3, 72 + field * 4];
      const i = (y * 256 + x) * 4;
      image.data[i] = color[0];
      image.data[i + 1] = color[1];
      image.data[i + 2] = color[2];
      image.data[i + 3] = 255;
    }
  ctx.putImageData(image, 0, 0);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}
function glowTexture(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 64;
  const ctx = canvas.getContext("2d")!;
  const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  gradient.addColorStop(0, "rgba(255,239,192,.6)");
  gradient.addColorStop(0.2, "rgba(255,215,142,.22)");
  gradient.addColorStop(1, "rgba(232,177,100,0)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(canvas);
}

export default function Scene(props: SceneProps) {
  const container = useRef<HTMLDivElement>(null);
  const latest = useRef(props);
  latest.current = props;
  const [unavailable, setUnavailable] = useState(false);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const host = container.current!;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
        powerPreference: "high-performance",
      });
    } catch {
      setUnavailable(true);
      return;
    }
    setUnavailable(false);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.setClearColor(0x000000, 0);
    renderer.domElement.setAttribute(
      "aria-label",
      "Interactive 3D historical cosmos. Drag to orbit, scroll to zoom. Select bodies with the labeled buttons.",
    );
    renderer.domElement.setAttribute("role", "img");
    host.appendChild(renderer.domElement);
    const labels = document.createElement("div");
    labels.className = "scene-labels";
    host.appendChild(labels);
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(42, 1, 0.05, 600);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.07;
    controls.minDistance = 5;
    controls.maxDistance = 160;
    controls.enablePan = true;
    controls.maxPolarAngle = Math.PI * 0.94;
    const ambient = new THREE.AmbientLight("#c2cfcd", 2.25);
    scene.add(ambient);
    const light = new THREE.DirectionalLight("#ffe5bf", 3.4);
    light.position.set(-15, 25, 18);
    scene.add(light);
    const backlight = new THREE.DirectionalLight("#87b1b5", 0.8);
    backlight.position.set(20, -5, -20);
    scene.add(backlight);
    const earthMap = earthTexture(),
      glowMap = glowTexture();
    const sharedSphere = new THREE.SphereGeometry(1, 36, 24);
    const disk = new THREE.CylinderGeometry(1, 1, 2 / 3, 64);
    const content = new THREE.Group();
    scene.add(content);
    const pathGroup = new THREE.Group();
    scene.add(pathGroup);
    const sphereGroup = new THREE.Group();
    scene.add(sphereGroup);
    const markerGroup = new THREE.Group();
    scene.add(markerGroup);
    const lineMaterial = (color: string, opacity: number) =>
      new THREE.LineBasicMaterial({
        color,
        transparent: true,
        opacity,
        depthWrite: false,
      });
    const celestialMaterial = lineMaterial("#8c8a77", 0.15);
    const celestialRadius = 34;
    // A synthetic, repeatable star field: intentionally not a modern catalog projected into antiquity.
    let seed = 1729;
    const random = () => {
      seed = (seed * 16807) % 2147483647;
      return (seed - 1) / 2147483646;
    };
    const starPositions: number[] = [],
      starColors: number[] = [];
    for (let i = 0; i < 1500; i++) {
      const u = random() * Math.PI * 2,
        z = random() * 2 - 1,
        r = 105 + random() * 50;
      starPositions.push(
        r * Math.sqrt(1 - z * z) * Math.cos(u),
        r * z,
        r * Math.sqrt(1 - z * z) * Math.sin(u),
      );
      const brightness = 0.35 + random() * 0.5;
      starColors.push(brightness, brightness * 0.94, brightness * 0.83);
    }
    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(starPositions, 3),
    );
    starGeo.setAttribute(
      "color",
      new THREE.Float32BufferAttribute(starColors, 3),
    );
    const starMat = new THREE.PointsMaterial({
      size: 0.21,
      vertexColors: true,
      transparent: true,
      opacity: 0.82,
      sizeAttenuation: true,
      depthWrite: false,
    });
    const stars = new THREE.Points(starGeo, starMat);
    scene.add(stars);
    const circlePoints = (radius: number, plane: number, latitude = 0) =>
      Array.from({ length: 193 }, (_, i) => {
        const a = (i / 192) * Math.PI * 2;
        const v = new THREE.Vector3(
          radius * Math.cos(a) * Math.cos(latitude),
          radius * Math.sin(latitude),
          radius * Math.sin(a) * Math.cos(latitude),
        );
        if (plane) v.applyAxisAngle(new THREE.Vector3(1, 0, 0), plane);
        return v;
      });
    for (const lat of [-Math.PI / 3, -Math.PI / 6, 0, Math.PI / 6, Math.PI / 3])
      sphereGroup.add(
        new THREE.Line(
          new THREE.BufferGeometry().setFromPoints(
            circlePoints(celestialRadius, 0, lat),
          ),
          celestialMaterial,
        ),
      );
    for (let i = 0; i < 6; i++) {
      const line = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints(
          circlePoints(celestialRadius, Math.PI / 2),
        ),
        celestialMaterial,
      );
      line.rotation.y = (i * Math.PI) / 6;
      sphereGroup.add(line);
    }
    const equator = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(
        circlePoints(celestialRadius, 0),
      ),
      lineMaterial("#ac956e", 0.35),
    );
    sphereGroup.add(equator);
    const tickPositions: number[] = [];
    for (let i = 0; i < 180; i++) {
      const a = (i / 180) * Math.PI * 2,
        long = i % 15 === 0 ? 0.7 : 0.25;
      tickPositions.push(
        Math.cos(a) * 34,
        0,
        Math.sin(a) * 34,
        Math.cos(a) * (34 + long),
        0,
        Math.sin(a) * (34 + long),
      );
    }
    sphereGroup.add(
      new THREE.LineSegments(
        new THREE.BufferGeometry().setAttribute(
          "position",
          new THREE.Float32BufferAttribute(tickPositions, 3),
        ),
        lineMaterial("#bba17a", 0.38),
      ),
    );
    const eclipticLabel = document.createElement("span");
    eclipticLabel.className = "sphere-label";
    eclipticLabel.textContent = "SPHERE OF THE FIXED STARS";
    labels.appendChild(eclipticLabel);
    const meshes = new Map<string, THREE.Mesh>();
    const buttons = new Map<string, HTMLButtonElement>();
    const orbitLines = new Map<string, THREE.Line>();
    let halo: THREE.Sprite | undefined;
    const selectionGeo = new THREE.RingGeometry(1.42, 1.46, 64);
    const selectionMat = new THREE.MeshBasicMaterial({
      color: "#c7ac81",
      transparent: true,
      opacity: 0.7,
      side: THREE.DoubleSide,
      depthTest: false,
    });
    const selection = new THREE.Mesh(selectionGeo, selectionMat);
    selection.renderOrder = 3;
    scene.add(selection);
    const trailMat = new THREE.LineDashedMaterial({
      color: "#d6a37d",
      transparent: true,
      opacity: 0.7,
      dashSize: 0.28,
      gapSize: 0.23,
    });
    const trail = new THREE.Line(new THREE.BufferGeometry(), trailMat);
    scene.add(trail);
    const spoke = new THREE.Line(
      new THREE.BufferGeometry(),
      lineMaterial("#dbb276", 0.55),
    );
    scene.add(spoke);
    let activeModel = "",
      lastView = "",
      lastFocus = -1,
      lastReset = -1,
      lastTop = false;
    let focusId: string | null = null;
    let yaw = 0,
      pitch = 0;
    let lastPath = 0,
      animation = 0;
    let lastTrailKey = "";
    let pointerStart: {
      x: number;
      y: number;
      yaw: number;
      pitch: number;
    } | null = null;
    let downPoint = { x: 0, y: 0 };
    let disposed = false;
    const fitCamera = () => {
      const width = host.clientWidth,
        height = host.clientHeight;
      const ratio = width / Math.max(height, 1);
      const distance = ratio < 1 ? 104 / ratio ** 0.42 : 100;
      camera.position.set(distance * 0.19, distance * 0.56, distance * 0.79);
      controls.target.set(0, 0, 0);
      camera.lookAt(0, 0, 0);
      controls.update();
    };
    const resize = () => {
      const width = host.clientWidth,
        height = host.clientHeight;
      renderer.setSize(width, height);
      camera.aspect = width / Math.max(1, height);
      camera.updateProjectionMatrix();
    };
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(host);
    resize();
    fitCamera();
    const clearModel = () => {
      for (const mesh of meshes.values()) {
        content.remove(mesh);
        (mesh.material as THREE.Material).dispose();
      }
      meshes.clear();
      for (const button of buttons.values()) button.remove();
      buttons.clear();
      for (const line of orbitLines.values()) {
        line.geometry.dispose();
        (line.material as THREE.Material).dispose();
      }
      orbitLines.clear();
      pathGroup.clear();
      for (const item of [...content.children]) {
        item.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            child.geometry.dispose();
            (child.material as THREE.Material).dispose();
          }
        });
        content.remove(item);
      }
      if (halo) {
        scene.remove(halo);
        halo.material.dispose();
        halo = undefined;
      }
      for (const child of markerGroup.children) {
        const m = child as THREE.LineSegments;
        m.geometry.dispose();
        (m.material as THREE.Material).dispose();
      }
      markerGroup.clear();
    };
    const construct = (model: ModelId) => {
      clearModel();
      focusId = null;
      lastTrailKey = "";
      for (const body of getBodies(model, latest.current.clock.current)) {
        const material =
          body.kind === "star"
            ? new THREE.MeshBasicMaterial({ color: body.color })
            : new THREE.MeshStandardMaterial({
                color:
                  body.id === "earth" && model !== "anaximander"
                    ? "#d4e5dd"
                    : body.color,
                roughness: 0.93,
                metalness: 0.07,
                map:
                  body.id === "earth" && model !== "anaximander"
                    ? earthMap
                    : null,
              });
        const mesh = new THREE.Mesh(
          body.id === "earth" && model === "anaximander" ? disk : sharedSphere,
          material,
        );
        mesh.scale.setScalar(body.size);
        mesh.userData.id = body.id;
        content.add(mesh);
        meshes.set(body.id, mesh);
        const button = document.createElement("button");
        button.className = "body-label";
        button.textContent = body.name;
        button.setAttribute("aria-label", `Select ${body.name}`);
        button.dataset.body = body.id;
        button.style.setProperty("--body-color", body.color);
        button.addEventListener("click", () =>
          latest.current.onSelect(body.id),
        );
        labels.appendChild(button);
        buttons.set(body.id, button);
        if (body.id === "sun") {
          halo = new THREE.Sprite(
            new THREE.SpriteMaterial({
              map: glowMap,
              color: "#ffdb9c",
              transparent: true,
              opacity: 0.8,
              depthWrite: false,
              blending: THREE.AdditiveBlending,
            }),
          );
          halo.scale.setScalar(9);
          scene.add(halo);
        }
      }
      if (model === "aristotle")
        for (const r of [6.2, 9.1, 16.5, 22, 27.5]) {
          content.add(
            new THREE.Mesh(
              new THREE.SphereGeometry(r, 40, 24),
              new THREE.MeshBasicMaterial({
                color: "#a0a891",
                transparent: true,
                opacity: 0.018,
                side: THREE.BackSide,
                depthWrite: false,
              }),
            ),
          );
        }
      if (model === "anaximander") {
        for (const [i, r] of [8, 9, 10, 17, 25].entries()) {
          const wheel = new THREE.Mesh(
            new THREE.TorusGeometry(r, 0.15, 8, 160),
            new THREE.MeshStandardMaterial({
              color: "#4b4840",
              emissive: "#9e6136",
              emissiveIntensity: 0.2,
              roughness: 0.7,
            }),
          );
          wheel.rotation.x = Math.PI / 2 - (0.7 + (i < 3 ? i * 0.35 : 0));
          content.add(wheel);
          if (i < 3)
            for (let n = 0; n < 9; n++) {
              const aperture = new THREE.Mesh(
                new THREE.SphereGeometry(0.1, 8, 8),
                new THREE.MeshBasicMaterial({ color: "#dcca9d" }),
              );
              aperture.position.copy(
                new THREE.Vector3(
                  r * Math.cos((n / 9) * Math.PI * 2),
                  r * Math.sin((n / 9) * Math.PI * 2),
                  0,
                ),
              );
              wheel.add(aperture);
            }
        }
      }
      for (const marker of getMarkers(model)) {
        const p = v3(marker.position),
          points = [
            p.clone().add(new THREE.Vector3(-0.19, 0, 0)),
            p.clone().add(new THREE.Vector3(0.19, 0, 0)),
            p.clone().add(new THREE.Vector3(0, 0, -0.19)),
            p.clone().add(new THREE.Vector3(0, 0, 0.19)),
          ];
        markerGroup.add(
          new THREE.LineSegments(
            new THREE.BufferGeometry().setFromPoints(points),
            lineMaterial("#e7ba7c", 0.9),
          ),
        );
      }
      fitCamera();
    };
    const focusSky = (bodies: Body[]) => {
      const body =
        bodies.find(
          (b) => b.id === latest.current.selected && b.id !== "earth",
        ) ?? bodies.find((b) => b.id === "sun")!;
      const earth = bodies.find((b) => b.id === "earth")!;
      const d = v3(body.position).sub(v3(earth.position)).normalize();
      yaw = Math.atan2(-d.x, -d.z);
      pitch = Math.asin(d.y);
    };
    const raycaster = new THREE.Raycaster();
    const pointerDown = (event: PointerEvent) => {
      downPoint = { x: event.clientX, y: event.clientY };
      pointerStart = { x: event.clientX, y: event.clientY, yaw, pitch };
      if (latest.current.view === "earth")
        renderer.domElement.setPointerCapture(event.pointerId);
      else focusId = null;
    };
    const pointerMove = (event: PointerEvent) => {
      if (latest.current.view !== "earth" || !pointerStart) return;
      yaw = pointerStart.yaw - (event.clientX - pointerStart.x) * 0.004;
      pitch = THREE.MathUtils.clamp(
        pointerStart.pitch - (event.clientY - pointerStart.y) * 0.004,
        -1.5,
        1.5,
      );
    };
    const pointerUp = (event: PointerEvent) => {
      pointerStart = null;
      if (
        Math.hypot(event.clientX - downPoint.x, event.clientY - downPoint.y) > 5
      )
        return;
      const rect = renderer.domElement.getBoundingClientRect();
      raycaster.setFromCamera(
        new THREE.Vector2(
          ((event.clientX - rect.left) / rect.width) * 2 - 1,
          (-(event.clientY - rect.top) / rect.height) * 2 + 1,
        ),
        camera,
      );
      const hit = raycaster.intersectObjects(
        [...meshes.values()].filter((m) => m.visible),
      )[0];
      if (hit) latest.current.onSelect(hit.object.userData.id as string);
    };
    const cancelPointer = () => {
      pointerStart = null;
    };
    const wheel = (event: WheelEvent) => {
      if (latest.current.view !== "earth") return;
      event.preventDefault();
      camera.fov = THREE.MathUtils.clamp(
        camera.fov + event.deltaY * 0.025,
        15,
        100,
      );
      camera.updateProjectionMatrix();
    };
    renderer.domElement.addEventListener("pointerdown", pointerDown);
    renderer.domElement.addEventListener("pointermove", pointerMove);
    renderer.domElement.addEventListener("pointerup", pointerUp);
    renderer.domElement.addEventListener("pointercancel", cancelPointer);
    renderer.domElement.addEventListener("wheel", wheel, { passive: false });
    const contextLost = (event: Event) => {
      event.preventDefault();
      setUnavailable(true);
    };
    const contextRestored = () => {
      setUnavailable(false);
    };
    renderer.domElement.addEventListener("webglcontextlost", contextLost);
    renderer.domElement.addEventListener(
      "webglcontextrestored",
      contextRestored,
    );
    const projectLabel = (
      element: HTMLElement,
      position: THREE.Vector3,
      offset: number,
    ) => {
      const projected = position.clone().project(camera);
      const visible =
        projected.z > -1 &&
        projected.z < 1 &&
        Math.abs(projected.x) < 0.98 &&
        Math.abs(projected.y) < 0.96;
      element.style.display = visible ? "" : "none";
      if (visible)
        element.style.transform = `translate(${(projected.x * 0.5 + 0.5) * host.clientWidth + offset}px, ${(-projected.y * 0.5 + 0.5) * host.clientHeight - 7}px)`;
    };
    const animate = (now: number) => {
      if (disposed) return;
      animation = requestAnimationFrame(animate);
      const state = latest.current;
      const t = state.clock.current;
      const modelChanged = activeModel !== state.model;
      if (modelChanged) {
        activeModel = state.model;
        construct(state.model);
        lastPath = -Infinity;
      }
      const bodies = getBodies(state.model, t);
      const viewChanged = lastView !== state.view || modelChanged;
      if (viewChanged) {
        lastView = state.view;
        focusId = null;
        camera.fov = state.view === "earth" ? 65 : 42;
        camera.updateProjectionMatrix();
        controls.enabled = state.view === "cosmic";
      }
      // Reconcile the requested preset AFTER changing coordinate/viewpoint modes.
      if (
        viewChanged ||
        lastReset !== state.resetToken ||
        lastTop !== state.topView
      ) {
        lastReset = state.resetToken;
        lastTop = state.topView;
        focusId = null;
        fitCamera();
        if (state.view === "earth") focusSky(bodies);
        else if (state.topView) {
          camera.position.set(0, 102, 0.01);
          camera.lookAt(0, 0, 0);
          controls.update();
        }
      }
      if (lastFocus !== state.focusToken) {
        lastFocus = state.focusToken;
        if (state.view === "earth") focusSky(bodies);
        else if (state.focusToken > 0) {
          focusId = state.selected;
          const body = bodies.find((b) => b.id === focusId);
          if (body) {
            controls.target.copy(v3(body.position));
            camera.position.copy(
              v3(body.position).add(new THREE.Vector3(8, 7, 12)),
            );
            controls.update();
          }
        }
      }
      for (const body of bodies) {
        const mesh = meshes.get(body.id)!;
        mesh.position.copy(v3(body.position));
        mesh.visible = !(state.view === "earth" && body.id === "earth");
        if (body.id === "sun" && halo) halo.position.copy(mesh.position);
      }
      if (state.view === "earth") {
        camera.position.copy(
          v3(bodies.find((b) => b.id === "earth")!.position),
        );
        camera.rotation.set(pitch, yaw, 0, "YXZ");
      } else {
        if (focusId) {
          const target = meshes.get(focusId)?.position;
          if (target) {
            const shift = target.clone().sub(controls.target);
            camera.position.add(shift);
            controls.target.copy(target);
          }
        }
        controls.update();
      }
      const selectedBody = bodies.find((b) => b.id === state.selected);
      selection.visible = Boolean(
        selectedBody && !(state.view === "earth" && state.selected === "earth"),
      );
      if (selectedBody) {
        selection.position.copy(v3(selectedBody.position));
        selection.scale.setScalar(selectedBody.size);
        selection.quaternion.copy(camera.quaternion);
      }
      pathGroup.visible = state.settings.paths && state.view === "cosmic";
      sphereGroup.visible =
        state.settings.sphere && state.model !== "anaximander";
      stars.visible = state.model !== "anaximander";
      markerGroup.visible = state.settings.trail && state.view === "cosmic";
      if (now - lastPath > 80 || modelChanged || !state.playing) {
        for (const path of getPaths(state.model, t)) {
          let line = orbitLines.get(path.id);
          if (!line) {
            line = new THREE.Line(
              new THREE.BufferGeometry(),
              lineMaterial(
                path.color,
                path.kind === "epicycle"
                  ? 0.54
                  : path.kind === "sphere"
                    ? 0.17
                    : 0.29,
              ),
            );
            orbitLines.set(path.id, line);
            pathGroup.add(line);
          }
          line.geometry.setFromPoints(path.points.map(v3));
          const highlighted =
            path.id === state.selected ||
            path.id === `${state.selected}-epicycle`;
          (line.material as THREE.LineBasicMaterial).opacity = state.settings
            .trail
            ? highlighted
              ? 0.78
              : 0.14
            : path.kind === "epicycle"
              ? 0.54
              : path.kind === "sphere"
                ? 0.17
                : 0.29;
        }
        const trailKey = `${state.model}:${state.selected}:${Math.floor(t / 4)}:${state.settings.trail}`;
        if (state.settings.trail && trailKey !== lastTrailKey) {
          trail.geometry.setFromPoints(
            tracePath(state.model, state.selected, t).map(v3),
          );
          trail.computeLineDistances();
          lastTrailKey = trailKey;
        }
        if (selectedBody) {
          const origin =
            state.model === "ptolemy" || state.model === "hipparchus"
              ? new THREE.Vector3()
              : v3(bodies.find((b) => b.id === "sun")!.position);
          spoke.geometry.setFromPoints([origin, v3(selectedBody.position)]);
        }
        lastPath = now;
      }
      trail.visible = state.settings.trail && state.view === "cosmic";
      spoke.visible = state.settings.trail && state.view === "cosmic";
      for (const body of bodies) {
        const button = buttons.get(body.id)!;
        button.classList.toggle("selected", body.id === state.selected);
        if (
          state.settings.labels &&
          !(state.view === "earth" && body.id === "earth")
        )
          projectLabel(button, v3(body.position), 12 + body.size * 4);
        else button.style.display = "none";
      }
      if (
        state.settings.sphere &&
        state.settings.labels &&
        state.view === "cosmic" &&
        state.model !== "anaximander"
      )
        projectLabel(eclipticLabel, new THREE.Vector3(0, 22.5, -25.5), 0);
      else eclipticLabel.style.display = "none";
      renderer.render(scene, camera);
      // Expose the actual direction for camera diagnostics and geometry-level browser tests.
      const direction = camera.getWorldDirection(new THREE.Vector3());
      host.dataset.cameraDirection = `${direction.x.toFixed(5)},${direction.y.toFixed(5)},${direction.z.toFixed(5)}`;
    };
    animation = requestAnimationFrame(animate);
    setReady(true);
    return () => {
      disposed = true;
      cancelAnimationFrame(animation);
      resizeObserver.disconnect();
      controls.dispose();
      renderer.domElement.removeEventListener("pointerdown", pointerDown);
      renderer.domElement.removeEventListener("pointermove", pointerMove);
      renderer.domElement.removeEventListener("pointerup", pointerUp);
      renderer.domElement.removeEventListener("pointercancel", cancelPointer);
      renderer.domElement.removeEventListener("wheel", wheel);
      renderer.domElement.removeEventListener("webglcontextlost", contextLost);
      renderer.domElement.removeEventListener(
        "webglcontextrestored",
        contextRestored,
      );
      clearModel();
      const materials = new Set<THREE.Material>();
      scene.traverse((object) => {
        if (
          object instanceof THREE.Mesh ||
          object instanceof THREE.Line ||
          object instanceof THREE.Points
        ) {
          object.geometry.dispose();
          const material = object.material;
          (Array.isArray(material) ? material : [material]).forEach((m) =>
            materials.add(m),
          );
        }
      });
      materials.forEach((m) => m.dispose());
      sharedSphere.dispose();
      disk.dispose();
      earthMap.dispose();
      glowMap.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      renderer.domElement.remove();
      labels.remove();
    };
  }, []);
  return (
    <div
      className="scene-host"
      ref={container}
      data-testid="cosmos"
      data-ready={ready && !unavailable}
    >
      {unavailable && (
        <div className="webgl-fallback" role="status">
          <span className="eyebrow">3D VIEW UNAVAILABLE</span>
          <h2>The heavens need WebGL.</h2>
          <p>
            Enable hardware acceleration in your browser, or try another
            browser. Every historical chapter, source, and motion chart remains
            available below.
          </p>
        </div>
      )}
    </div>
  );
}
