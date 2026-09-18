#!/usr/bin/env node
/**
 * Fetches validation fixtures from the JPL Horizons API and writes
 * src/astro/__fixtures__/horizons.json.
 *
 * - Geocentric ecliptic-of-date longitude/latitude (quantity 31) of the Sun, Moon and planets
 *   at dates spanning 1000 BCE to 2026 CE, with times in TT. Planet barycentres are used because
 *   body-centre ephemerides do not extend before 1600.
 * - State vectors of the Galilean and major Saturnian satellites relative to their planet
 *   (ecliptic J2000, AU and AU/day) at J2000 and at check dates. Saturnian satellite
 *   ephemerides begin in 1750, so earlier dates are skipped for them.
 *
 * Usage: node scripts/fetch-horizons-fixtures.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { calendarToJd, numericColumns, parseHorizonsCsv } from './lib/horizons.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const API = 'https://ssd.jpl.nasa.gov/api/horizons.api';

/**
 * Check epochs as calendar dates (astronomical year numbering; Julian calendar unless marked
 * gregorian). Times are TT. JDs are computed, never hand-entered.
 */
const EPOCH_DATES = [
  { label: '1000 BCE Jan 1 (Julian)', y: -999, m: 1, d: 1, gregorian: false },
  { label: '547 BCE Jun 21 (Anaximander)', y: -546, m: 6, d: 21, gregorian: false },
  { label: '370 BCE Mar 1 (Eudoxus)', y: -369, m: 3, d: 1, gregorian: false },
  { label: '280 BCE Jun 27 (Aristarchus)', y: -279, m: 6, d: 27, gregorian: false },
  { label: '139 CE May 28 (Ptolemy)', y: 139, m: 5, d: 28, gregorian: false },
  { label: '1000 CE Jan 1 (Julian)', y: 1000, m: 1, d: 1, gregorian: false },
  { label: '1300 Apr 10 (Dante, Julian)', y: 1300, m: 4, d: 10, gregorian: false },
  { label: '1543 May 24 (Copernicus, Julian)', y: 1543, m: 5, d: 24, gregorian: false },
  { label: '1610 Jan 7 (Galileo, Gregorian)', y: 1610, m: 1, d: 7.75, gregorian: true },
  { label: '1687 Jul 5 (Newton, Julian)', y: 1687, m: 7, d: 5, gregorian: false },
  { label: '2000 Jan 1.5 (J2000)', y: 2000, m: 1, d: 1.5, gregorian: true },
  { label: '2026 Sep 14', y: 2026, m: 9, d: 14, gregorian: true },
];
const EPOCHS = EPOCH_DATES.map((e) => ({ label: e.label, jd: calendarToJd(e.y, e.m, e.d, e.gregorian) }));

const BODIES = [
  { id: 'sun', command: '10' },
  { id: 'moon', command: '301' },
  { id: 'mercury', command: '1' },
  { id: 'venus', command: '2' },
  { id: 'mars', command: '4' },
  { id: 'jupiter', command: '5' },
  { id: 'saturn', command: '6' },
];

const SATELLITES = [
  { id: 'io', command: '501', center: '500@599' },
  { id: 'europa', command: '502', center: '500@599' },
  { id: 'ganymede', command: '503', center: '500@599' },
  { id: 'callisto', command: '504', center: '500@599' },
  { id: 'tethys', command: '603', center: '500@699' },
  { id: 'dione', command: '604', center: '500@699' },
  { id: 'rhea', command: '605', center: '500@699' },
  { id: 'titan', command: '606', center: '500@699' },
  { id: 'iapetus', command: '608', center: '500@699' },
];

/** Satellite check dates: J2000 (fit), Galileo's first night, and today. */
const SAT_EPOCHS = [2451545.0, calendarToJd(1610, 1, 7.75, true), calendarToJd(2026, 9, 14, true)];
/** Saturnian satellite ephemerides (SAT441) start 1749-12-31. */
const SATURN_EPHEMERIS_START = calendarToJd(1750, 1, 1, true);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function query(params) {
  const url = new URL(API);
  for (const [k, v] of Object.entries({ format: 'json', ...params })) url.searchParams.set(k, v);
  for (let attempt = 0; attempt < 4; attempt++) {
    const res = await fetch(url);
    if (res.ok) {
      const body = await res.json();
      if (body.error) throw new Error(`Horizons error for ${params.COMMAND}: ${body.error}`);
      return body.result;
    }
    await sleep(1500 * (attempt + 1));
  }
  throw new Error(`Horizons request failed repeatedly: ${url}`);
}

async function observerFixtures() {
  const out = {};
  for (const body of BODIES) {
    const result = await query({
      COMMAND: `'${body.command}'`,
      OBJ_DATA: `'NO'`,
      MAKE_EPHEM: `'YES'`,
      EPHEM_TYPE: `'OBSERVER'`,
      CENTER: `'500@399'`,
      TLIST: `'${EPOCHS.map((e) => e.jd).join(' ')}'`,
      TLIST_TYPE: `'JD'`,
      TIME_TYPE: `'TT'`,
      QUANTITIES: `'31,20'`,
      CSV_FORMAT: `'YES'`,
      ANG_FORMAT: `'DEG'`,
    });
    const table = parseHorizonsCsv(result);
    if (table.rows.length !== EPOCHS.length) {
      throw new Error(`Expected ${EPOCHS.length} rows for ${body.id}, got ${table.rows.length}`);
    }
    const values = numericColumns(table, ['ObsEcLon', 'ObsEcLat', 'delta']);
    out[body.id] = values.map(([lon, lat, delta], i) => ({ jd: EPOCHS[i].jd, label: EPOCHS[i].label, lon, lat, delta }));
    console.log(`observer ${body.id}: ${values.length} rows, first lon ${values[0][0]}`);
    await sleep(400);
  }
  return out;
}

async function satelliteFixtures() {
  const out = {};
  for (const sat of SATELLITES) {
    out[sat.id] = [];
    for (const jd of SAT_EPOCHS) {
      if (sat.center === '500@699' && jd < SATURN_EPHEMERIS_START) continue;
      const result = await query({
        COMMAND: `'${sat.command}'`,
        OBJ_DATA: `'NO'`,
        MAKE_EPHEM: `'YES'`,
        EPHEM_TYPE: `'VECTORS'`,
        CENTER: `'${sat.center}'`,
        TLIST: `'${jd}'`,
        TLIST_TYPE: `'JD'`,
        REF_PLANE: `'ECLIPTIC'`,
        REF_SYSTEM: `'J2000'`,
        OUT_UNITS: `'AU-D'`,
        VEC_TABLE: `'2'`,
        CSV_FORMAT: `'YES'`,
      });
      const table = parseHorizonsCsv(result);
      if (table.rows.length !== 1) throw new Error(`Expected 1 state row for ${sat.id} @ ${jd}`);
      const [[x, y, z, vx, vy, vz]] = numericColumns(table, ['X', 'Y', 'Z', 'VX', 'VY', 'VZ']);
      out[sat.id].push({ jd, r: [x, y, z], v: [vx, vy, vz] });
      await sleep(400);
    }
    console.log(`satellite ${sat.id}: ${out[sat.id].length} states`);
  }
  return out;
}

async function main() {
  const observer = await observerFixtures();
  const satellites = await satelliteFixtures();
  const outPath = path.join(root, 'src', 'astro', '__fixtures__', 'horizons.json');
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(
    outPath,
    JSON.stringify(
      {
        source: 'JPL Horizons API (DE441 / JUP365 / SAT441), fetched ' + new Date().toISOString(),
        epochs: EPOCHS,
        observer,
        satellites,
      },
      null,
      1,
    ),
  );
  console.log(`Wrote ${outPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
