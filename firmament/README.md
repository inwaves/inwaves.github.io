# Firmament

An interactive 3D progression through humanity's models of the cosmos, from
Anaximander's wheels of fire to Newton's universal gravitation. Each worldview is
built as its author conceived it, with its own machinery and its own kinematics,
and can be watched from outside or from the Earth, where the machinery's whole
purpose becomes visible: the looping, backtracking paths of the planets across
the real sky.

It was made to answer a reader's question while working through Thomas Kuhn's
*The Copernican Revolution*: what did these people actually picture?

## Website integration

This is one of the astronomy apps in `inwaves/inwaves.github.io`, served at **`/firmament/`**.
It is independent of the others, which are all answers to the same prompt, quoted in the
*Conceptions of the Heavens* article: the original in `../heavens/`, served at `/space/`; Orbis in
`../orbis/`, served at `/orbis/`; and Cosmographia in `../cosmographia/`, served at
`/cosmographia/`. A dated addendum in the article links here. No app replaces another.

The Pages workflow builds this directory from the committed lockfile
(`npm ci && npm test && npm run build`), copies `dist/` into the Zola output at
`public/firmament/`, and then runs `npm run test:site` against the assembled site. Vite uses a
relative base, so the same build works at the root of its own preview server and under
`/firmament/`. Links such as `/firmament/#era=galileo&view=sky&body=jupiter` survive reloads,
because the state lives in the URL fragment. See the
[repository README](../README.md#build-and-validate-the-complete-site) for the combined build.
Do not commit `dist/` or Zola's `public/`.

## Running it

Requires Node 22 or later.

```sh
npm install
npm run dev        # http://localhost:8080
```

Other scripts:

| Script | Purpose |
|---|---|
| `npm run build` | Production build into `dist/` |
| `npm run preview` | Serve the production build on port 8080 |
| `npm test` | Run the test suite once |
| `npm run test:e2e` | Drive the running application through a real browser; see Tests |
| `npm run test:site` | Check the application inside the assembled site; see Tests |
| `npm run dev:poll` | Dev server that polls for file changes; see below |
| `npm run build:stars` | Regenerate the star catalogue from its pinned upstream revision |

### If your edits do not show up in the browser

Some filesystems deliver no change events: network shares, some containers, and
FUSE mounts. On those the dev server never learns that a file changed and keeps
serving its cached copy of the old module, even across a full page reload, with
no error anywhere. The telltale sign is an edit that passes `npm run build` and
`npm test`, both of which read from disk, yet does not appear in the browser.
Use `npm run dev:poll` (or set `FIRMAMENT_POLL=1`), which polls instead. It costs
some CPU, so it is not the default.

The dev server accepts requests for `localhost` and for the preview domains listed in
`vite.config.js`. Add your own development hostname there if you reach it another way.

## Using it

**Two viewpoints.** *The cosmos* stands outside and shows the machinery a
worldview posits: deferents, epicycles, nested spheres, ellipses. *The sky from
Earth* stands where an observer stood and shows what that machinery was built to
reproduce. They are the same model at the same instant.

**From Anaximander's drum** the view is from the ground. The flat face of the
Earth lies across the foot of the picture, and keeping a body in view follows it
along the horizon, holding the ground in the picture for as long as both fit and
the body's whole disc in the frame for as long as it fits, centring it once it
no longer can. His wheels of fire arch overhead, because in his cosmos they are
physical things: rims of mist, with the Sun and Moon as holes in them. No other
worldview's machinery is drawn in the sky from the Earth, since nobody ever saw a
deferent.

**The timeline** across the top steps through the ten worldviews. Changing
worldview jumps to a date that suits it, unless *Lock date when changing
worldview* is ticked, which lets two models be compared on the same night.

**Selecting a body**, by clicking it or its name, brings its own machinery
forward and dims the rest, names the parts in a legend, and shows where it stands
as seen from the Earth: longitude, latitude, distance from the Sun in the sky,
and whether it is moving **direct** or **retrograde**. Selection does not move
the camera. *Zoom to* frames the body's own machinery and rides along with it;
*Whole cosmos* returns.

**Time** runs from one hour to two years per second, forwards or backwards, and
can be paused and stepped. Trails are laid down behind each body as soon as a
worldview loads, so retrograde loops are visible at once.

**Show** toggles: the machinery; the extent of each body's shell (or Aristotle's
solid shells, cut away); trails; names; constellation figures; the ecliptic and
equator; the line of sight from the Earth to the selected body, with the path it
traces on the sky; and the daily rotation, of the heavens or of the Earth
according to the worldview. Above 0.3 days per second the daily rotation only
flickers, so it is held still.

**Point a telescope at it anyway** is a deliberate anachronism, offered in every
era before 1610. It lights the planets from the Sun so that they show phases,
which lets you see for yourself that Ptolemy's Venus can only ever be a crescent.

### Keyboard

| Key | Action |
|---|---|
| Space | Play or pause |
| `[` and `]` | Earlier or later worldview |
| `v` | Switch viewpoint |
| Escape | Deselect |

### Linking to a configuration

The URL fragment presets the state, so any view can be linked or bookmarked:

```
#era=ptolemy&view=sky&body=mars&paused=1
```

| Parameter | Meaning |
|---|---|
| `era` | `anaximander`, `eudoxus`, `aristotle`, `hipparchus`, `ptolemy`, `copernicus`, `tycho`, `kepler`, `galileo`, `newton` |
| `view` | `cosmos` or `sky` |
| `body` | A body to select, such as `mars`, `moon`, `io`, `comet` |
| `jd` | Julian day to start from |
| `speed` | Simulated days per second |
| `paused` | `1` to start paused |
| `zoom` | `1` to frame the selected body's machinery |
| `fov` | Field of view in degrees, for the sky view; small values magnify |
| `cam` | `distance,azimuth,elevation` for the outside camera, in scene units and degrees |
| `on`, `off` | Comma-separated toggles: `machinery`, `shells`, `trails`, `labels`, `constellations`, `circles`, `diurnal`, `lineOfSight`, `anachronisticTelescope`, `track` |
| `panels` | `0` to hide every control and show the picture alone |

## The ten worldviews

| Worldview | Date | What is modelled |
|---|---|---|
| Anaximander | c. 550 BCE | A drum-shaped Earth, three times as wide as it is deep, inside slanting wheels of fire at 9, 18 and 27 Earth diameters: stars nearest, then Moon, then Sun. The Sun's wheel slides along the axis through the year; the Moon's vent opens and closes. No planets. Viewed from the observer's own horizon. |
| Eudoxus | c. 370 BCE | 27 homocentric spheres. Each planet's inner pair traces a hippopede, which produces retrograde motion. Shows its failures too: Venus never retrogrades, Mars does so three times too often, and no body can change its distance. |
| Aristotle | c. 340 BCE | The same motions made physical: solid shells with no void, the sublunary elements, and 17 of his 22 counteracting spheres drawn on their true axes. They cancel motion and change no appearance, which is their purpose. |
| Apollonius and Hipparchus | c. 200-130 BCE | Plain epicycles on Earth-centred deferents, with Hipparchus's own eccentric Sun, which reproduces the unequal seasons he measured. |
| Ptolemy | c. 150 CE | The Almagest: eccentric deferents, epicycles and the equant; the crank mechanisms for Mercury and the Moon; all nested at the distances of the *Planetary Hypotheses*, with the stars some twenty thousand Earth radii away. |
| Copernicus | 1543 | The Sun at rest. Uniform circles only, so each planet rides an eccentric circle and a small epicyclet in place of the equant. Orbit radii are his own. |
| Tycho Brahe | 1588 | The Copernican arrangement re-expressed about a stationary Earth. Every direction and distance seen from the Earth is identical; the orbit of Mars cuts the orbit of the Sun; the stars lie just beyond Saturn. |
| Kepler | 1609 | Ellipses with the Sun at a focus, swept by the area law. Selecting a planet shows the sector swept in equal time, and the empty focus. |
| Galileo | 1610 | Copernican circles, which Galileo never gave up, seen for the first time through a telescope. |
| Newton | 1687 | Kepler's ellipses as consequences of one law, with Saturn's ring, Titan, and the comet of 1682 on its long ellipse. |

### What each era is allowed to know

Discoveries appear when they were made and are never taken back.

| | Before 1610 | Galileo, 1610 | Newton, 1687 |
|---|---|---|---|
| Planets | Points of light | Globes lit by the Sun, showing phases | The same |
| Moons of Jupiter | None | Four | Four |
| The Moon | Smooth | Mountains and craters | The same |
| Saturn | A point | Two unexplained companions | A flat ring, and Titan |
| Stars | To magnitude 5 | To magnitude 6 | To magnitude 6 |
| Comet | None | None | The comet of 1682 |

One light sits at the Sun in every era. Phases are never painted on: each
arrangement of the cosmos produces the phases it implies, which is what makes
Ptolemy's Venus differ observably from Copernicus's.

## How faithful it is

Every numerical parameter, where it came from, and whether it is **sourced**,
a modern **reconstruction**, or merely **illustrative**, is set out in
[`docs/SOURCES.md`](docs/SOURCES.md), which also ships with every build as
`SOURCES.txt`. Each worldview carries a short note on screen, under *How faithful
is this picture?*, with a link to it. In brief:

- **Ptolemy** uses the Almagest's own constants, kept in their original
  sexagesimal digits, and the construction is checked against an independent
  implementation to eight decimal places of a degree.
- **Copernicus, Tycho, Kepler, Galileo and Newton** share one set of modern mean
  motions (NASA JPL), so that what differs on screen is the geometry each
  astronomer assumed and not differently fitted tables.
- **Eudoxus's** sphere inclinations survive nowhere; Saturn and Jupiter follow
  Schiaparelli's reconstruction, and Mars uses his conjectured period.
- The **stars** are a real catalogue, in the frame of J2000. Ancient longitudes
  are carried into that frame by the modern rate of precession so that every era
  can be compared against the same sky. That is not what Ptolemy believed, and
  his own slower rate is kept inside his model, where it moves the apogees.
- **No forces are computed.** Bodies follow closed-form paths. The comet is
  anchored at its perihelion of 15 September 1682 and, with no planets to pull
  on it, returns in September 1758, the year Halley named, and not in March
  1759, when the real comet arrived, held back by Jupiter and Saturn.

## How it is built

Plain JavaScript modules, [three.js](https://threejs.org) for rendering and
[Vite](https://vite.dev) for the build. No framework.

```
src/
  core/     Angles, vectors, calendar and Julian days, precession, sky frames
  data/     Almagest constants, JPL elements, the eras, the star catalogue
  models/   One kinematic model per family of worldviews
  render/   three.js: stars, bodies, machinery, trails, labels, camera framing
  ui/       State, the animation loop, and the interface
docs/       SOURCES.md: the provenance of every parameter
scripts/    build-stars.mjs: regenerates the catalogue
tests/      Unit tests, run in Node
e2e/        interaction.mjs: real input through a headless browser
            site.mjs: the application inside the assembled site
THIRD_PARTY_NOTICES.md   Licences of what the build bundles
```

`vite.config.js` emits `THIRD_PARTY_NOTICES.md` and `docs/SOURCES.md` into the build as
`.txt` files, which a browser shows instead of downloading, and serves them at the same
addresses in development. The interface links to both.

The **models are pure**. Given a Julian day, a model returns where each body is
and a plain description of its machinery (circles, lines, points, shells). It
knows nothing of three.js, so the kinematics of every worldview are tested in
Node. Four families cover the ten eras: Anaximander's wheels; the homocentric
spheres (Eudoxus, Aristotle); the Ptolemaic construction (Hipparchus with the
equant and eccentrics off, Ptolemy with them on); and the heliocentric one
(circles or ellipses, about the Sun or, for Tycho, about the Earth).

**Discovery gating lives in the era**, not the renderer. An era's features say
what a viewer of that time could know, and a test builds every era's model and
checks that the bodies it produces match what the era declares.

**Rendering policy that matters is kept pure too**, so it can be tested without
a WebGL context: resolving overlapping labels, bounding a sky trail by the angle
it sweeps so that it cannot lap the sky and print over itself, fitting the camera
to the shape of the viewport, deciding when a resize may re-frame the view
without overriding a camera the user has moved, aiming the view from the ground
so that a tracked body and the horizon both stay in the frame, and drawing
Anaximander's Sun and Moon after the mist of their wheels, since a vent is a hole
in the mist and must not be veiled by it.

## Tests

```sh
npm test
```

The suite tests the models against things they were never tuned to: Hipparchus's
season lengths, the Moon's known range of distance in Ptolemy's model, Mars's
close opposition of August 2003, the Jupiter-Saturn conjunction of December 2020,
Kepler's three laws, and the exact agreement of Tycho's appearances with
Copernicus's. It also pins the historical failures, since a model that stopped
failing in the right way would be wrong: Eudoxus's Venus must never retrograde.

Where the documentation states a figure that depends on the code, such as the
date the comet returns, a test pins it, so the two cannot drift apart unnoticed.

Most of the three.js layer needs a WebGL context and is not unit-tested. What
can run without one is: which machinery is drawn from which viewpoint, and the
order in which mist and vents are drawn. The rest was checked by eye, era by
era, and by the end-to-end script below.

### Through a real browser

```sh
npx playwright install chromium     # once
npm run dev                         # in another terminal
npm run test:e2e
```

`e2e/interaction.mjs` sends real wheel, drag, click, keyboard and resize input
to the running application through headless Chromium, and reads the outcome
from the page and from its pixels: that the wheel magnifies the sky until
Jupiter's moons separate from it, that a click selects without moving the
camera, that turning a window upright re-frames the cosmos unless the user has
moved the camera, that the ground is in the picture from Anaximander's drum and
stays there while the Sun is tracked and magnified, and that his Sun is a clear
disc and not one veiled by its own wheel. Where a position is expected, such as
the row the horizon should fall on, it is computed from the same pure modules
the unit tests cover, so the picture is checked against the policy itself. It
is kept out of `npm test` because it needs a browser and a running server.
`BASE` overrides the address, and `SHOTS` names a directory for screenshots. To
run it against the published layout, serve the assembled site and point it at the
mount: `BASE=http://127.0.0.1:8080/firmament npm run test:e2e`. It is not run in
CI: it reads pixels and timings, and a check of that kind does not belong in the
path that deploys the site.

### In the assembled site

```sh
npm run test:site          # after the site has been assembled into ../public
```

`e2e/site.mjs` is what CI runs after assembling the site. It serves `../public`
(or `SITE`) itself, on a port the system picks, so it cannot collide with another
server, and always stops that server. It checks that the notices and the
provenance notes are in the build; that the article's addendum is there with its
figure, and that its link opens the application on Ptolemy with Mars selected;
that every worldview loads from its own link and draws a picture, from outside
and from the Earth, with no console errors, page errors or failed requests; and
that discoveries are gated in the published build, era by era, against what
`src/data/eras.js` declares. It is deterministic: everything is paused, and the
only pixel test is whether anything was drawn at all.

## Data and licences

- Licence texts for everything the build bundles are in `THIRD_PARTY_NOTICES.md`,
  which ships with the build and is linked from the interface.
- Star positions, magnitudes, colours and constellation figures are derived from
  [d3-celestial](https://github.com/ofrohn/d3-celestial) by Olaf Frohn, under the
  BSD 3-Clause licence, reproduced in `src/data/LICENSE-d3-celestial.txt`. Its
  readme gives the stars' source as *XHIP: An Extended Hipparcos Compilation*.
  The generating script fetches a pinned commit and stamps it into the output.
- Planetary elements are from NASA JPL, *Approximate Positions of the Planets*.
- Almagest constants were read from R. H. van Gent's *Almagest Ephemeris
  Calculator* (Utrecht University).
- The textures are procedural; the application ships no image assets.
