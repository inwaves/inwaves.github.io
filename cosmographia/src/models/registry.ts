import type { EraDefinition } from './era';
import type { EraId } from '../content/eraIds';
import { anaximander } from './eras/anaximander';
import { philolaus } from './eras/philolaus';
import { eudoxus } from './eras/eudoxus';
import { aristotle } from './eras/aristotle';
import { aristarchus } from './eras/aristarchus';
import { hipparchus } from './eras/hipparchus';
import { ptolemy } from './eras/ptolemy';
import { medieval } from './eras/medieval';
import { copernicus } from './eras/copernicus';
import { tycho } from './eras/tycho';
import { galileo } from './eras/galileo';
import { kepler } from './eras/kepler';
import { newton } from './eras/newton';

/** All eras in chronological order. */
export const ERAS: readonly EraDefinition[] = [
  anaximander,
  philolaus,
  eudoxus,
  aristotle,
  aristarchus,
  hipparchus,
  ptolemy,
  medieval,
  copernicus,
  tycho,
  galileo,
  kepler,
  newton,
];

export const ERA_BY_ID: Partial<Record<EraId, EraDefinition>> = Object.fromEntries(ERAS.map((e) => [e.id, e]));

export function eraIndex(id: EraId): number {
  return ERAS.findIndex((e) => e.id === id);
}

export function getEra(id: EraId): EraDefinition {
  const era = ERA_BY_ID[id];
  if (!era) throw new Error(`Unknown era "${id}"`);
  return era;
}
