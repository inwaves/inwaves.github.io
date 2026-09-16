# Orbis — The changing heavens

An interactive 3D atlas of historical cosmologies, inspired by reading Thomas Kuhn’s _The Copernican Revolution_. Built with React, TypeScript, Three.js and Vite. All visual assets are procedural; no image service or API key is required.

## Website integration

This is the second astronomy app in `inwaves/inwaves.github.io`, served at **`/orbis/`**.
The existing implementation in `../heavens/` continues to be served at **`/space/`**.
The Conceptions of the Heavens article links to both; neither app replaces the other.

The Pages workflow builds this directory using the committed npm lockfile, then copies `dist/`
into the Zola output at `public/orbis/`. Vite uses a relative base, and the favicon and Orbis home
link stay within the app's mount point. Chapter links such as `/orbis/?era=galileo` survive reloads.
See the [repository README](../README.md#build-and-validate-the-complete-site) for the combined
build and validation commands. Do not commit generated `dist/` or Zola `public/` output.

## Run

Requires Node.js 22.12+ and npm.

```sh
npm ci
npm run dev
```

Open http://localhost:8080. The development server listens on port 8080. For production, `npm run build` creates a static `dist/` site; deploy that directory to any static host. `npm run preview` previews the build. The development host allowlist contains the iGent preview domain; add your own development hostname in `vite.config.ts` when needed.

## Experience

- Ten chronological chapters: Anaximander, Eudoxus, Aristotle, Hipparchus, Ptolemy, Copernicus, Tycho Brahe, Kepler (1609), Galileo (1610), and a Keplerian synthesis (1619).
- Distinct geometric models: fire wheels around a cylindrical Earth; coupled homocentric rotations; physical celestial shells; an eccentric solar circle; eccentric deferents, equants and epicycles; heliocentric compounded circles; a geostatic Sun carrying the planets; focus-centered ellipses governed by Kepler’s equation.
- Four Jovian moons only in 1610 and 1619. No Uranus, Neptune or anachronistic Saturnian ring system.
- Orbit, zoom, top-down, Earth-centered perspective, select and focus bodies, fullscreen, display layers, motion trails and a live apparent-longitude chart.
- Play/pause, six speeds, restart and a three-year seek range. Playback can continue beyond the seek range; the slider stays at its endpoint until you seek back to an absolute value from 0–1095 days.
- Source notes and historical reconstruction limits per chapter. Shareable chapter URLs using `?era=ptolemy` etc.
- Keyboard: Space plays/pauses, arrows change chapter, R resets the camera (when not editing a control). Native dialogs trap focus and close with Escape. Reduced-motion preference starts the simulation paused. Responsive layout and WebGL failure notice.

## Historical and mathematical scope

This is an **educational schematic, not an ephemeris or a historically exact reconstruction**. Do not use it to predict actual sky positions. Chapter dates mark proposals, publications or observations, not universal acceptance. This is one Greek-to-early-modern-European thread, not a universal history; Babylonian, Egyptian, Islamic, Indian, Chinese and other traditions are acknowledged in the guide but do not have separate simulated chapters.

- Eudoxus: representative compound rotations preserve constant Earth distance; not all 27 spheres or original parameters. Whether he understood them as physical is uncertain.
- Aristotle: representative physical shells, not all 55 interconnected spheres and unwinding mechanisms.
- Hipparchus: only the documented eccentric solar theory, with eccentricity 1/24. No speculative full planetary system.
- Ptolemy: epicycle centers follow a circle eccentric to Earth with uniform angle as seen from the equant. Individual parameters are illustrative; Mercury’s special construction, latitude mechanisms and lunar refinements are omitted.
- Copernicus: small illustrative secondary circles show his continued use of epicycles. Not his exact De revolutionibus geometry.
- Tycho: circular kinematic schematic; Sun orbits a fixed Earth, five planets follow the Sun, Moon follows Earth.
- Kepler: numerically solved Kepler equation respects focus geometry and the equal-area law. Modern approximate eccentricities and orbital periods demonstrate the laws. Display radii are compressed, so the distance ratios on screen do not satisfy the third law.
- Galileo: four moons on enlarged local orbits over a **circular heliocentric scaffold**. It is an observational chapter, not a claim that Galileo formulated a new geometric system or used Kepler’s ellipses. Jupiter’s satellites did not distinguish the Copernican and Tychonic systems. The modern moon names are for orientation, not presented as Galileo’s names.
- The 1619 chapter is explicitly a retrospective synthesis of the third law and already-known observations.
- Daily rotation is factored out. Earth view looks from Earth’s center; it is not a horizon-based planetarium and has no observing location, atmosphere, real star catalog, telescope optics or observation date. Venus’s phases are discussed but not an observational phase simulator.
- Body sizes, colors, textures, initial phases and star placement are symbolic; orbit distances are compressed. Anaximander’s visible fire wheels are a cutaway reconstruction. Sources support historical topology, not exact numerical parameters.

## Sources

Each chapter links its references inside the application. Data and citations live in `src/history.ts`.

- [Dirk Couprie, Anaximander — Internet Encyclopedia of Philosophy](https://iep.utm.edu/anaximander/#H6)
- [Astronomical systems — Museo Galileo](https://catalogue.museogalileo.it/indepth/AstronomicalSystems.html)
- [Almagest III.4 — Henry Mendell, Cal State LA](https://web.calstatela.edu/faculty/hmendel/Ancient%20Mathematics/Astronomy/Ptolemy/Sun/Eccenter/Ptol.Alm.iii.4.html)
- [Ptolemaic epicycle machine — Harvard](https://sciencedemonstrations.fas.harvard.edu/presentations/ptolemaic-epicycle-machine)
- [Orbits and Kepler’s laws — NASA](https://science.nasa.gov/solar-system/orbits-and-keplers-laws/)
- [Satellites of Jupiter — Albert Van Helden, Rice](https://galileo.library.rice.edu/sci/observations/jupiter_satellites.html)

## Validation

```sh
npm test                   # Complete deterministic geometry and history suite
npm run build              # Strict TypeScript check and production bundle
npx playwright install --with-deps chromium
npm run test:e2e           # Full browser suite, desktop and mobile
npm run check              # All of the above (browser must be installed first)
npm run test:site          # Full browser suite at /orbis/ plus both article links; requires assembled ../public/
```

The browser installation command installs Linux system libraries as well as Chromium (sudo may be needed). Stop any server on port 8080 before testing: the suites launch their own servers rather than accidentally testing another app. The standalone suite uses Vite; `test:site` uses Python 3 to serve the assembled website and reruns every interaction at `/orbis/`, including a regression for the favicon and home link. It also follows the article links to both implementations and checks the blog homepage. Software WebGL is enabled for headless Chromium. Test output is ignored by version control. No backend, telemetry, accounts or secrets.

## Structure

- `src/history.ts` — sourced narrative, dates, discovery boundaries.
- `src/model.ts` — deterministic geometry, body positions, orbits and observed longitudes.
- `src/Scene.tsx` — Three.js rendering, picking, camera controls, label projection and resource cleanup.
- `src/App.tsx` — accessible controls, timeline, chapter narratives and dialogs.
- `src/styles.css` — responsive editorial visual design.
- `src/model.test.ts`, `tests/explorer.spec.ts` — mathematical and browser regression tests.

Google Fonts supplies DM Sans and Libre Caslon Display; local sans-serif and Georgia fallbacks work if offline. Planet textures and the Orbis mark are generated locally.
