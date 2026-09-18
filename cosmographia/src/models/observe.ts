import { Vector3 } from 'three';
import { Mechanism, timeContext } from './mechanism';
import type { ModelDefinition } from './types';
import { lonLatOf } from '../astro/math';

/** Geocentric longitude/latitude (degrees) of a model body as seen from the model's observer. */
export function modelGeocentric(mechanism: Mechanism, bodyId: string): { lon: number; lat: number; r: number } {
  const body = mechanism.model.bodies.find((b) => b.id === bodyId);
  if (!body) throw new Error(`No body "${bodyId}"`);
  const v = new Vector3().copy(mechanism.node(body.node).worldPos).sub(mechanism.node(mechanism.model.observerNode).worldPos);
  return lonLatOf(v);
}

/** Evaluate a model at a TT Julian Date and return geocentric longitudes of every body with a truth id. */
export function evaluateLongitudes(model: ModelDefinition, jdTT: number): Record<string, { lon: number; lat: number; r: number }> {
  const m = new Mechanism(model);
  m.evaluate(timeContext(jdTT));
  const out: Record<string, { lon: number; lat: number; r: number }> = {};
  for (const b of model.bodies) {
    if (b.truth) out[b.id] = modelGeocentric(m, b.id);
  }
  return out;
}
