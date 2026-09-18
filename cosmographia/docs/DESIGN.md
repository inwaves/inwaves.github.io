# Cosmographia — Design

An interactive 3D atlas of how humanity pictured the heavens, from Anaximander (c. 550 BCE)
to Newton (1687). Each era is a *working* kinematic model with historically grounded
parameters, viewable from outside (Cosmos view) and from the astronomer's own sky
(Sky view, Stellarium-like). A modern ephemeris runs alongside so the user can see
where every model succeeds and where it fails.

## 1. Stack

- Vite 8, React 19, TypeScript 7, three.js r186, zustand 5, vitest 5.
- No postprocessing; glow via additive sprites. Labels via CSS2DRenderer.
- Data: d3-celestial (BSD-3) stars to mag 6, constellation lines, names, Milky Way.
- Validation fixtures: JPL Horizons API (DE441 barycentres for pre-1600 dates).

## 2. Coordinates and time

- **Model frame** = ecliptic *of date*: X → vernal equinox of date, Y → longitude 90°,
  Z → north ecliptic pole. Units are per model (Earth radii, AU, schematic).
- **three.js world**: Y-up. `three = (ecl.x, ecl.z, -ecl.y)`.
- Equatorial of date: rotate ecliptic about X by obliquity ε(T).
- **Time**: `jd` is Terrestrial Time (TT). `ut = jd - ΔT/86400` (Espenak–Meeus ΔT).
  Historical mean motions are day-based, so historical models use UT JD; the modern
  ephemeris uses TT. Sidereal time from UT (Meeus 12.4).
- Calendar: proleptic Julian before each location's Gregorian reform date, Gregorian after
  (Italy/Poland/Bohemia 1582–1584, Denmark 1700, England 1752).
- Precession J2000 → date for ecliptic vectors: Meeus 21.7 (η, Π, p): `R = Rz(p+Π)·Rx(-η)·Rz(-Π)`.

## 3. Modern ephemeris ("truth")

- Planets + EM barycentre: JPL approximate Keplerian elements, Table 2a/2b (3000 BC–3000 AD),
  J2000 ecliptic, precessed to date.
- Moon: Meeus ch. 47 main periodic terms (of-date ecliptic).
- Galilean and Saturnian moons: circular orbits in the plane of the J2000 state vector from
  Horizons, advanced at the sidereal rate; validated at 1610-01-07.
- Comets: osculating elements (Halley 1682, C/1680 V1, C/1577 V1) from JPL SBDB.
- Novae: SN 1572 (Tycho), SN 1604 (Kepler) as time-dependent stars.

## 4. Mechanism framework (`src/models/mechanism.ts`)

A model is a tree of **nodes**. Each node computes a *local transform* (position in parent
units + rotation quaternion) from a `TimeContext`. Composition gives

- **true** world transform (used by the Sky view, phases, errors), and
- **display** world transform: identical but each node may carry a `displayScale` that
  multiplies all descendant positions (used for schematic vs proportional layouts and for
  exaggerating satellite systems). Uniform per-group scaling about a geocentric origin
  preserves directions, so it never corrupts what an observer at the centre sees.

Nodes carry **constructs** (visual furniture in node-local coordinates): `sphere`, `circle`,
`ellipse`, `torus`, `drum`, `axis`, `marker`, `polyhedron`, `ring`, plus dynamic `link`
(line between two nodes) and `sector` (Kepler area wedge). Constructs belong to layers:
`spheres`, `mechanism`, `orbits`.

**Bodies** attach to nodes: `{id, name, kind, node, appearance}`. The observer is a body
(`earth`) or a node designated by the model.

Diurnal motion is a *renderer* effect: models compute everything in the non-rotating frame.
Cosmos view may apply `Rot(-GMST)` about the celestial pole to the whole scene
("Earth-fixed frame", default for geocentric models) while the Earth mesh always spins +θ.

## 5. Eras

| # | id | Title | Key date (epoch) | Place | Mechanism |
|---|----|-------|------------------|-------|-----------|
| 1 | anaximander | Anaximander | −546 (c. 550 BCE) | Miletus 37.53N 27.28E | Drum Earth (d:h = 3:1); rings of fire at 9, 18, 27 Earth diameters with vents; uniform Sun/Moon; no planets |
| 2 | philolaus | Philolaus & the Pythagoreans | −429 | Croton 39.08N 17.12E | Central Fire; Counter-Earth; Earth orbits fire daily (angle = LST); uniform circles; static stars |
| 3 | eudoxus | Eudoxus: homocentric spheres | −369 | Cnidus 36.69N 27.37E | 27 spheres: planets 4 (daily, zodiacal, hippopede pair), Sun 3, Moon 3 |
| 4 | aristotle | Aristotle: the physical cosmos | −349 | Athens 37.98N 23.73E | 55 spheres (Callippan Sun/Moon anomaly spheres), counteracting spheres, sublunar elements, Prime Mover |
| 5 | aristarchus | Aristarchus: the Sun at the centre | −279-06 (solstice obs.) | Alexandria 31.20N 29.92E | Heliocentric uniform circles; Moon distance = 1/19 Sun distance |
| 6 | hipparchus | Apollonius & Hipparchus | −134 | Rhodes 36.44N 28.22E | Eccentric Sun; lunar epicycle; planets simple concentric deferent+epicycle (Apollonian) |
| 7 | ptolemy | Ptolemy: the Almagest | 139-05-28 (Mars opposition) | Alexandria | Eccentric Sun; crank lunar model; equant for Venus/Mars/Jupiter/Saturn; Mercury crank; Planetary Hypotheses shells |
| 8 | medieval | The medieval cosmos | 1300-04-10 (Dante) | Florence 43.77N 11.25E | Ptolemaic geometry re-fitted (Alfonsine-style) + Ibn al-Shatir variant; primum mobile, crystalline, Empyrean |
| 9 | copernicus | Copernicus: De revolutionibus | 1543-05-24 | Frombork 54.36N 19.68E | Heliostatic: eccentric Earth orbit; planets with 3e/2 deferent + e/2 epicyclet; double-epicycle Moon |
| 10 | tycho | Tycho Brahe | 1572-11-11 (nova) | Uraniborg 55.91N 12.70E | Geo-heliocentric = Copernican geometry translated to fixed Earth; Sun at 1150 ER; stars at 14 000 ER |
| 11 | galileo | Galileo: the telescope | 1610-01-07 | Padua 45.41N 11.88E | Copernican mechanics + Galilean moons, Venus phases, Saturn's "ears", sunspots |
| 12 | kepler | Kepler: ellipses and harmonies | 1618-05-15 (third law) | Linz 48.31N 14.29E | Keplerian ellipses (modern elements); area law wedges; Mysterium polyhedra |
| 13 | newton | Newton: universal gravitation | 1687-07-05 (Julian) | Cambridge 52.21N 0.12E | Kepler orbits under gravity; Saturn rings & 5 moons; comets; infinite star field |

Discovery gating (by era knowledge year): Galilean moons 1610; Saturn "ears" 1610–1655;
Titan 1655; rings explained 1659; Iapetus 1671; Rhea 1672; Tethys & Dione 1684.
Constellations: Ptolemy's 48 before 1603; + Plancius/Bayer southern after; + Hevelius 1687.

## 6. Historical parameters

### Almagest (Nabonassar epoch: JD 1448637.917 UT, Alexandria noon)

| Body | e (R=60) | r | apogee @Nab | mean long @Nab | anomaly @Nab | long rate °/d | anomaly rate °/d |
|------|---------|---|-------------|----------------|--------------|---------------|------------------|
| Sun | 2;30 | – | 65;30 (fixed) | 330;45 | – | 0.98563527 | – |
| Moon | 10;19 (crank), deferent 49;41 | 5;15 | – | 41;22 | 268;49 | 13.17638222 | 13.06498286 |
| Mercury | 3;0 (crank) | 22;30 | 181;10 | = Sun | 21;55 | = Sun | 3.10669904 |
| Venus | 1;15 | 43;10 | 46;10 | = Sun | 71;7 | = Sun | 0.61650873 |
| Mars | 6;0 | 39;30 | 106;40 | 3;32 | 327;13 | 0.52405972 | 0.46157555 |
| Jupiter | 2;45 | 11;30 | 152;9 | 184;41 | 146;4 | 0.08312244 | 0.90251283 |
| Saturn | 3;25 | 6;30 | 224;10 | 296;43 | 34;2 | 0.03348854 | 0.95214673 |

Moon: elongation 70;37 @Nab, rate 12.19074690; argument of latitude from northern limit
354;15, rate 13.22935100; inclination 5°. Apogees (planets) precess 1°/century.
Planetary Hypotheses shells (ER): Moon 33–64, Mercury 64–166, Venus 166–1079,
Sun 1160–1260, Mars 1260–8820, Jupiter 8820–14187, Saturn 14187–19865, stars 20 000.

### Eudoxus (Simplicius; Schiaparelli inclinations)

Zodiacal: Saturn 30 y, Jupiter 12 y, Mars 2 y, Venus 1 y, Mercury 1 y.
Synodic: Saturn 13 mo, Jupiter 13 mo, Mars 8 mo 20 d (260 d), Venus 19 mo, Mercury 110 d.
Hippopede inclination: Saturn 6°, Jupiter 13°, Mars 34°, Venus 46°, Mercury 23°.
Aristotle: 33 moving + 22 counteracting = 55 spheres.

### Copernicus (De revolutionibus, Swerdlow & Neugebauer)

Earth eccentricity 0.0323. Superior planets (parts of deferent radius): Saturn 3e/2 = 0.0854,
e/2 = 0.0285, R = 9.174; Jupiter 0.0687 / 0.0229, R = 5.219; Mars 0.1460 / 0.0500, R = 1.520.
Venus R = 0.7193; Mercury R = 0.3763. Moon: deferent 1, epicycles 0.1097 and 0.0237.

### Others

Tycho: Sun 1150 ER, Saturn ≤ 12 300 ER, stars 14 000 ER. Anaximander: rings at 9, 18, 27 ED.
Kepler solids outward: octahedron, icosahedron, dodecahedron, tetrahedron, cube.

## 7. Views

- **Cosmos**: OrbitControls; nodes/constructs/bodies; trails sampled analytically over a
  per-body span; labels decluttered by priority; optional Earth-fixed frame (daily rotation of the
  heavens) and zenith-up framing for Anaximander's drum; Kepler's equal-area wedges.
- **Sky**: camera at origin; stars (magnitude-scaled points, B−V colour), constellation
  lines filtered by era, ecliptic with zodiac signs, equator, alt-az grid, landscape ground, daylight
  atmosphere, procedural Milky Way, body markers (Moon phase), sky-plane trails (retrograde loops),
  modern-position ghosts with angular error, novae of 1572 and 1604. Modes: horizon or star-locked.
  HTML labels below the horizon are hidden each frame.
- **Telescope** (2D canvas): phase and bright limb from the model's own Sun, satellites projected on
  the sky (occultation in true radii), Saturn's ring halves or "ears", lunar craters and sunspots after
  1610; before 1609 it is labelled a prediction.

## 8. State, events and deep links

- zustand store holds era, options, view, layers, selection and clock requests (nonce-based jumps,
  look-at, follow, camera reset). The engine reads the store every frame and publishes clock, body
  and telescope readouts at about 7 Hz.
- Each era defines `events` (observations, novae, comets) that set date, place, view, focus and speed,
  and `defaults.layers` applied on arrival.
- URL: `?era=<id>&view=cosmos|sky&intro=0&ghosts=1&paused=1`.

## 9. Validation

- `src/astro/ephemeris/ephemeris.test.ts`: modern ephemeris vs JPL Horizons, 1000 BCE–2026.
- `src/models/eras/*.test.ts`: every era builds with every option; accuracy at its epoch; Tycho ≡
  Copernicus; Eudoxus retrogrades; Philolaus does not; Latin ≈ Ibn al-Shatir; 55 spheres; Galileo's
  moons on 7 Jan 1610; Kepler's equal areas; discovery gating.
- `src/render/*.test.ts`: trails, window cache, dashed lines, telescope readouts and geometry, label
  culling and declutter. `scripts/smoke.mjs`: headless Chromium renders every era in both views.

## 10. Source layout

```
src/astro/      time, math, frames, ephemeris (planets, moon, satellites, comets), stars
src/models/     mechanism.ts, types.ts, shared/, one file per era, registry.ts
src/content/    narrative per era
src/render/     Engine, CosmosRenderer, SkyRenderer, trails, textures, labels
src/state/      zustand store, simulation clock
src/ui/         React components (Timeline, EraPanel, TimeControls, Layers, Inspector, Telescope)
scripts/        data builders, Horizons fixtures, smoke test
```
