import { describe, expect, it } from 'vitest';
import { Mechanism, timeContext } from '../models/mechanism';
import { resolveOptions } from '../models/era';
import { getEra } from '../models/registry';
import { telescopeReadout } from './telescope';

function readoutAt(eraId: 'ptolemy' | 'copernicus' | 'galileo' | 'newton' | 'tycho', body: string, jd: number) {
  const era = getEra(eraId);
  const m = new Mechanism(era.build(resolveOptions(era, {})));
  m.evaluate(timeContext(jd));
  return telescopeReadout(m, era, body)!;
}

describe('telescope readout', () => {
  it('keeps Ptolemy’s Venus a crescent or half disc at every date, as Kuhn stresses', () => {
    for (let jd = 2309000; jd < 2309000 + 600; jd += 20) {
      expect(readoutAt('ptolemy', 'venus', jd).illuminated).toBeLessThan(0.52);
    }
  });

  it('shows a nearly full Venus near superior conjunction for Copernicus and Tycho', () => {
    // Venus passed superior conjunction around 10 May 1610.
    let maxCopernicus = 0;
    let maxTycho = 0;
    for (let jd = 2309150; jd < 2309330; jd += 5) {
      maxCopernicus = Math.max(maxCopernicus, readoutAt('copernicus', 'venus', jd).illuminated);
      maxTycho = Math.max(maxTycho, readoutAt('tycho', 'venus', jd).illuminated);
    }
    expect(maxCopernicus).toBeGreaterThan(0.95);
    expect(Math.abs(maxCopernicus - maxTycho)).toBeLessThan(1e-6);
  });

  it('projects Galileo’s moons beside Jupiter within about 27 Jupiter radii', () => {
    const r = readoutAt('galileo', 'jupiter', 2309107.25);
    expect(r.satellites.map((s) => s.name)).toEqual(['Io', 'Europa', 'Ganymede', 'Callisto']);
    for (const s of r.satellites) expect(Math.hypot(s.east, s.north)).toBeLessThan(28);
    expect(r.satellites.filter((s) => s.east > 0.5).length).toBeGreaterThanOrEqual(2);
    expect(r.telescopeExists).toBe(true);
  });

  it('gives Newton’s Saturn rings with a real opening angle and no moons of Jupiter for Tycho', () => {
    const saturn = readoutAt('newton', 'saturn', 2337419.5);
    expect(saturn.rings).toBe('rings');
    expect(saturn.ringOpening).toBeGreaterThan(0);
    expect(saturn.ringOpening).toBeLessThan(0.5);
    expect(saturn.satellites.length).toBe(5);
    const jupiter = readoutAt('tycho', 'jupiter', 2297357);
    expect(jupiter.satellites).toEqual([]);
    expect(jupiter.telescopeExists).toBe(false);
  });
});
