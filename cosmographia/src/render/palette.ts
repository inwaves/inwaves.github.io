import type { ConstructStyle } from '../models/types';

/** Visual parameters for line-like constructs. Widths are CSS pixels. */
export interface LineStyle {
  color: string;
  width: number;
  opacity: number;
  dashed?: boolean;
}

/** Visual parameters for spherical shells. */
export interface ShellStyle {
  color: string;
  opacity: number;
  rimPower: number;
  graticule?: number;
}

export const LINE_STYLES: Record<ConstructStyle, LineStyle> = {
  deferent: { color: '#d8b36a', width: 1.7, opacity: 0.8 },
  epicycle: { color: '#86cde0', width: 1.7, opacity: 0.9 },
  epicyclet: { color: '#b89ae0', width: 1.4, opacity: 0.85 },
  orbit: { color: '#a9bcd8', width: 1.4, opacity: 0.55 },
  'orbit-faint': { color: '#72839b', width: 1.0, opacity: 0.35 },
  guide: { color: '#cfc6b0', width: 1.0, opacity: 0.45, dashed: true },
  accent: { color: '#ff9f6e', width: 1.8, opacity: 0.95 },
  axis: { color: '#e9dcae', width: 1.2, opacity: 0.4 },
  solid: { color: '#e9c97c', width: 1.5, opacity: 0.85 },
  'fire-ring': { color: '#ff8a3d', width: 2.0, opacity: 0.9 },
  mist: { color: '#8f959c', width: 1.2, opacity: 0.5 },
  crystal: { color: '#9ec9ff', width: 1.0, opacity: 0.35 },
  'crystal-strong': { color: '#b8dcff', width: 1.2, opacity: 0.5 },
  counter: { color: '#c29ae0', width: 1.0, opacity: 0.4 },
  stars: { color: '#6d86c4', width: 1.0, opacity: 0.35 },
  'element-earth': { color: '#8a6a45', width: 1.0, opacity: 0.5 },
  'element-water': { color: '#4f8fd6', width: 1.0, opacity: 0.5 },
  'element-air': { color: '#c6ecff', width: 1.0, opacity: 0.4 },
  'element-fire': { color: '#ff8a4a', width: 1.0, opacity: 0.5 },
  primum: { color: '#f2dc98', width: 1.0, opacity: 0.45 },
  empyrean: { color: '#fff1cc', width: 1.0, opacity: 0.45 },
};

export const SHELL_STYLES: Partial<Record<ConstructStyle, ShellStyle>> = {
  crystal: { color: '#9ec9ff', opacity: 0.035, rimPower: 2.8, graticule: 0.06 },
  'crystal-strong': { color: '#b8dcff', opacity: 0.07, rimPower: 2.4, graticule: 0.09 },
  counter: { color: '#c29ae0', opacity: 0.03, rimPower: 3.0 },
  stars: { color: '#4a64a8', opacity: 0.06, rimPower: 2.8, graticule: 0.09 },
  'element-earth': { color: '#8a6a45', opacity: 0.5, rimPower: 1.2 },
  'element-water': { color: '#3f7fd0', opacity: 0.16, rimPower: 1.6 },
  'element-air': { color: '#c6ecff', opacity: 0.05, rimPower: 2.0 },
  'element-fire': { color: '#ff7a3a', opacity: 0.08, rimPower: 1.8 },
  primum: { color: '#f0d890', opacity: 0.06, rimPower: 2.6, graticule: 0.06 },
  empyrean: { color: '#fff3d0', opacity: 0.07, rimPower: 1.4 },
  mist: { color: '#9aa0a8', opacity: 0.08, rimPower: 1.6 },
  'fire-ring': { color: '#ff7a2e', opacity: 0.4, rimPower: 1.2 },
};

export const UI_COLORS = {
  ghost: '#7cf0c6',
  ghostLine: '#7cf0c6',
  label: '#efe6d2',
  ecliptic: '#d8b36a',
  equator: '#6fa0d8',
  horizonGrid: '#6b7f96',
  constellation: '#7d93c2',
  trail: '#f1e0b8',
} as const;
