/**
 * Builds the star and constellation data used by the simulation.
 *
 * Downloads the d3-celestial catalogue (BSD 3-Clause, Olaf Frohn), converts
 * J2000 equatorial coordinates to J2000 ecliptic coordinates, and writes compact
 * JSON into src/data/. The generated files are committed, so this script only
 * needs to be run to regenerate them.
 *
 * Usage: npm run build:stars
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Upstream revision the catalogue is generated from. Pinned to a commit rather
 * than a branch so that regenerating the data always yields the same files.
 * This was the head of d3-celestial's master branch (2022-07-05) when the data
 * was first generated. Bump it deliberately, and review the resulting diff.
 */
const UPSTREAM_COMMIT = '7e720a3de062059d4c5400a379146a601d9010e0';
const BASE = `https://raw.githubusercontent.com/ofrohn/d3-celestial/${UPSTREAM_COMMIT}`;
const OUT_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '../src/data');

/** Mean obliquity of the ecliptic at J2000, degrees. */
const OBLIQUITY_J2000 = 23.4392911;
const DEG = Math.PI / 180;

/**
 * Converts J2000 equatorial coordinates to J2000 ecliptic coordinates.
 * @param {number} raDeg right ascension in degrees
 * @param {number} decDeg declination in degrees
 * @returns {[number, number]} ecliptic longitude and latitude in degrees
 */
export function equatorialToEcliptic(raDeg, decDeg) {
  const a = raDeg * DEG;
  const d = decDeg * DEG;
  const e = OBLIQUITY_J2000 * DEG;
  const sinBeta = Math.sin(d) * Math.cos(e) - Math.cos(d) * Math.sin(e) * Math.sin(a);
  const beta = Math.asin(Math.max(-1, Math.min(1, sinBeta)));
  const y = Math.sin(a) * Math.cos(e) + Math.tan(d) * Math.sin(e);
  const x = Math.cos(a);
  let lambda = Math.atan2(y, x) / DEG;
  if (lambda < 0) lambda += 360;
  return [lambda, beta / DEG];
}

/** d3-celestial stores right ascension as a longitude in -180..180. */
function raFromLongitude(lon) {
  return lon < 0 ? lon + 360 : lon;
}

const round = (v, places) => {
  const f = 10 ** places;
  return Math.round(v * f) / f;
};

async function fetchJson(path) {
  const res = await fetch(`${BASE}/${path}`);
  if (!res.ok) throw new Error(`Failed to fetch ${path}: HTTP ${res.status}`);
  return res.json();
}

async function fetchText(path) {
  const res = await fetch(`${BASE}/${path}`);
  if (!res.ok) throw new Error(`Failed to fetch ${path}: HTTP ${res.status}`);
  return res.text();
}

async function main() {
  const [starsGeo, linesGeo, licence] = await Promise.all([
    fetchJson('data/stars.6.json'),
    fetchJson('data/constellations.lines.json'),
    fetchText('LICENSE'),
  ]);

  // Flat array of [lambda, beta, magnitude, B-V] per star, brightest first so a
  // magnitude limit can be applied by truncating the draw range.
  const stars = starsGeo.features
    .map((f) => {
      const [lon, dec] = f.geometry.coordinates;
      const [lambda, beta] = equatorialToEcliptic(raFromLongitude(lon), dec);
      const bv = Number.parseFloat(f.properties.bv);
      return [round(lambda, 3), round(beta, 3), f.properties.mag, Number.isFinite(bv) ? round(bv, 2) : 0.6];
    })
    .sort((p, q) => p[2] - q[2]);

  const constellations = linesGeo.features.map((f) => ({
    id: f.id,
    lines: f.geometry.coordinates.map((line) =>
      line.map(([lon, dec]) => {
        const [lambda, beta] = equatorialToEcliptic(raFromLongitude(lon), dec);
        return [round(lambda, 2), round(beta, 2)];
      }),
    ),
  }));

  const source = { project: 'ofrohn/d3-celestial', commit: UPSTREAM_COMMIT, licence: 'BSD-3-Clause' };

  await mkdir(OUT_DIR, { recursive: true });
  await writeFile(
    resolve(OUT_DIR, 'stars.json'),
    JSON.stringify({ source, frame: 'ecliptic-J2000', fields: ['lambda', 'beta', 'mag', 'bv'], stars: stars.flat() }),
  );
  await writeFile(
    resolve(OUT_DIR, 'constellations.json'),
    JSON.stringify({ source, frame: 'ecliptic-J2000', constellations }),
  );
  await writeFile(resolve(OUT_DIR, 'LICENSE-d3-celestial.txt'), licence);

  console.log(`stars: ${stars.length}, constellations: ${constellations.length}`);
  console.log(`brightest: mag ${stars[0][2]} at lambda ${stars[0][0]}, beta ${stars[0][1]}`);
}

// Only run when invoked directly, so the conversion function can be imported by tests.
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((err) => {
    console.error(err);
    process.exitCode = 1;
  });
}
