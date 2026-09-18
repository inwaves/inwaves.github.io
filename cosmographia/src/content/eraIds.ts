/** Identifiers of the eras, in chronological order. */
export const ERA_IDS = [
  'anaximander',
  'philolaus',
  'eudoxus',
  'aristotle',
  'aristarchus',
  'hipparchus',
  'ptolemy',
  'medieval',
  'copernicus',
  'tycho',
  'galileo',
  'kepler',
  'newton',
] as const;

export type EraId = (typeof ERA_IDS)[number];
