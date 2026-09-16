import { describe, expect, it } from "vitest";
import { eras, getEra, hasJovianMoons } from "./history";
import {
  apparentLongitudes,
  ellipsePosition,
  equantCenter,
  getBodies,
  getPaths,
  homocentricPosition,
  length,
  planets,
  solveKepler,
  subtract,
  TAU,
} from "./model";

describe("historical knowledge boundaries", () => {
  it("orders chapters chronologically and resolves invalid URLs safely", () => {
    expect(eras.map((e) => e.year)).toEqual(
      eras.map((e) => e.year).sort((a, b) => a - b),
    );
    expect(getEra("not-a-model").id).toBe("ptolemy");
  });
  it.each(eras)("$name only contains objects allowed by the chapter", (era) => {
    const bodies = getBodies(era.id, 20),
      ids = bodies.map((b) => b.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).not.toContain("uranus");
    expect(ids).not.toContain("neptune");
    expect(ids.includes("io")).toBe(hasJovianMoons(era.id));
    expect(bodies.filter((b) => b.parent === "jupiter")).toHaveLength(
      era.year >= 1610 ? 4 : 0,
    );
    if (era.id === "hipparchus") expect(ids.sort()).toEqual(["earth", "sun"]);
    if (era.id === "anaximander")
      expect(ids.sort()).toEqual(["earth", "moon", "sun"]);
  });
  it("keeps the 1609 laws separate from the 1610 observations", () => {
    expect(getBodies("kepler", 0)).toHaveLength(8);
    expect(getBodies("galileo", 0)).toHaveLength(12);
    expect(getBodies("harmony", 0)).toHaveLength(12);
  });
});
describe("orbital geometry", () => {
  it.each(eras)(
    "$name produces finite bodies and paths across large and negative times",
    (era) => {
      for (const t of [-100000, -1, 0, 250, 100000]) {
        for (const body of getBodies(era.id, t))
          expect(body.position.every(Number.isFinite)).toBe(true);
        for (const path of getPaths(era.id, t)) {
          expect(
            path.points.every((point) => point.every(Number.isFinite)),
          ).toBe(true);
          expect(
            length(subtract(path.points[0], path.points.at(-1)!)),
          ).toBeLessThan(1e-8);
        }
      }
    },
  );
  it("keeps Earth fixed in geostatic models", () => {
    for (const id of [
      "anaximander",
      "hipparchus",
      "ptolemy",
      "eudoxus",
      "aristotle",
      "tycho",
    ] as const) {
      expect(
        getBodies(id, 999).find((b) => b.id === "earth")!.position,
      ).toEqual([0, 0, 0]);
    }
  });
  it("makes Earth move in heliocentric models", () => {
    for (const id of ["copernicus", "kepler", "galileo", "harmony"] as const) {
      const position = (t: number) =>
        getBodies(id, t).find((b) => b.id === "earth")!.position;
      expect(length(subtract(position(0), position(180)))).toBeGreaterThan(20);
    }
  });
  it("keeps the homocentric planets at a constant distance from Earth", () => {
    for (const p of planets.filter((p) => p.id !== "earth")) {
      const r = length(homocentricPosition(p, 0));
      for (const t of [10, 80, 370, 990])
        expect(length(homocentricPosition(p, t))).toBeCloseTo(r, 10);
    }
  });
  it("moves the Tychonic Sun and the centers of its planetary orbits together", () => {
    for (const t of [0, 60, 200]) {
      const bodies = getBodies("tycho", t),
        sun = bodies.find((b) => b.id === "sun")!;
      expect(length(sun.position)).toBeCloseTo(11.5, 10);
      for (const p of planets.filter((p) => p.id !== "earth"))
        expect(
          length(
            subtract(bodies.find((b) => b.id === p.id)!.position, sun.position),
          ),
        ).toBeCloseTo(p.radius, 10);
    }
  });
  it("keeps Galilean moons attached to Jupiter as it moves", () => {
    for (const id of ["galileo", "harmony"] as const)
      for (const t of [0, 1, 100, 900]) {
        const bodies = getBodies(id, t),
          jupiter = bodies.find((b) => b.id === "jupiter")!;
        const radii = bodies
          .filter((b) => b.parent === "jupiter")
          .map((b) => length(subtract(b.position, jupiter.position)));
        [1.8, 2.5, 3.3, 4.25].forEach((r, i) =>
          expect(radii[i]).toBeCloseTo(r, 10),
        );
      }
  });
  it("puts the epicycle center on a deferent offset from Earth", () => {
    for (const a of [0, 0.2, 1, 2, 4, 6]) {
      const p = equantCenter(16.5, 0.5775, a);
      expect(length(subtract(p, [0.5775, 0, 0]))).toBeCloseTo(16.5, 9);
      const actual = Math.atan2(p[2], p[0] - 1.155);
      expect(Math.cos(actual)).toBeCloseTo(Math.cos(a), 9);
      expect(Math.sin(actual)).toBeCloseTo(Math.sin(a), 9);
    }
  });
  it("actually models epicycles for Copernicus as well as Ptolemy", () => {
    expect(
      getPaths("copernicus", 0).filter((p) => p.kind === "epicycle"),
    ).toHaveLength(6);
    expect(
      getPaths("ptolemy", 0).filter((p) => p.kind === "epicycle"),
    ).toHaveLength(5);
    expect(
      getPaths("kepler", 0).filter((p) => p.kind === "epicycle"),
    ).toHaveLength(0);
  });
});
describe("Keplerian motion", () => {
  it("solves Kepler’s equation across eccentricities and quadrants", () => {
    for (const e of [0, 0.0167, 0.2056, 0.9, 0.9999])
      for (const m of [-Math.PI, -2, -0.001, 0, 0.001, 1, Math.PI]) {
        const anomaly = solveKepler(m, e);
        expect(Math.sin(anomaly - e * Math.sin(anomaly))).toBeCloseTo(
          Math.sin(m),
          10,
        );
        expect(Math.cos(anomaly - e * Math.sin(anomaly))).toBeCloseTo(
          Math.cos(m),
          10,
        );
      }
  });
  it("rejects invalid eccentricities and nonfinite input", () => {
    for (const e of [-1, 1, Infinity, NaN])
      expect(() => solveKepler(0, e)).toThrow(RangeError);
    expect(() => solveKepler(Infinity, 0.2)).toThrow(RangeError);
  });
  it("places the Sun at a focus and accelerates at perihelion", () => {
    const a = 10,
      e = 0.3;
    expect(length(ellipsePosition(a, e, 0))).toBeCloseTo(a * (1 - e));
    expect(length(ellipsePosition(a, e, Math.PI))).toBeCloseTo(a * (1 + e));
    const periSpeed = length(
      subtract(ellipsePosition(a, e, 0.001), ellipsePosition(a, e, 0)),
    );
    const apoSpeed = length(
      subtract(
        ellipsePosition(a, e, Math.PI + 0.001),
        ellipsePosition(a, e, Math.PI),
      ),
    );
    expect(periSpeed).toBeGreaterThan(apoSpeed);
  });
  it("sweeps equal areas for equal mean-anomaly increments", () => {
    const sector = (m: number) => {
      const e = 0.2056,
        e1 = solveKepler(m, e),
        e2 = solveKepler(m + 0.1, e);
      return e2 - e * Math.sin(e2) - (e1 - e * Math.sin(e1));
    };
    for (const m of [-2, -1, 0, 1, 2]) expect(sector(m)).toBeCloseTo(0.1, 10);
  });
  it("closes the orbit after a full period", () =>
    expect(
      length(
        subtract(
          ellipsePosition(5, 0.2, 0.4),
          ellipsePosition(5, 0.2, 0.4 + TAU),
        ),
      ),
    ).toBeLessThan(1e-9));
});
describe("Earth-relative observations", () => {
  it("has both direct and retrograde segments for Mars", () => {
    for (const id of [
      "eudoxus",
      "aristotle",
      "ptolemy",
      "copernicus",
      "tycho",
      "kepler",
    ] as const) {
      const values = apparentLongitudes(id, "mars", 300);
      const changes = values.slice(1).map((v, i) => v - values[i]);
      expect(changes.some((d) => d < 0)).toBe(true);
      expect(changes.some((d) => d > 0)).toBe(true);
      expect(changes.every((d) => Math.abs(d) < Math.PI)).toBe(true);
    }
  });
});
