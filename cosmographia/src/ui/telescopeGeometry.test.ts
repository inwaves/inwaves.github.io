import { describe, expect, it } from 'vitest';
import { positionAngleRotation, ringHalves, ringRotation, satelliteScreen } from './telescopeGeometry';

describe('telescope geometry', () => {
  it('hides a satellite only when it is behind the planet disc in true radii', () => {
    expect(satelliteScreen({ east: 0.5, north: 0.1, behind: true }, 4, 130).hidden).toBe(true);
    // Compressed on screen to within the exaggerated disc, but really three radii out: visible.
    expect(satelliteScreen({ east: 3, north: 0, behind: true }, 4, 130).hidden).toBe(false);
    expect(satelliteScreen({ east: 0.5, north: 0, behind: false }, 4, 130).hidden).toBe(false);
  });

  it('draws east to the left and north up, clamped inside the view', () => {
    const east = satelliteScreen({ east: 10, north: 0, behind: false }, 4, 130);
    expect(east.x).toBe(-40);
    const north = satelliteScreen({ east: 0, north: 5, behind: false }, 4, 130);
    expect(north.y).toBe(-20);
    expect(satelliteScreen({ east: -100, north: 0, behind: false }, 4, 130).x).toBe(122);
  });

  it('rotates the lit limb toward the Sun’s position angle', () => {
    // Sun to the west (PA 270): lit side on the right, no rotation.
    expect(positionAngleRotation(270)).toBeCloseTo(0, 9);
    // Sun to the east (PA 90): lit side on the left.
    expect(positionAngleRotation(90)).toBeCloseTo(Math.PI, 9);
    // Sun to the north (PA 0): lit side up (canvas -y, angle 3π/2).
    expect(positionAngleRotation(0)).toBeCloseTo((3 * Math.PI) / 2, 9);
  });

  it('lays the ring’s major axis along its position angle', () => {
    const majorAxisOnScreen = (pa: number) => {
      const r = ringRotation(pa);
      return [Math.cos(r), Math.sin(r)];
    };
    // PA 90 (east–west) lies along screen x; PA 0 (north–south) along screen y.
    expect(Math.abs(majorAxisOnScreen(90)[0])).toBeCloseTo(1, 9);
    expect(Math.abs(majorAxisOnScreen(0)[1])).toBeCloseTo(1, 9);
  });

  it('puts the near half of the ring on the side of the projected pole, for poles on both sides of north', () => {
    const a = 2;
    const b = 1;
    for (const polePa of [-120, -60, -10, 0, 30, 45, 120, 200, 300]) {
      const rotation = ringRotation(polePa + 90);
      const poleOnScreen = [-Math.sin((polePa * Math.PI) / 180), -Math.cos((polePa * Math.PI) / 180)];
      for (const tiltSign of [1, -1]) {
        const { front, back } = ringHalves(tiltSign);
        const mid = (range: [number, number]) => {
          const t = (range[0] + range[1]) / 2;
          const x = a * Math.cos(t);
          const y = b * Math.sin(t);
          return [x * Math.cos(rotation) - y * Math.sin(rotation), x * Math.sin(rotation) + y * Math.cos(rotation)];
        };
        const f = mid(front);
        const k = mid(back);
        const along = (v: number[]) => (v[0] * poleOnScreen[0] + v[1] * poleOnScreen[1]) * tiltSign;
        expect(along(f), `pole PA ${polePa}, tilt ${tiltSign}`).toBeGreaterThan(0.5);
        expect(along(k), `pole PA ${polePa}, tilt ${tiltSign}`).toBeLessThan(-0.5);
      }
    }
  });
});
