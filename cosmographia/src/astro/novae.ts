import { calendarToJd } from './time';

/**
 * The two naked-eye supernovae of the Scientific Revolution. Both appeared among the fixed stars
 * and showed no parallax, contradicting the Aristotelian doctrine that the heavens never change.
 */
export interface Nova {
  id: string;
  name: string;
  /** J2000 right ascension and declination, degrees */
  ra: number;
  dec: number;
  peakJd: number;
  peakMagnitude: number;
  /** days to rise from invisibility to peak */
  riseDays: number;
  /** days from peak until it fell below naked-eye visibility (mag 6) */
  fadeDays: number;
  note: string;
}

export const NOVAE: readonly Nova[] = [
  {
    id: 'sn1572',
    name: "Tycho's New Star (SN 1572)",
    ra: 6.3337,
    dec: 64.1428,
    peakJd: calendarToJd(1572, 11, 16, false),
    peakMagnitude: -4.0,
    riseDays: 8,
    fadeDays: 480,
    note: 'Tycho first saw it on 11 November 1572 in Cassiopeia and measured no parallax at all: it lay among the fixed stars.',
  },
  {
    id: 'sn1604',
    name: "Kepler's Star (SN 1604)",
    ra: 262.675,
    dec: -21.4867,
    peakJd: calendarToJd(1604, 10, 28, true),
    peakMagnitude: -2.5,
    riseDays: 12,
    fadeDays: 520,
    note: 'Appeared in October 1604 near the conjunction of Mars, Jupiter and Saturn in Ophiuchus; Kepler studied it in De Stella Nova (1606).',
  },
];

/** Visual magnitude of a nova at a TT Julian Date, or null when invisible to the naked eye. */
export function novaMagnitude(nova: Nova, jd: number): number | null {
  const dt = jd - nova.peakJd;
  let mag: number;
  if (dt < -nova.riseDays) return null;
  if (dt < 0) mag = nova.peakMagnitude + (-dt / nova.riseDays) * (6.5 - nova.peakMagnitude);
  else mag = nova.peakMagnitude + (dt / nova.fadeDays) * (6 - nova.peakMagnitude);
  return mag > 6 ? null : mag;
}
