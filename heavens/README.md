# Conceptions of the Heavens

An interactive 3D tour through humanity's models of the cosmos, from Anaximander's wheels of fire
to the solar system of today, built for readers of Thomas Kuhn's *The Copernican Revolution*.

Each of the sixteen worldviews is a working kinematic mechanism rendered in three.js: homocentric
spheres, deferents and epicycles, eccentrics and equants, Ptolemy's Mercury crank, Ibn al-Shatir's
epicyclets, Copernicus' circles, Tycho's geo-heliocentric compromise, Kepler's ellipses, Newton's
comets, the Newtonian discoveries of Uranus and Neptune, and the belts and dwarf planets of the
present. All are driven from the same modern mean elements, so the *sky* each one predicts is (to
within that model's genuine historical errors) the real one; the *machinery* producing it is the one
its authors imagined. Before Galileo there are no moons of Jupiter; from 1610 on there are.

## Running it

```bash
cd heavens
npm install
npm run dev        # development server on http://localhost:8080
npm run build      # production build in dist/
npm run preview    # serve the production build on port 8080
npm test           # unit and model-fidelity tests (node --test)
npm run data       # rebuild public/data/sky.json from the d3-celestial datasets
```

The build is fully static (`dist/`), has no runtime dependencies beyond the bundled three.js, and
works offline once loaded; the star catalogue is a 140 kB JSON file.

## Using it

| Control | Effect |
|---|---|
| Timeline (bottom), `←` `→` | Move between worldviews |
| `Space`, `[` `]`, `0`, Epoch button | Pause; halve/double the clock; return to the worldview's own date |
| God's-eye view / From the Earth, `E` | Orbit the model from outside, or stand at the Earth and look out (drag to look, wheel to zoom) |
| Follow / Point at, or click a body | Keep a body centred; in Earth view, track it across the sky. The followed body's own mechanism markers are labelled |
| Proportions | *Legible*: compressed distances, enlarged bodies. *As conceived*: each period's own sizes and distances in Earth radii |
| Trail frame | Trails relative to the model's centre, or relative to the Earth (showing retrograde loops) |
| Display toggles, `T` `M` `S` `L` `D` | Orbit guides, mechanism (centres, equants, arms), crystalline spheres, trails, labels, stars, constellation figures and names, ecliptic and equator of date, zodiac signs, daily rotation |
| `?` or `H` | Help |

Deep links: `#kepler` opens a worldview; `#stage=galileo&follow=jupiter&view=earth&frame=earth&speed=0.5&scale=period&paused=1` sets the view as well.

The daily rotation of the heavens is shown whenever the clock runs at 0.5 days/s or slower. Faster
than that it would alias into a blur, so the sky is drawn at the same sidereal time each day (as a
planetarium stepping by days does) and the slow motions of the wanderers stand out. Mechanism
markers are hidden in the view from the Earth, where they would sit on top of the observer.

## The worldviews

| # | Stage | Date shown | Mechanism |
|---|---|---|---|
| 1 | Anaximander | 560 BCE | Drum Earth; Sun, Moon and stars as apertures in wheels of fire at 27 : 18 : 9 Earth-diameters, turning daily |
| 2 | Philolaus | 430 BCE | Central Fire, Counter-Earth, Earth circling the Fire daily; schematic planets |
| 3 | Two-sphere universe | 380 BCE | Fixed Earth, rotating stellar sphere; planets as points of light moving with their true apparent motion ("the problem of the planets") |
| 4 | Eudoxus | 365 BCE | Homocentric spheres; each planet's hippopede from two counter-rotating spheres (Schiaparelli's tilts) |
| 5 | Aristotle | 340 BCE | Eudoxan spheres made physical; sublunary shells of water, air and fire; Prime Mover |
| 6 | Apollonius & Hipparchus | 140 BCE | Concentric deferents with uniform epicycles; eccentric Sun (e fitted at 2e); epicyclic Moon |
| 7 | Ptolemy | 150 CE | Eccentric deferents, bisected eccentricity with equant, epicycles locked to the mean Sun; Mercury's crank (moving deferent centre) |
| 8 | Medieval cosmos | 1300 | Ptolemy's mechanism inside Dante's nine heavens: element shells, Primum Mobile, Empyrean |
| 9 | Maragha school | 1350 | Ibn al-Shatir: concentric deferents, 3e/2 + e/2 epicyclets replacing eccentric and equant (extra pair for Mercury and Venus) |
| 10 | Copernicus | 1543 | Heliocentric; eccentric circles with epicyclets; Earth on a bare eccentric of 2e; finite stellar sphere |
| 11 | Tycho | 1588 | Fixed Earth, Sun circling it, planets circling the Sun with Copernican devices; Mars' orbit crosses the Sun's |
| 12 | Kepler | 1609 | Ellipses with the Sun at a focus; equal-area sectors; the five regular solids of the *Mysterium* |
| 13 | Galileo | 1610 | Copernican circles plus the Galilean moons, phases of Venus, cratered Moon, sunspots, "three-bodied" Saturn |
| 14 | Newton | 1687 | Keplerian ellipses explained; Halley's comet; Saturn's ring and Titan; stars scattered in depth |
| 15 | Herschel to Le Verrier | 1846 | Uranus, the first five asteroids, Neptune found by perturbation theory; stellar parallax |
| 16 | Today | now | Eight planets, asteroid and Kuiper belts, Pluto and Eris, Halley; relativity, the Galaxy and the expanding universe in the text |

## What is to scale and what is not

Exact in both layouts, because the cosmology depends on them:

- Periods (sidereal, synodic, the Moon's months, the Galilean satellites'), mean longitudes and
  the inclinations and nodes of the orbits, all from J2000 mean elements in a fixed frame.
- Epicycle/deferent ratios (Earth's orbit : planet's orbit, or the inverse for inner planets),
  eccentricities and equant distances (bisected), the 3e/2 : e/2 epicyclets, Ptolemy's Mercury
  crank (e = 3, crank radius 3, equant 3, with R = 60), Hipparchus' lunar epicycle (5;15 : 60).
- The Eudoxan tilt angles (Saturn 6°, Jupiter 13°, Mars 34°, Venus 46°, Mercury 23°) and the
  synodic phasing of the hippopedes.
- Heliocentric relative distances in AU; Kepler's polyhedra have exactly the planetary radii as
  circumradii; Halley's elements of 1682.
- Anaximander's 9 : 18 : 27; the doubled solar eccentricities the ancients actually used
  (Hipparchus 1/24, Copernicus 1/31, Tycho 0.0358) where a bare eccentric had to fit the
  equation of centre.
- The celestial pole and equinox of date (precession), so the equator, pole star and zodiac
  signs are correct for each epoch against a J2000 star catalogue.

**Legible layout** (default): geocentric deferent radii are a compressed layout (Moon 2.6 …
Saturn 31, stars 37); body sizes, the Moon's orbit, the satellites' orbits and the stellar
distance are enlarged or compressed for visibility. Ratios between the moons' orbits are true.

**As conceived** (`src/models/layouts.js`): each period's own figures in Earth radii —
Anaximander's 9 : 18 : 27; Aristarchus' Moon at 20 and Sun at 380; Plato's Timaeus proportions
for Eudoxus and Aristotle; Hipparchus' Moon at 62 and Sun at 2,490; Ptolemy's *Planetary
Hypotheses* nesting out to the stars at 20,000 with his body sizes (Sun 5.5, Moon 0.29,
Mercury 0.04); Copernicus' own distances with his 1,142-radius astronomical unit; Tycho's
1,150 and his star sphere at 14,000; Kepler's 3,469; Galileo's 1,208; Newton's 19,600; Encke's
23,400; and the modern 23,455, with body sizes implied by angular diameters at each era's unit.
Stars in the post-Tycho stages cannot be drawn at their measured distances and are placed
schematically, as the commentary states.

The tests in `tests/models.test.mjs` measure each model's geocentric planet directions against the
reference ephemeris: Kepler onward are exact; Copernicus and Tycho are within 1.5°; Ptolemy is
within 0.5° for Jupiter and Saturn, 2° for Venus, 5° for Mars at perihelic opposition (the
uniform epicycle ignores the Sun's own inequality, the error Kepler removed by bisecting the
Earth's eccentricity) and about 10° for Mercury; the concentric Hipparchan scheme errs by tens of
degrees for Mars, as it did. They also verify that the two layouts predict the same sky.

## Architecture

```
src/
  data/elements.js      J2000 mean elements (Mercury to Eris), Moon, Galilean moons, asteroids, Halley
  engine/
    motion.js           circle (eccentric, equant, crank), Kepler ellipse, Eudoxan hippopede,
                        apparent projection, guide curves
    time.js             Julian Day <-> calendar (Julian before 1582), precession, obliquity, pole of date
    cosmos.js           builds a layout (bodies, points, arms, guides, markers, spheres, shells, belts,
                        trails, Kepler solids, equal-area sectors) and animates it
    stars.js            star dome: catalogue, figures, names, shell, ecliptic, equator of date, signs
    camera.js           orbit/follow and from-the-Earth camera modes
    trails.js, textures.js, scene.js
  models/               one file per worldview exporting build(mode) (+ common.js builders, layouts.js figures)
  ui/                   top bar, timeline, controls, commentary, help
  app.js                wiring, time, flags, proportions, deep links, picking, keyboard, label culling
scripts/build-sky-data.mjs   compacts the d3-celestial datasets into public/data/sky.json
tests/                  motion library and model-fidelity tests
```

A model's `build(mode)` returns a list of nodes, each with a parent and a motion; positions are
accumulated down the hierarchy every frame. Adding a worldview means adding one data file and
listing it in `models/index.js`.

## Data and credits

Licence texts for bundled and derived works are in `THIRD_PARTY_NOTICES.md`.

- Stars to magnitude 6.5, constellation figures and names: the
  [d3-celestial](https://github.com/ofrohn/d3-celestial) datasets by Olaf Frohn (BSD-3-Clause),
  derived from the HYG database and the IAU constellation boundaries.
- Planetary elements: the JPL approximate Keplerian elements for J2000.
- Historical parameters: Ptolemy, *Almagest* and *Planetary Hypotheses*; Schiaparelli's
  reconstruction of Eudoxus; Swerdlow and Neugebauer on Copernicus and Ibn al-Shatir; Albert Van
  Helden, *Measuring the Universe* (1985), for the sizes and distances of each period.
- Thomas S. Kuhn, *The Copernican Revolution* (1957), chapter references in each stage.
