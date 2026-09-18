import type { EraId } from '../content/eraIds';
import type { ModelDefinition } from './types';
import type { Layers } from '../render/types';

export type { EraId };

export interface LocalDate {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
}

export interface EraLocation {
  name: string;
  /** degrees north */
  lat: number;
  /** degrees east */
  lon: number;
  /** first Gregorian JD in civil use at this place */
  reformJd: number;
}

/** A notable moment an era can jump to (an observation, a nova, a comet). */
export interface EraEvent {
  id: string;
  label: string;
  date: LocalDate;
  /** optional different place for the event */
  location?: EraLocation;
  description: string;
  view?: 'sky' | 'cosmos';
  /** body to select or look toward */
  focus?: string;
  /** days per second */
  speed?: number;
}

export interface EraOptionChoice {
  value: string;
  label: string;
}

export interface EraOption {
  id: string;
  label: string;
  description: string;
  choices: EraOptionChoice[];
  default: string;
}

export type EraOptionValues = Record<string, string>;

export type ConstellationSet = 'ptolemaic' | 'bayer' | 'hevelius';

export interface EraDefaults {
  /** simulation speed in days per real second */
  speed: number;
  view: 'cosmos' | 'sky';
  /** rotate the heavens so the Earth stays still (geocentric eras) */
  diurnalLock: boolean;
  /** body selected on arrival */
  focus?: string;
  /** Sky view look direction on arrival */
  skyTarget?: string;
  skyMode?: 'horizon' | 'ecliptic';
  /** layer settings applied on arrival (others keep the user's choice) */
  layers?: Partial<Layers>;
}

export interface EraDefinition {
  id: EraId;
  /** "Claudius Ptolemy" */
  figure: string;
  /** "The Almagest" */
  title: string;
  /** "c. 150 CE" */
  dates: string;
  /** Position on the timeline (astronomical year). */
  timelineYear: number;
  /** Discoveries up to this year exist in the worldview (moons, rings, stars). */
  knowledgeYear: number;
  location: EraLocation;
  /** Local mean time at `location`, in the civil calendar used there. */
  epoch: LocalDate;
  defaults: EraDefaults;
  constellations: ConstellationSet;
  options: EraOption[];
  events: EraEvent[];
  build(options: EraOptionValues): ModelDefinition;
}

/** Resolve option values, falling back to each option's default. */
export function resolveOptions(era: EraDefinition, values: EraOptionValues | undefined): EraOptionValues {
  const out: EraOptionValues = {};
  for (const opt of era.options) {
    const v = values?.[opt.id];
    out[opt.id] = v !== undefined && opt.choices.some((c) => c.value === v) ? v : opt.default;
  }
  return out;
}
