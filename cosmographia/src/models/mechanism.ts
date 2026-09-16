import { Quaternion, Vector3 } from 'three';
import type { ModelDefinition, NodeDef, TimeContext } from './types';
import { centuriesSinceJ2000, ttToUt } from '../astro/time';

/**
 * Runtime evaluation of a model's node tree.
 *
 * Every node has a *true* world transform (the geometry the worldview asserts, in model units)
 * and a *display* world position, in which each node's `displayScale` multiplies its subtree.
 * Uniform scaling of a subtree about a geocentric origin preserves every direction seen from
 * that origin, so layouts can be schematic without falsifying the Sky view.
 */

export interface RuntimeNode {
  def: NodeDef;
  parent: RuntimeNode | null;
  localPos: Vector3;
  localRot: Quaternion;
  worldPos: Vector3;
  worldRot: Quaternion;
  displayPos: Vector3;
  /** Scale applied to children's local positions and to this node's constructs in display space. */
  childScale: number;
}

export function timeContext(jdTT: number): TimeContext {
  return { jd: jdTT, ut: ttToUt(jdTT), T: centuriesSinceJ2000(jdTT) };
}

export class Mechanism {
  readonly nodes: RuntimeNode[] = [];
  private readonly byId = new Map<string, RuntimeNode>();
  private readonly scratchPos = new Vector3();
  private readonly scratchRot = new Quaternion();
  private readonly chain: RuntimeNode[] = [];

  constructor(readonly model: ModelDefinition) {
    const defs = new Map<string, NodeDef>();
    for (const def of model.nodes) {
      if (defs.has(def.id)) throw new Error(`Duplicate mechanism node id "${def.id}"`);
      defs.set(def.id, def);
    }
    const visiting = new Set<string>();
    const visit = (def: NodeDef): RuntimeNode => {
      const existing = this.byId.get(def.id);
      if (existing) return existing;
      if (visiting.has(def.id)) throw new Error(`Cycle in mechanism at node "${def.id}"`);
      visiting.add(def.id);
      let parent: RuntimeNode | null = null;
      if (def.parent !== null) {
        const parentDef = defs.get(def.parent);
        if (!parentDef) throw new Error(`Node "${def.id}" has unknown parent "${def.parent}"`);
        parent = visit(parentDef);
      }
      const node: RuntimeNode = {
        def,
        parent,
        localPos: new Vector3(),
        localRot: new Quaternion(),
        worldPos: new Vector3(),
        worldRot: new Quaternion(),
        displayPos: new Vector3(),
        childScale: (parent ? parent.childScale : 1) * (def.displayScale ?? 1),
      };
      visiting.delete(def.id);
      this.byId.set(def.id, node);
      this.nodes.push(node);
      return node;
    };
    for (const def of model.nodes) visit(def);
    for (const body of model.bodies) {
      if (!this.byId.has(body.node)) throw new Error(`Body "${body.id}" references unknown node "${body.node}"`);
    }
    for (const id of [model.observerNode, model.centerNode, model.sunNode]) {
      if (id && !this.byId.has(id)) throw new Error(`Model references unknown node "${id}"`);
    }
  }

  has(id: string): boolean {
    return this.byId.has(id);
  }

  node(id: string): RuntimeNode {
    const n = this.byId.get(id);
    if (!n) throw new Error(`Unknown mechanism node "${id}"`);
    return n;
  }

  /** Evaluate every node at time `t` (nodes are stored parents-first). */
  evaluate(t: TimeContext): void {
    for (const n of this.nodes) {
      n.localPos.set(0, 0, 0);
      n.localRot.identity();
      n.def.update?.(t, n.localPos, n.localRot);
      const p = n.parent;
      if (p) {
        n.worldRot.copy(p.worldRot).multiply(n.localRot);
        this.scratchPos.copy(n.localPos).applyQuaternion(p.worldRot);
        n.worldPos.copy(p.worldPos).add(this.scratchPos);
        n.displayPos.copy(p.displayPos).addScaledVector(this.scratchPos, p.childScale);
      } else {
        n.worldRot.copy(n.localRot);
        n.worldPos.copy(n.localPos);
        n.displayPos.copy(n.localPos).multiplyScalar(n.childScale / (n.def.displayScale ?? 1));
      }
    }
  }

  /**
   * Position of one node at another instant without disturbing the evaluated state
   * (used for trails). Only the node's ancestors are recomputed.
   */
  sample(id: string, t: TimeContext, mode: 'true' | 'display', out: Vector3): Vector3 {
    const chain = this.chain;
    chain.length = 0;
    for (let n: RuntimeNode | null = this.node(id); n; n = n.parent) chain.push(n);
    const pos = out.set(0, 0, 0);
    const rot = this.scratchRot.identity();
    const local = this.scratchPos;
    const localRot = new Quaternion();
    for (let i = chain.length - 1; i >= 0; i--) {
      const n = chain[i];
      local.set(0, 0, 0);
      localRot.identity();
      n.def.update?.(t, local, localRot);
      local.applyQuaternion(rot);
      const scale = mode === 'true' ? 1 : n.parent ? n.parent.childScale : n.childScale / (n.def.displayScale ?? 1);
      pos.addScaledVector(local, scale);
      rot.multiply(localRot);
    }
    return pos;
  }
}

/** Cache a derived quantity per evaluation instant, shared by several node updates. */
export function memoByTime<T>(compute: (t: TimeContext) => T): (t: TimeContext) => T {
  let lastJd = Number.NaN;
  let last: T;
  return (t) => {
    if (t.jd !== lastJd) {
      last = compute(t);
      lastJd = t.jd;
    }
    return last;
  };
}
