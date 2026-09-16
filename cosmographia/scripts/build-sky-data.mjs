#!/usr/bin/env node
/**
 * Builds compact sky data for Cosmographia from the d3-celestial data set
 * (https://github.com/ofrohn/d3-celestial, BSD-3-Clause, (c) 2015 Olaf Frohn).
 *
 * Output: src/data/sky.json
 *   stars:   flat array [raDeg, decDeg, mag, bv, ...] (J2000 equatorial)
 *   names:   [{ ra, dec, mag, name }] proper names of bright / historically notable stars
 *   constellations: [{ id, name, ra, dec, lines: number[][] }] where each line is a flat
 *            [ra, dec, ra, dec, ...] polyline in degrees
 *
 * Usage: node scripts/build-sky-data.mjs [cacheDir]
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const cacheDir = process.argv[2] ?? '/tmp/skydata';
const BASE = 'https://raw.githubusercontent.com/ofrohn/d3-celestial/master/data/';
const FILES = ['stars.6.json', 'constellations.lines.json', 'constellations.json', 'starnames.json'];

/** Stars that carry a name label even though they are fainter than the magnitude cut. */
const NAME_WHITELIST = new Set(['Alcyone', 'Thuban', 'Algol', 'Mizar', 'Mira', 'Vindemiatrix', 'Zubenelgenubi']);
const NAME_MAG_LIMIT = 2.3;

async function load(file) {
  fs.mkdirSync(cacheDir, { recursive: true });
  const local = path.join(cacheDir, file);
  if (!fs.existsSync(local)) {
    const res = await fetch(BASE + file);
    if (!res.ok) throw new Error(`Failed to download ${file}: HTTP ${res.status}`);
    fs.writeFileSync(local, await res.text());
  }
  return JSON.parse(fs.readFileSync(local, 'utf8'));
}

const round = (v, digits) => {
  const f = 10 ** digits;
  return Math.round(v * f) / f;
};

/** d3-celestial stores RA in [-180, 180]; normalise to [0, 360). */
const normRa = (ra) => (ra < 0 ? ra + 360 : ra);

async function main() {
  const [stars, lines, consts, starnames] = await Promise.all(FILES.map(load));

  const flat = [];
  const byHip = new Map();
  for (const f of stars.features) {
    const [ra, dec] = f.geometry.coordinates;
    const mag = Number(f.properties.mag);
    const bv = Number.parseFloat(f.properties.bv);
    if (!Number.isFinite(mag)) continue;
    const raN = normRa(ra);
    flat.push(round(raN, 3), round(dec, 3), round(mag, 2), Number.isFinite(bv) ? round(bv, 2) : 0.6);
    byHip.set(String(f.id), { ra: raN, dec, mag });
  }

  const names = [];
  for (const [hip, info] of Object.entries(starnames)) {
    const name = (info.name ?? '').trim();
    if (!name) continue;
    const star = byHip.get(hip);
    if (!star) continue;
    if (star.mag <= NAME_MAG_LIMIT || NAME_WHITELIST.has(name)) {
      names.push({ ra: round(star.ra, 3), dec: round(star.dec, 3), mag: round(star.mag, 2), name });
    }
  }
  names.sort((a, b) => a.mag - b.mag);

  const nameById = new Map(consts.features.map((f) => [f.id, f]));
  const constellations = [];
  for (const f of lines.features) {
    const meta = nameById.get(f.id);
    const polylines = f.geometry.coordinates.map((line) =>
      line.flatMap(([ra, dec]) => [round(normRa(ra), 3), round(dec, 3)]),
    );
    const [lra, ldec] = meta ? meta.geometry.coordinates : f.geometry.coordinates[0][0];
    constellations.push({
      id: f.id,
      name: meta?.properties?.name ?? f.id,
      ra: round(normRa(lra), 2),
      dec: round(ldec, 2),
      lines: polylines,
    });
  }

  const out = {
    source: 'd3-celestial (BSD-3-Clause, (c) 2015 Olaf Frohn), stars to magnitude 6, J2000',
    stars: flat,
    names,
    constellations,
  };
  const outPath = path.join(root, 'src', 'data', 'sky.json');
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(out));
  console.log(
    `Wrote ${outPath}: ${flat.length / 4} stars, ${names.length} names, ${constellations.length} constellations, ` +
      `${(fs.statSync(outPath).size / 1024).toFixed(0)} KiB`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
