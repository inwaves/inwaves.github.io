import { describe, expect, it } from 'vitest';
import { calendarToJd, numericColumns, parseHorizonsCsv } from './horizons.mjs';

const OBSERVER_RESULT = `
*******************************************************************************
Ephemeris / API_USER
**************************************************************************************
 Date__(TT)__HR:MN:SC.fff, , ,    ObsEcLon,   ObsEcLat,             delta,     deldot,
**************************************************************************************
$$SOE
 0139-Oct-13 00:00:00.000, , ,  89.1217926, -0.0745716,  4.80268263183463,-25.4169275,
 0139-Oct-14 00:00:00.000,*,m,  89.1000000,  0.0100000,  4.79000000000000,-25.0000000,
$$EOE
**************************************************************************************
`;

const VECTOR_RESULT = `
            JDTDB,            Calendar Date (TDB),                      X,                      Y,                      Z,                     VX,                     VY,                     VZ,
**************************************************************************************************************************
$$SOE
2451545.000000000, A.D. 2000-Jan-01 12:00:00.0000,  2.671924636756030E-03,  8.640941902565209E-04,  7.127946422889783E-05, -3.0E-03,  9.0E-03,  1.0E-04,
$$EOE
`;

describe('parseHorizonsCsv', () => {
  it('keeps blank presence columns so named columns stay aligned', () => {
    const table = parseHorizonsCsv(OBSERVER_RESULT);
    expect(table.header).toEqual(['Date__(TT)__HR:MN:SC.fff', '', '', 'ObsEcLon', 'ObsEcLat', 'delta', 'deldot']);
    const values = numericColumns(table, ['ObsEcLon', 'ObsEcLat', 'delta']);
    expect(values[0]).toEqual([89.1217926, -0.0745716, 4.80268263183463]);
    expect(values[1]).toEqual([89.1, 0.01, 4.79]);
  });

  it('parses vector tables with scientific notation', () => {
    const table = parseHorizonsCsv(VECTOR_RESULT);
    const [row] = numericColumns(table, ['X', 'Y', 'Z', 'VX', 'VY', 'VZ']);
    expect(row[0]).toBeCloseTo(2.67192463675603e-3, 15);
    expect(row[5]).toBeCloseTo(1e-4, 12);
  });

  it('fails loudly on missing columns and missing ephemeris blocks', () => {
    const table = parseHorizonsCsv(OBSERVER_RESULT);
    expect(() => numericColumns(table, ['RA'])).toThrow(/not in header/);
    expect(() => parseHorizonsCsv('No ephemeris for target "Mars" prior to A.D. 1600')).toThrow(/No \$\$SOE/);
  });
});

describe('calendarToJd', () => {
  it('matches Meeus reference dates', () => {
    expect(calendarToJd(2000, 1, 1.5, true)).toBe(2451545.0);
    expect(calendarToJd(1957, 10, 4.81, true)).toBeCloseTo(2436116.31, 6);
    expect(calendarToJd(333, 1, 27.5, false)).toBe(1842713.0);
    expect(calendarToJd(-584, 5, 28.63, false)).toBeCloseTo(1507900.13, 6);
    expect(calendarToJd(-4712, 1, 1.5, false)).toBe(0);
  });
});
