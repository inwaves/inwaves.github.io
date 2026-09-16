import type { EraId } from './eraIds';

/** Narrative that accompanies each worldview. */
export interface EraContent {
  /** one-sentence essence */
  headline: string;
  overview: string[];
  mechanism: { title: string; text: string }[];
  explained: string[];
  problems: string[];
  /** where this appears in Kuhn's The Copernican Revolution */
  kuhn: string;
  sources: string[];
  /** parameters and simplifications of this simulation */
  modelNotes: string[];
  tryThis: string[];
}

export type ContentRegistry = Partial<Record<EraId, EraContent>>;
