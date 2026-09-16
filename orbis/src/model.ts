import { hasJovianMoons, type ModelId } from "./history";

export type Vec3 = [number, number, number];
export interface Body {
  id: string;
  name: string;
  position: Vec3;
  color: string;
  size: number;
  kind: "star" | "planet" | "moon";
  parent?: string;
}
export interface OrbitPath {
  id: string;
  points: Vec3[];
  color: string;
  kind: "orbit" | "epicycle" | "sphere";
}
export interface Marker {
  name: string;
  position: Vec3;
}
export interface Planet {
  id: string;
  name: string;
  radius: number;
  period: number;
  eccentricity: number;
  phase: number;
  color: string;
  size: number;
}
export const TAU = Math.PI * 2;
export const planets: Planet[] = [
  {
    id: "mercury",
    name: "Mercury",
    radius: 5.4,
    period: 87.969,
    eccentricity: 0.2056,
    phase: 2.1,
    color: "#b3a493",
    size: 0.31,
  },
  {
    id: "venus",
    name: "Venus",
    radius: 8.3,
    period: 224.701,
    eccentricity: 0.0068,
    phase: 4.2,
    color: "#dac29a",
    size: 0.52,
  },
  {
    id: "earth",
    name: "Earth",
    radius: 11.5,
    period: 365.256,
    eccentricity: 0.0167,
    phase: 0.35,
    color: "#83aaa5",
    size: 0.83,
  },
  {
    id: "mars",
    name: "Mars",
    radius: 15.5,
    period: 686.98,
    eccentricity: 0.0934,
    phase: 5.7,
    color: "#cd9071",
    size: 0.44,
  },
  {
    id: "jupiter",
    name: "Jupiter",
    radius: 21,
    period: 4332.59,
    eccentricity: 0.0484,
    phase: 2.4,
    color: "#d1b392",
    size: 1.02,
  },
  {
    id: "saturn",
    name: "Saturn",
    radius: 27,
    period: 10759.22,
    eccentricity: 0.0542,
    phase: 4.6,
    color: "#c6b382",
    size: 0.82,
  },
];
export const add = (a: Vec3, b: Vec3): Vec3 => [
  a[0] + b[0],
  a[1] + b[1],
  a[2] + b[2],
];
export const subtract = (a: Vec3, b: Vec3): Vec3 => [
  a[0] - b[0],
  a[1] - b[1],
  a[2] - b[2],
];
export const length = (v: Vec3) => Math.hypot(...v);
export const circle = (r: number, angle: number, tilt = 0): Vec3 => [
  r * Math.cos(angle),
  r * Math.sin(angle) * Math.sin(tilt),
  r * Math.sin(angle) * Math.cos(tilt),
];
const rotateY = ([x, y, z]: Vec3, a: number): Vec3 => [
  x * Math.cos(a) - z * Math.sin(a),
  y,
  x * Math.sin(a) + z * Math.cos(a),
];
const rotateX = ([x, y, z]: Vec3, a: number): Vec3 => [
  x,
  y * Math.cos(a) - z * Math.sin(a),
  y * Math.sin(a) + z * Math.cos(a),
];

/** Solve M = E - e sin(E), including negative time and eccentric ellipses. */
export function solveKepler(meanAnomaly: number, eccentricity: number): number {
  if (
    !Number.isFinite(meanAnomaly) ||
    !Number.isFinite(eccentricity) ||
    eccentricity < 0 ||
    eccentricity >= 1
  )
    throw new RangeError("Expected a finite anomaly and 0 ≤ eccentricity < 1.");
  const m = ((((meanAnomaly + Math.PI) % TAU) + TAU) % TAU) - Math.PI;
  // Bracketing avoids Newton iteration diverging for nearly parabolic ellipses.
  let lo = -Math.PI,
    hi = Math.PI,
    e = m;
  for (let i = 0; i < 64; i++) {
    const residual = e - eccentricity * Math.sin(e) - m;
    if (Math.abs(residual) < 1e-12) break;
    if (residual > 0) hi = e;
    else lo = e;
    const next = e - residual / (1 - eccentricity * Math.cos(e));
    e = next > lo && next < hi ? next : (lo + hi) / 2;
  }
  return e;
}
export function ellipsePosition(a: number, e: number, mean: number): Vec3 {
  const anomaly = solveKepler(mean, e);
  return [
    a * (Math.cos(anomaly) - e),
    0,
    a * Math.sqrt(1 - e * e) * Math.sin(anomaly),
  ];
}

/** The ray from the equant intersects the eccentric deferent at its moving epicycle center. */
export function equantCenter(
  radius: number,
  offset: number,
  angle: number,
): Vec3 {
  const c = Math.cos(angle),
    s = Math.sin(angle);
  const distance =
    -offset * c + Math.sqrt(radius * radius - offset * offset * s * s);
  return [2 * offset + distance * c, 0, distance * s];
}
const earth: Body = {
  id: "earth",
  name: "Earth",
  position: [0, 0, 0],
  color: "#83aaa5",
  size: 0.92,
  kind: "planet",
};
const sun = (position: Vec3): Body => ({
  id: "sun",
  name: "Sun",
  position,
  color: "#e9c68e",
  size: 1.05,
  kind: "star",
});
const asBody = (p: Planet, position: Vec3): Body => ({
  ...p,
  position,
  kind: "planet",
});
const outer = (p: Planet) =>
  p.id === "mars" || p.id === "jupiter" || p.id === "saturn";
const geoRadius = (p: Planet) =>
  ({ mercury: 6.2, venus: 9.1, mars: 16.5, jupiter: 22, saturn: 27.5 })[p.id] ??
  0;
// The outer epicycle must be large enough for its annual tangential motion to
// overcome the deferent near opposition. Mars needs r/R ≈ 1/1.52, not a tiny loop.
const epiRadius = (p: Planet) =>
  ({ mercury: 2.4, venus: 6.55, mars: 10.8, jupiter: 4.2, saturn: 2.9 })[
    p.id
  ] ?? 0.4;
const mean = (p: Planet, t: number) => (TAU * t) / p.period + p.phase;
const elliptical = (model: ModelId) =>
  model === "kepler" || model === "harmony";
function solarPosition(model: ModelId, p: Planet, t: number): Vec3 {
  const m = mean(p, t);
  if (elliptical(model)) return ellipsePosition(p.radius, p.eccentricity, m);
  const main = circle(p.radius, m);
  return model === "copernicus"
    ? add(main, circle(p.radius * 0.034, -2 * m))
    : main;
}
// Deliberately illustrative periods: the coupled sphere motion must be fast
// enough to visibly reverse longitude, rather than merely oscillate in latitude.
const sphereWobble = (p: Planet, t: number) =>
  (TAU * t) / (outer(p) ? 100 : 24) + p.phase;
/** Representative coupled rotations, preserving the homocentric constant-distance invariant. */
export function homocentricPosition(p: Planet, t: number): Vec3 {
  const wobble = sphereWobble(p, t);
  return rotateY(
    rotateX(
      rotateY(rotateX(circle(geoRadius(p), wobble), 0.62), -wobble),
      -0.62,
    ),
    mean(p, t),
  );
}
export function getBodies(model: ModelId, t: number): Body[] {
  if (model === "anaximander")
    return [
      { ...earth, size: 1.65 },
      sun(circle(25, (TAU * t) / 365.25 + 0.9, 0.7)),
      {
        id: "moon",
        name: "Moon aperture",
        position: circle(17, (TAU * t) / 27.32 + 3, 0.7),
        color: "#d2d2b8",
        size: 0.63,
        kind: "moon",
      },
    ];
  if (model === "hipparchus")
    return [
      earth,
      sun(add([18 / 24, 0, 0], circle(18, (TAU * t) / 365.25 + 0.8))),
    ];
  const bodies: Body[] = [];
  if (model === "ptolemy" || model === "eudoxus" || model === "aristotle") {
    bodies.push(earth, sun(circle(12.6, (TAU * t) / 365.25 + 0.85)));
    for (const p of planets.filter((p) => p.id !== "earth")) {
      const dangle = outer(p) ? mean(p, t) : (TAU * t) / 365.25 + 0.85;
      const position =
        model === "ptolemy"
          ? add(
              equantCenter(geoRadius(p), geoRadius(p) * 0.035, dangle),
              circle(
                epiRadius(p),
                outer(p) ? (TAU * t) / 365.25 + 0.85 : mean(p, t),
              ),
            )
          : homocentricPosition(p, t);
      bodies.push(asBody(p, position));
    }
  } else {
    const sunPosition: Vec3 =
      model === "tycho"
        ? circle(11.5, (TAU * t) / 365.256 + 0.35 + Math.PI)
        : [0, 0, 0];
    bodies.push(sun(sunPosition));
    for (const p of planets)
      bodies.push(
        p.id === "earth" && model === "tycho"
          ? earth
          : asBody(p, add(sunPosition, solarPosition(model, p, t))),
      );
  }
  const earthPosition = bodies.find((b) => b.id === "earth")!.position;
  bodies.push({
    id: "moon",
    name: "Moon",
    position: add(earthPosition, circle(2.65, (TAU * t) / 27.32 + 2.4, 0.089)),
    color: "#d2d2be",
    size: 0.3,
    kind: "moon",
    parent: "earth",
  });
  if (hasJovianMoons(model)) {
    const jupiter = bodies.find((b) => b.id === "jupiter")!.position;
    const moons = [
      ["io", "Io", 1.77, 1.8],
      ["europa", "Europa", 3.55, 2.5],
      ["ganymede", "Ganymede", 7.15, 3.3],
      ["callisto", "Callisto", 16.69, 4.25],
    ] as const;
    for (const [i, [id, name, period, radius]] of moons.entries())
      bodies.push({
        id,
        name,
        position: add(jupiter, circle(radius, (TAU * t) / period + i)),
        color: "#c9bfa6",
        size: 0.13,
        kind: "moon",
        parent: "jupiter",
      });
  }
  return bodies;
}
export function sampleCircle(
  radius: number,
  center: Vec3 = [0, 0, 0],
  tilt = 0,
): Vec3[] {
  return Array.from({ length: 161 }, (_, i) =>
    add(center, circle(radius, (i / 160) * TAU, tilt)),
  );
}
export function getPaths(model: ModelId, t: number): OrbitPath[] {
  const paths: OrbitPath[] = [];
  const path = (
    id: string,
    points: Vec3[],
    color = "#9e927a",
    kind: OrbitPath["kind"] = "orbit",
  ) => paths.push({ id, points, color, kind });
  if (model === "anaximander") {
    for (const [i, r] of [8, 9, 10, 17, 25].entries())
      path(
        `wheel-${i}`,
        sampleCircle(r, [0, 0, 0], 0.7 + (i < 3 ? i * 0.35 : 0)),
        i === 4 ? "#d2a266" : "#aa9572",
        "sphere",
      );
    return paths;
  }
  if (model === "hipparchus") {
    path("solar-circle", sampleCircle(18, [18 / 24, 0, 0]), "#d9bb83");
    return paths;
  }
  const bodies = getBodies(model, t);
  const earthPosition = bodies.find((b) => b.id === "earth")!.position;
  const sunPosition = bodies.find((b) => b.id === "sun")!.position;
  path("moon", sampleCircle(2.65, earthPosition, 0.089), "#8f9a97");
  if (["ptolemy", "eudoxus", "aristotle"].includes(model)) {
    path("sun", sampleCircle(12.6), "#c5a573");
    for (const p of planets.filter((p) => p.id !== "earth")) {
      const r = geoRadius(p);
      if (model === "ptolemy") {
        path(p.id, sampleCircle(r, [r * 0.035, 0, 0]), p.color);
        path(
          `${p.id}-epicycle`,
          sampleCircle(
            epiRadius(p),
            equantCenter(
              r,
              r * 0.035,
              outer(p) ? mean(p, t) : (TAU * t) / 365.25 + 0.85,
            ),
          ),
          p.color,
          "epicycle",
        );
      } else {
        path(p.id, sampleCircle(r), p.color);
        const wobble = sphereWobble(p, t);
        path(
          `${p.id}-sphere-a`,
          sampleCircle(r).map((v) => rotateY(rotateX(v, 0.62), mean(p, t))),
          p.color,
          "sphere",
        );
        path(
          `${p.id}-sphere-b`,
          sampleCircle(r).map((v) =>
            rotateY(
              rotateX(rotateY(rotateX(v, 0.62), -wobble), -0.62),
              mean(p, t),
            ),
          ),
          p.color,
          "sphere",
        );
      }
    }
  } else {
    if (model === "tycho") path("sun-earth", sampleCircle(11.5), "#d9bb83");
    for (const p of planets) {
      if (p.id === "earth" && model === "tycho") continue;
      path(
        p.id,
        Array.from({ length: 161 }, (_, i) =>
          add(
            sunPosition,
            elliptical(model)
              ? ellipsePosition(p.radius, p.eccentricity, (i / 160) * TAU)
              : circle(p.radius, (i / 160) * TAU),
          ),
        ),
        p.color,
      );
      if (model === "copernicus")
        path(
          `${p.id}-epicycle`,
          sampleCircle(p.radius * 0.034, circle(p.radius, mean(p, t))),
          p.color,
          "epicycle",
        );
    }
  }
  if (hasJovianMoons(model)) {
    const jupiter = bodies.find((b) => b.id === "jupiter")!.position;
    for (const [i, r] of [1.8, 2.5, 3.3, 4.25].entries())
      path(`jovian-${i}`, sampleCircle(r, jupiter), "#aeab94");
  }
  return paths;
}
export function getMarkers(model: ModelId): Marker[] {
  if (model === "hipparchus")
    return [{ name: "Circle center", position: [0.75, 0, 0] }];
  if (model === "ptolemy")
    return [
      { name: "Deferent center · Mars", position: [0.5775, 0, 0] },
      { name: "Equant · Mars", position: [1.155, 0, 0] },
    ];
  return [];
}
export function tracePath(
  model: ModelId,
  id: string,
  t: number,
  relativeToEarth = false,
): Vec3[] {
  return Array.from({ length: 201 }, (_, i) => {
    const bodies = getBodies(model, t - 850 + (i / 200) * 850);
    const body = bodies.find((b) => b.id === id) ?? bodies[1];
    return relativeToEarth
      ? subtract(body.position, bodies.find((b) => b.id === "earth")!.position)
      : body.position;
  });
}
/** Unwrap longitude to preserve genuine retrograde slopes at the ±π boundary. */
export function apparentLongitudes(
  model: ModelId,
  id: string,
  t: number,
): number[] {
  const result: number[] = [];
  let previous = 0;
  for (let i = 0; i <= 120; i++) {
    const bodies = getBodies(model, t - 430 + (i / 120) * 860);
    const body =
      bodies.find((b) => b.id === id) ?? bodies.find((b) => b.id === "sun")!;
    const vector = subtract(
      body.position,
      bodies.find((b) => b.id === "earth")!.position,
    );
    let angle = Math.atan2(vector[2], vector[0]);
    if (i > 0) {
      while (angle - previous > Math.PI) angle -= TAU;
      while (angle - previous < -Math.PI) angle += TAU;
    }
    result.push(angle);
    previous = angle;
  }
  return result;
}
