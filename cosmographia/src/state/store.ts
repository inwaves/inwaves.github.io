import { create } from 'zustand';
import type { EraId } from '../content/eraIds';
import { ERAS, eraIndex, getEra } from '../models/registry';
import { resolveOptions, type EraEvent, type EraOptionValues } from '../models/era';
import { calendarToJd, localDateToJdTT } from '../astro/time';
import { DEFAULT_LAYERS, type Layers, type SkyMode, type TrailFrame, type ViewMode } from '../render/types';
import type { BodyReadout, ClockReadout } from '../render/readouts';
import type { TelescopeReadout } from '../render/telescope';
import { presetIndex, SPEED_PRESETS } from './speeds';

/** The modern ephemeris is valid 3000 BCE – 3000 CE. */
export const MIN_JD = calendarToJd(-2999, 1, 1, false);
export const MAX_JD = calendarToJd(2999, 12, 31, true);

export interface AppState {
  eraId: EraId;
  options: Partial<Record<EraId, EraOptionValues>>;
  view: ViewMode;
  skyMode: SkyMode;
  layers: Layers;
  diurnalLock: boolean;
  trailFrame: TrailFrame;
  selected: string | null;
  playing: boolean;
  speed: number;
  panelOpen: boolean;
  layersOpen: boolean;
  telescopeOpen: boolean;
  introOpen: boolean;
  /** engine requests: a change of nonce means "do it now" */
  jump: { jd: number; nonce: number };
  look: { body: string | null; nonce: number };
  focus: { body: string | null; nonce: number };
  cameraReset: number;
  /** engine publications */
  clock: ClockReadout | null;
  readout: BodyReadout | null;
  telescope: TelescopeReadout | null;

  setEra(id: EraId): void;
  stepEra(delta: number): void;
  setOption(optionId: string, value: string): void;
  setView(view: ViewMode): void;
  setSkyMode(mode: SkyMode): void;
  toggleLayer(key: keyof Layers): void;
  setDiurnalLock(on: boolean): void;
  setTrailFrame(frame: TrailFrame): void;
  select(id: string | null): void;
  lookAt(id: string | null): void;
  focusOn(id: string | null): void;
  resetCamera(): void;
  togglePlay(): void;
  setSpeed(speed: number): void;
  faster(): void;
  slower(): void;
  reverse(): void;
  jumpTo(jd: number): void;
  resetToEpoch(): void;
  applyEvent(event: EraEvent): void;
  togglePanel(): void;
  toggleLayers(): void;
  toggleTelescope(): void;
  closeIntro(): void;
}

function epochJd(id: EraId): number {
  const era = getEra(id);
  return localDateToJdTT(era.epoch, era.location.lon, era.location.reformJd);
}

const INTRO_KEY = 'cosmographia.introSeen';

function introSeen(): boolean {
  try {
    return typeof localStorage !== 'undefined' && localStorage.getItem(INTRO_KEY) === '1';
  } catch {
    return false;
  }
}

const firstEra = ERAS[0];

/** Deep-link parameters: ?era=ptolemy&view=sky&intro=0&ghosts=1&paused=1 */
function urlParams(): URLSearchParams {
  try {
    return typeof window === 'undefined' ? new URLSearchParams() : new URLSearchParams(window.location.search);
  } catch {
    return new URLSearchParams();
  }
}

const params = urlParams();
const initialEra = ERAS.find((e) => e.id === params.get('era')) ?? firstEra;
const initialView: ViewMode = params.get('view') === 'sky' ? 'sky' : params.get('view') === 'cosmos' ? 'cosmos' : initialEra.defaults.view;

export const useStore = create<AppState>()((set, get) => ({
  eraId: initialEra.id,
  options: {},
  view: initialView,
  skyMode: initialEra.defaults.skyMode ?? 'horizon',
  layers: { ...DEFAULT_LAYERS, ...(initialEra.defaults.layers ?? {}), ghosts: params.get('ghosts') === '1' },
  diurnalLock: initialEra.defaults.diurnalLock,
  trailFrame: 'native',
  selected: initialEra.defaults.focus ?? null,
  playing: params.get('paused') !== '1',
  speed: initialEra.defaults.speed,
  panelOpen: true,
  layersOpen: false,
  telescopeOpen: false,
  introOpen: params.get('intro') === '0' ? false : !introSeen(),
  jump: { jd: epochJd(initialEra.id), nonce: 1 },
  look: { body: initialEra.defaults.skyTarget ?? null, nonce: 1 },
  focus: { body: null, nonce: 0 },
  cameraReset: 0,
  clock: null,
  readout: null,
  telescope: null,

  setEra(id) {
    const era = getEra(id);
    const s = get();
    set({
      eraId: id,
      view: era.defaults.view,
      skyMode: era.defaults.skyMode ?? 'horizon',
      layers: { ...s.layers, ...(era.defaults.layers ?? {}) },
      diurnalLock: era.defaults.diurnalLock,
      trailFrame: 'native',
      selected: era.defaults.focus ?? null,
      speed: era.defaults.speed,
      playing: true,
      jump: { jd: epochJd(id), nonce: s.jump.nonce + 1 },
      look: { body: era.defaults.skyTarget ?? null, nonce: s.look.nonce + 1 },
      focus: { body: null, nonce: s.focus.nonce + 1 },
      cameraReset: s.cameraReset + 1,
      readout: null,
    });
  },
  stepEra(delta) {
    const idx = eraIndex(get().eraId);
    const next = ERAS[Math.max(0, Math.min(ERAS.length - 1, idx + delta))];
    if (next.id !== get().eraId) get().setEra(next.id);
  },
  setOption(optionId, value) {
    const s = get();
    const era = getEra(s.eraId);
    const current = resolveOptions(era, s.options[s.eraId]);
    set({ options: { ...s.options, [s.eraId]: { ...current, [optionId]: value } } });
  },
  setView(view) {
    const s = get();
    set({ view, look: view === 'sky' && s.selected ? { body: s.selected, nonce: s.look.nonce + 1 } : s.look });
  },
  setSkyMode(mode) {
    set({ skyMode: mode });
  },
  toggleLayer(key) {
    const s = get();
    set({ layers: { ...s.layers, [key]: !s.layers[key] } });
  },
  setDiurnalLock(on) {
    set({ diurnalLock: on });
  },
  setTrailFrame(frame) {
    set({ trailFrame: frame });
  },
  select(id) {
    set({ selected: id, readout: id === null ? null : get().readout });
  },
  lookAt(id) {
    set({ look: { body: id, nonce: get().look.nonce + 1 } });
  },
  focusOn(id) {
    set({ focus: { body: id, nonce: get().focus.nonce + 1 } });
  },
  resetCamera() {
    set({ cameraReset: get().cameraReset + 1, focus: { body: null, nonce: get().focus.nonce + 1 } });
  },
  togglePlay() {
    set({ playing: !get().playing });
  },
  setSpeed(speed) {
    set({ speed });
  },
  faster() {
    const s = get();
    const i = Math.min(SPEED_PRESETS.length - 1, presetIndex(s.speed) + 1);
    set({ speed: Math.sign(s.speed || 1) * SPEED_PRESETS[i].value, playing: true });
  },
  slower() {
    const s = get();
    const i = Math.max(0, presetIndex(s.speed) - 1);
    set({ speed: Math.sign(s.speed || 1) * SPEED_PRESETS[i].value, playing: true });
  },
  reverse() {
    set({ speed: -get().speed, playing: true });
  },
  jumpTo(jd) {
    set({ jump: { jd: Math.max(MIN_JD, Math.min(MAX_JD, jd)), nonce: get().jump.nonce + 1 } });
  },
  resetToEpoch() {
    const s = get();
    set({ jump: { jd: epochJd(s.eraId), nonce: s.jump.nonce + 1 } });
  },
  applyEvent(event) {
    const s = get();
    const era = getEra(s.eraId);
    const loc = event.location ?? era.location;
    const jd = localDateToJdTT(event.date, loc.lon, loc.reformJd);
    set({
      jump: { jd, nonce: s.jump.nonce + 1 },
      view: event.view ?? s.view,
      selected: event.focus ?? s.selected,
      look: { body: event.focus ?? null, nonce: s.look.nonce + 1 },
      speed: event.speed ?? s.speed,
      playing: true,
    });
  },
  togglePanel() {
    set({ panelOpen: !get().panelOpen });
  },
  toggleLayers() {
    set({ layersOpen: !get().layersOpen });
  },
  toggleTelescope() {
    set({ telescopeOpen: !get().telescopeOpen });
  },
  closeIntro() {
    try {
      localStorage.setItem(INTRO_KEY, '1');
    } catch {
      // Private browsing: the intro simply shows again next time.
    }
    set({ introOpen: false });
  },
}));
