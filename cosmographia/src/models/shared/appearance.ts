import type { BodyAppearance } from '../types';

/** Consistent colours for the classical bodies across eras. */
export const BODY_COLORS = {
  sun: '#ffd27a',
  moon: '#dcd6c8',
  mercury: '#c2b4a3',
  venus: '#f6e7bd',
  mars: '#e2673c',
  jupiter: '#e9c9a0',
  saturn: '#e9d596',
  earth: '#7fb0e0',
  fire: '#ff7a2e',
  counterEarth: '#6f5b86',
  satellite: '#d9d3c7',
  comet: '#bfe6ff',
} as const;

export const PLANET_NAMES = {
  mercury: 'Mercury',
  venus: 'Venus',
  mars: 'Mars',
  jupiter: 'Jupiter',
  saturn: 'Saturn',
} as const;

/** Greek and Latin names historians use for the wanderers. */
export const PLANET_EPITHETS = {
  mercury: 'Hermes, the Twinkler (Stilbon)',
  venus: 'Aphrodite, the Light-bringer (Phosphoros)',
  mars: 'Ares, the Fiery (Pyroeis)',
  jupiter: 'Zeus, the Radiant (Phaethon)',
  saturn: 'Kronos, the Shiner (Phainon)',
} as const;

export function sunAppearance(radius: number): BodyAppearance {
  return { color: BODY_COLORS.sun, radius, surface: 'sun', emissive: true, glow: '#ffcf70' };
}

export function moonAppearance(radius: number): BodyAppearance {
  return { color: BODY_COLORS.moon, radius, surface: 'moon', phases: true };
}

export function earthAppearance(radius: number): BodyAppearance {
  return { color: BODY_COLORS.earth, radius, surface: 'earth' };
}

export function planetAppearance(id: keyof typeof PLANET_NAMES, radius: number, rings?: 'rings' | 'ears'): BodyAppearance {
  return {
    color: BODY_COLORS[id],
    radius,
    surface: id,
    phases: true,
    glow: BODY_COLORS[id],
    rings: id === 'saturn' ? rings : undefined,
  };
}
