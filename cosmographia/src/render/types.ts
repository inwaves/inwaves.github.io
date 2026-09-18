import type { EraDefinition } from '../models/era';
import type { Mechanism } from '../models/mechanism';
import type { TimeContext } from '../models/types';

export type ViewMode = 'cosmos' | 'sky';
export type SkyMode = 'horizon' | 'ecliptic';
export type TrailFrame = 'native' | 'earth';

export interface Layers {
  spheres: boolean;
  mechanism: boolean;
  orbits: boolean;
  labels: boolean;
  trails: boolean;
  constellations: boolean;
  grid: boolean;
  ghosts: boolean;
  atmosphere: boolean;
}

export const DEFAULT_LAYERS: Layers = {
  spheres: true,
  mechanism: true,
  orbits: true,
  labels: true,
  trails: true,
  constellations: true,
  grid: true,
  ghosts: false,
  atmosphere: true,
};

/** Everything a view needs to draw one frame. */
export interface FrameContext {
  t: TimeContext;
  mechanism: Mechanism;
  era: EraDefinition;
  layers: Layers;
  selected: string | null;
  diurnalLock: boolean;
  trailFrame: TrailFrame;
  skyMode: SkyMode;
  width: number;
  height: number;
  pixelRatio: number;
  /** real seconds since the previous frame */
  dt: number;
  /** simulation days per real second */
  speed: number;
}
