# Cosmographia — how the heavens were imagined

An interactive 3D atlas of humanity's changing picture of the cosmos, from Anaximander's drum-shaped
Earth (c. 550 BCE) to Newton's universal gravitation (1687). It follows the story Thomas Kuhn tells in
*The Copernican Revolution*.

Every stop on the timeline is a **working model**, with its own geometry and historically grounded
parameters, placed at a real place on a real night. Each can be seen two ways:

- **Cosmos**: the machinery from outside, meaning spheres, wheels of fire, deferents, epicycles, equants and orbits.
- **Sky**: the astronomer's own sky, Stellarium-style, with horizon, stars, constellations, zodiac and daylight.

A modern ephemeris runs alongside every worldview, so **Modern positions** shows where each model
succeeds and where it fails.

## On inwaves.io

Served at [inwaves.io/cosmographia](https://inwaves.io/cosmographia/). The site's GitHub Actions
workflow runs `npm ci`, `npm test` and `npm run build` in this directory and copies `dist/` into the
site's `public/cosmographia/`. The build uses a relative base (`base: './'`), so it works under any
path. Textures resolve through `import.meta.env.BASE_URL`, and deep links are query parameters, for
example `https://inwaves.io/cosmographia/?era=kepler&view=sky`.

## The worldviews

| # | Worldview | Moment | Machinery |
|---|-----------|--------|-----------|
| 1 | Anaximander of Miletus | Midsummer 547 BCE, Miletus | Drum Earth; rings of fire at 9, 18, 27 Earth diameters with vents |
| 2 | Philolaus of Croton | 430 BCE, Croton | Central Fire; Counter-Earth; the Earth circles the Fire daily |
| 3 | Eudoxus of Cnidus | Jupiter at opposition, 369 BCE | Homocentric spheres; hippopede figure-eights (Simplicius's periods) |
| 4 | Aristotle | The Moon covers Mars, 357 BCE, Athens | 55 physical spheres, unrolling spheres, sublunar elements |
| 5 | Aristarchus of Samos | Solstice of 280 BCE, Alexandria | Sun-centred circles; Moon at 1/19 of the Sun's distance |
| 6 | Apollonius & Hipparchus | Autumn equinox 146 BCE, Rhodes | Eccentric Sun, lunar epicycle, Apollonian planets |
| 7 | Ptolemy | Mars opposition, 28 May 139 CE, Alexandria | Almagest parameters: eccentrics, epicycles, equants, Mercury's crank; Planetary Hypotheses shells |
| 8 | The medieval cosmos | Easter 1300, Florence | Ptolemaic models re-fitted (Alfonsine style) or Ibn al-Shatir's; Dante's heavens |
| 9 | Copernicus | 24 May 1543, Frombork | De revolutionibus: eccentric great orb, 3e/2 + e/2 epicyclets, double-epicycle Moon |
| 10 | Tycho Brahe | Great Comet of 1577, Hven | Copernican geometry with the Earth still; nova of 1572; comet of 1577 |
| 11 | Galileo | 7 January 1610, Padua | Copernican circles plus the four Medicean moons; Saturn's "ears" |
| 12 | Kepler | Third law, 15 May 1618, Linz | Ellipses, equal-area wedges, Mysterium Cosmographicum solids |
| 13 | Newton | Principia, 5 July 1687, Cambridge | Keplerian orbits under gravity; Saturn's ring and five moons; comets of 1680 and 1682 |

Discoveries are tied to the era that knew them. There are no moons of Jupiter before Galileo. Saturn is
triple for Galileo and Kepler and ringed for Newton. Titan, Iapetus, Rhea, Tethys and Dione appear only
from 1655 to 1684, and the constellations grow from Ptolemy's 48 to Bayer's and Hevelius's additions.

## Using it

- **Timeline** (bottom): click a figure, use ‹ ›, or press ← →.
- **Cosmos view**: drag to orbit, scroll to zoom, click a body to inspect it, double-click to follow it.
- **Sky view**: drag to look around and scroll to zoom. Choose *Horizon* (the astronomer's place) or *Star-locked*.
- **Time**: play or pause (space), slower or faster (`[` `]`), reverse, *Set date*, back to the era's moment.
- **Layers** (`L`): spheres, mechanism, orbits, trails, labels, constellations, grid, daylight, modern
  positions (`G`), daily rotation, trails as seen from Earth, and per-era options (Planetary Hypotheses
  layout, Ibn al-Shatir's models, Mysterium solids, equal-area wedges and more).
- **Worldview panel** (`I`): the picture, the motions, the evidence for and against, Kuhn's chapter, the
  simulation's parameters and sources, and moments to visit.
- **Telescope** (`O`): phases, moons and rings of the selected body, as the worldview's geometry implies.

Deep links: `?era=kepler&view=sky&ghosts=1&paused=1&intro=0`.

## Accuracy and validation

The modern sky comes from JPL's approximate Keplerian elements for 3000 BCE to 3000 CE (Standish &
Williams), Meeus's truncated lunar theory, and satellite states from JPL Horizons. The test suite
compares it with Horizons (DE441) from 1000 BCE to 2026. The Sun is within 0.05°, the planets within
0.35° and the Moon within 0.35°.

The historical models are tested against that sky at their own epochs. Ptolemy's Almagest, for example,
is within about 2° of every body on the night of his 139 CE Mars opposition. The tests also check:

- Tycho and Copernicus give identical geocentric directions.
- Eudoxus's Jupiter retrogrades at opposition, and the Pythagorean planets never do.
- Galileo's moons come out two east of Jupiter and one west on 7 January 1610.
- Kepler's Mars sweeps equal areas in equal times.
- Ptolemy's Venus can never show more than half its disc lit.

Each era's *Notes* tab states what is historical and what is reconstruction or simplification. For
example: Schiaparelli's hippopede inclinations, modern latitudes in Ptolemy, Copernicus's Mercury
simplified, mean motions of uniform-circle models phased to the real sky, and planetary distances
borrowed from Copernicus for Aristarchus.

## Development

```bash
npm install
npm run dev          # http://localhost:8080
npm test             # unit tests (vitest)
npm run typecheck
npm run build        # production bundle in dist/
npm run smoke        # headless Chromium: every era in both views, fails on console errors
```

Environment variables for the dev server:

- `COSMOGRAPHIA_ALLOWED_HOSTS`: comma-separated extra hostnames (leading dot for subdomains). Vite's
  host check stays on.
- `PUBLIC_HOSTNAME`: a URL whose hostname is allowed automatically.
- `COSMOGRAPHIA_POLL=1`: use polling file watching on filesystems without native change events.

Data scripts: `npm run data:sky` rebuilds `src/data/sky.json` from d3-celestial.
`npm run data:fixtures` refreshes the Horizons validation fixtures.

Architecture and parameter tables are in [`docs/DESIGN.md`](docs/DESIGN.md). In brief:

- **`src/astro`**: time scales, calendars, frames and precession, and the modern ephemeris.
- **`src/models`**: a node-tree mechanism framework with true and display transforms, shared builders
  (Ptolemaic, homocentric, Copernican, Keplerian, satellites) and one file per era.
- **`src/render`**: the three.js engine, the Cosmos and Sky views, trails, readouts and the telescope.
- **`src/ui`**: React components. **`src/content`**: the narrative for each era.

## Credits

Licence texts for the bundled libraries and fonts and for the derived star data are in
[`THIRD_PARTY_NOTICES.md`](THIRD_PARTY_NOTICES.md).

- Star catalogue, constellation lines and names: [d3-celestial](https://github.com/ofrohn/d3-celestial) by Olaf Frohn, BSD-3-Clause.
- Earth texture: NASA Visible Earth, Blue Marble (public domain). Moon texture: NASA/GSFC, LRO CGI Moon Kit (public domain).
- Planetary elements: E. M. Standish, JPL Solar System Dynamics. Validation: JPL Horizons and the Small-Body Database.
- Algorithms: J. Meeus, *Astronomical Algorithms* (1998); F. Espenak & J. Meeus, Delta T polynomials (2006).
- Historical parameters: Toomer's *Almagest*; Goldstein's *Planetary Hypotheses*; Simplicius and
  Schiaparelli on Eudoxus; Swerdlow & Neugebauer on Copernicus. Sources for each era are listed in the app.
