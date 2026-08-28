// Builds public/data/sky.json from the d3-celestial datasets (Olaf Frohn, BSD-3-Clause).
//   stars.6.json              — stars to magnitude 6 (derived from the HYG database)
//   constellations.lines.json — IAU constellation stick figures
//   constellations.json       — constellation names and label positions
// Usage: npm run data

import { mkdir, writeFile } from 'node:fs/promises';

const BASE = 'https://raw.githubusercontent.com/ofrohn/d3-celestial/master/data/';
const FILES = ['stars.6.json', 'constellations.lines.json', 'constellations.json'];

async function fetchJSON(name) {
  const res = await fetch(BASE + name);
  if (!res.ok) throw new Error(`${name}: HTTP ${res.status}`);
  return res.json();
}

const r2 = (x) => Math.round(x * 100) / 100;

const [stars, lines, names] = await Promise.all(FILES.map(fetchJSON));

const out = {
  source: 'd3-celestial data (Olaf Frohn, BSD-3-Clause); stars from the HYG database; constellation figures after the IAU',
  frame: 'equatorial J2000, degrees',
  stars: stars.features
    .filter((f) => Number.isFinite(f.properties.mag) && f.properties.mag <= 6.5)
    .map((f) => {
      const bv = Number.parseFloat(f.properties.bv);
      return [
        r2(f.geometry.coordinates[0]),
        r2(f.geometry.coordinates[1]),
        r2(f.properties.mag),
        r2(Number.isFinite(bv) ? bv : 0.6),
      ];
    }),
  lines: lines.features.flatMap((f) =>
    f.geometry.coordinates.map((poly) => poly.map(([ra, dec]) => [r2(ra), r2(dec)])),
  ),
  names: names.features.map((f) => [
    f.id,
    f.properties.name,
    r2(f.geometry.coordinates[0]),
    r2(f.geometry.coordinates[1]),
  ]),
};

await mkdir('public/data', { recursive: true });
await writeFile('public/data/sky.json', JSON.stringify(out));
console.log(`sky.json: ${out.stars.length} stars, ${out.lines.length} polylines, ${out.names.length} names`);
