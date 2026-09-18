import type { Quaternion, Vector3 } from 'three';
import type { TruthBodyId } from '../astro/ephemeris';
import type { SatelliteId } from '../astro/ephemeris/satellites';
import type { CometId } from '../astro/ephemeris/comets';

/** Instant at which a model is evaluated. */
export interface TimeContext {
  /** Terrestrial Time Julian Date */
  jd: number;
  /** Universal Time Julian Date (historical day-based mean motions use this) */
  ut: number;
  /** Julian centuries (TT) since J2000 */
  T: number;
}

export type Layer = 'spheres' | 'mechanism' | 'orbits';

/** Visual families; the renderer maps each to a material. */
export type ConstructStyle =
  | 'crystal'
  | 'crystal-strong'
  | 'counter'
  | 'stars'
  | 'element-earth'
  | 'element-water'
  | 'element-air'
  | 'element-fire'
  | 'primum'
  | 'empyrean'
  | 'deferent'
  | 'epicycle'
  | 'epicyclet'
  | 'orbit'
  | 'orbit-faint'
  | 'guide'
  | 'fire-ring'
  | 'mist'
  | 'solid'
  | 'axis'
  | 'accent';

interface ConstructBase {
  layer: Layer;
  style: ConstructStyle;
  label?: string;
  /** Only drawn when the named body is selected (or nothing is selected). */
  focusBody?: string;
}

export type ConstructDef =
  | (ConstructBase & {
      kind: 'sphere';
      radius: number;
      /** Draw only one hemisphere so inner shells are visible. */
      cutaway?: boolean;
      /** Latitude/longitude guide lines. */
      graticule?: boolean;
      opacity?: number;
    })
  | (ConstructBase & { kind: 'circle'; radius: number; dashed?: boolean })
  | (ConstructBase & {
      kind: 'ellipse';
      /** semi-major axis */
      a: number;
      e: number;
    })
  | (ConstructBase & { kind: 'torus'; radius: number; tube: number })
  | (ConstructBase & { kind: 'drum'; radius: number; height: number })
  | (ConstructBase & { kind: 'axis'; length: number; direction?: [number, number, number] })
  | (ConstructBase & { kind: 'marker'; shape: 'cross' | 'dot' | 'ring'; size: number })
  | (ConstructBase & {
      kind: 'polyhedron';
      solid: 'tetrahedron' | 'cube' | 'octahedron' | 'dodecahedron' | 'icosahedron';
      circumradius: number;
    });

/** A straight segment between two nodes, recomputed each frame. */
export interface LinkDef {
  from: string;
  to: string;
  layer: Layer;
  style: ConstructStyle;
  dashed?: boolean;
  focusBody?: string;
}

/** Kepler's area-law wedges: equal-time sectors swept by `body` about `center`. */
export interface SectorDef {
  center: string;
  body: string;
  periodDays: number;
  count: number;
  layer: Layer;
}

export interface NodeDef {
  id: string;
  parent: string | null;
  /** Writes the local transform (position in parent units, rotation relative to parent). */
  update?: (t: TimeContext, pos: Vector3, rot: Quaternion) => void;
  /** Multiplies the display size of this node's subtree (positions of children and constructs). */
  displayScale?: number;
  constructs?: ConstructDef[];
}

export type BodyKind = 'earth' | 'sun' | 'moon' | 'planet' | 'satellite' | 'comet' | 'fire' | 'counter-earth' | 'nova';

export type SurfaceStyle =
  | 'earth'
  | 'drum'
  | 'moon'
  | 'sun'
  | 'fire'
  | 'mercury'
  | 'venus'
  | 'mars'
  | 'jupiter'
  | 'saturn'
  | 'satellite'
  | 'counter-earth'
  | 'plain';

export interface BodyAppearance {
  color: string;
  /** Display radius at scale 1 (display units). */
  radius: number;
  surface: SurfaceStyle;
  emissive?: boolean;
  glow?: string;
  /** Shade by the direction to the model's Sun. */
  phases?: boolean;
  /** 'rings' after Huygens; 'ears' for Galileo's tri-corporeal Saturn. */
  rings?: 'rings' | 'ears';
  /** Anaximander's Earth is a drum, not a sphere. */
  shape?: 'sphere' | 'drum';
}

export interface BodyDef {
  id: string;
  name: string;
  kind: BodyKind;
  node: string;
  appearance: BodyAppearance;
  /** Modern-ephemeris body for the "real sky" comparison. */
  truth?: TruthBodyId;
  satellite?: SatelliteId;
  comet?: CometId;
  /** Drawn in the Sky view. Defaults to true for all bodies except the observer's Earth. */
  inSky?: boolean;
  /** Visible only between these Julian Dates (comets). */
  visibleFrom?: number;
  visibleTo?: number;
  /** Length of the default trail, days. */
  trailDays?: number;
  /** One-line description of how this body moves in this worldview. */
  role: string;
}

export interface StarSphereSpec {
  /** Display radius of the sphere of fixed stars. */
  displayRadius: number;
  /** 'sphere': stars on a finite shell; 'infinite': scattered through space; 'mist': Anaximander's star wheel. */
  mode: 'sphere' | 'infinite' | 'mist';
  label: string;
}

export interface ModelDefinition {
  nodes: NodeDef[];
  bodies: BodyDef[];
  links?: LinkDef[];
  sectors?: SectorDef[];
  /** Node at the observer (the Earth's centre). */
  observerNode: string;
  /** Body id of the Earth (spins daily). */
  earthBody: string;
  /** Node of the model's Sun (for lighting and phases). */
  sunNode?: string;
  /** What carries the daily motion in this worldview. */
  diurnal: 'heavens' | 'earth' | 'orbit';
  stars: StarSphereSpec;
  /** Default camera target node and distance. */
  centerNode: string;
  cameraDistance: number;
  /** Human description of the units used by the true geometry. */
  unitLabel: string;
  /** Cosmos view "up": the ecliptic pole (default) or the observer's zenith (Anaximander's drum). */
  cosmosUp?: 'ecliptic' | 'zenith';
}
