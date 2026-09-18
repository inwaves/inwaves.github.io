import { describe, expect, it } from 'vitest';
import { Quaternion, Vector3 } from 'three';
import { Mechanism, timeContext } from './mechanism';
import type { ModelDefinition } from './types';

function toyModel(): ModelDefinition {
  return {
    nodes: [
      { id: 'root', parent: null },
      {
        id: 'arm',
        parent: 'root',
        displayScale: 0.5,
        update: (_t, pos, rot) => {
          pos.set(10, 0, 0);
          rot.setFromAxisAngle(new Vector3(0, 0, 1), Math.PI / 2);
        },
      },
      {
        id: 'tip',
        parent: 'arm',
        update: (t, pos) => {
          pos.set(2 + (t.jd - 2451545), 0, 0);
        },
      },
    ],
    bodies: [{ id: 'tip', name: 'Tip', kind: 'planet', node: 'tip', appearance: { color: '#fff', radius: 1, surface: 'plain' }, role: '' }],
    observerNode: 'root',
    earthBody: 'tip',
    diurnal: 'heavens',
    stars: { displayRadius: 10, mode: 'sphere', label: '' },
    centerNode: 'root',
    cameraDistance: 10,
    unitLabel: '',
  };
}

describe('Mechanism', () => {
  it('composes true transforms through rotations', () => {
    const m = new Mechanism(toyModel());
    m.evaluate(timeContext(2451545));
    const tip = m.node('tip');
    expect(tip.worldPos.x).toBeCloseTo(10, 9);
    expect(tip.worldPos.y).toBeCloseTo(2, 9);
    expect(tip.worldRot.equals(new Quaternion().setFromAxisAngle(new Vector3(0, 0, 1), Math.PI / 2))).toBe(true);
  });

  it('applies display scale to descendants only', () => {
    const m = new Mechanism(toyModel());
    m.evaluate(timeContext(2451545));
    const tip = m.node('tip');
    // arm sits at 10 (root scale 1); tip offset 2 is halved by arm's display scale
    expect(tip.displayPos.x).toBeCloseTo(10, 9);
    expect(tip.displayPos.y).toBeCloseTo(1, 9);
  });

  it('samples other instants consistently with evaluate()', () => {
    const m = new Mechanism(toyModel());
    const t1 = timeContext(2451548);
    m.evaluate(timeContext(2451545));
    const sampledTrue = m.sample('tip', t1, 'true', new Vector3());
    const sampledDisplay = m.sample('tip', t1, 'display', new Vector3());
    m.evaluate(t1);
    expect(sampledTrue.distanceTo(m.node('tip').worldPos)).toBeLessThan(1e-9);
    expect(sampledDisplay.distanceTo(m.node('tip').displayPos)).toBeLessThan(1e-9);
  });

  it('rejects unknown parents and duplicate ids', () => {
    const bad = toyModel();
    bad.nodes.push({ id: 'orphan', parent: 'nowhere' });
    expect(() => new Mechanism(bad)).toThrow(/unknown parent/);
    const dup = toyModel();
    dup.nodes.push({ id: 'arm', parent: 'root' });
    expect(() => new Mechanism(dup)).toThrow(/Duplicate/);
  });
});
