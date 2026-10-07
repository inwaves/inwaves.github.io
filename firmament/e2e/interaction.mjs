/**
 * End-to-end checks of the three.js glue, through a real browser.
 *
 * The unit tests cover the models and the rendering policy, which are pure. What
 * they cannot reach is whether the policy is wired to the picture: whether a wheel
 * event magnifies, whether a resize re-frames, whether the ground is actually on
 * screen. This script sends real input to a running server through headless
 * Chromium and reads the outcome from the DOM and from pixels. Where a position is
 * expected, it is computed from the project's own pure modules, so the picture is
 * checked against the policy and not against a number copied from it.
 *
 * It is not part of `npm test`: it needs a browser and a running server.
 *
 *   npx playwright install chromium     (once)
 *   npm run dev                         (in another terminal; dev:poll where needed)
 *   npm run test:e2e
 *
 * BASE overrides the address (default http://localhost:8080). SHOTS names a
 * directory to write screenshots into; without it none are written. To check the
 * published layout, serve the assembled site and name the mount, without a
 * trailing slash: BASE=http://127.0.0.1:8080/firmament
 *
 * Body names are HTML laid over the canvas, which is what makes this possible: a
 * name's box says where its body is on screen, and its left padding, which the
 * application sets so as to clear the body's limb, says how large the body is drawn.
 */
import { mkdirSync } from 'node:fs';
import { chromium } from 'playwright';
import { PerspectiveCamera } from 'three';
import { BODIES, getEra } from '../src/data/eras.js';
import { ventBrightness } from '../src/render/drawOrder.js';
import { toThree } from '../src/render/frame.js';
import { COSMOS_FOV, FRAME_UNITS, TRACKING_REACH, cosmosDistance, preferredAltitude } from '../src/render/framing.js';

const BASE = process.env.BASE ?? 'http://localhost:8080';
const SHOTS = process.env.SHOTS ?? null;
const WIDE = { width: 1280, height: 720 };
const UPRIGHT = { width: 414, height: 896 };
/** LABEL_GAP in render/bodies.js: the space between a body's limb and its name, CSS pixels. */
const LABEL_GAP = 6;
const MOONS = ['Io', 'Europa', 'Ganymede', 'Callisto'];

const results = [];
const problems = [];
function record(name, pass, detail) {
  results.push({ name, pass });
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}\n      ${detail}`);
}
const rad = (deg) => (deg * Math.PI) / 180;
const deg = (r) => (r * 180) / Math.PI;
const apart = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const at = (l) => (l ? `${l.x.toFixed(0)},${l.y.toFixed(0)}` : 'not in the frame');
const inFrame = (l, viewport = WIDE) => Boolean(l) && l.x > 0 && l.x < viewport.width && l.y > 0 && l.y < viewport.height;

if (SHOTS) mkdirSync(SHOTS, { recursive: true });

// Software rendering, so that the run does not depend on the machine's GPU.
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl'] });

async function open(fragment, viewport = WIDE) {
  const context = await browser.newContext({ viewport, deviceScaleFactor: 1 });
  // Decodes a PNG into pixels inside the page, where a canvas is to hand.
  await context.addInitScript(() => {
    window.__pixels = async (b64) => {
      const img = new Image();
      img.src = `data:image/png;base64,${b64}`;
      await img.decode();
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);
      return { data: ctx.getImageData(0, 0, canvas.width, canvas.height).data, width: canvas.width, height: canvas.height };
    };
  });
  const page = await context.newPage();
  page.on('pageerror', (e) => problems.push(`pageerror: ${e.message}`));
  page.on('console', (m) => {
    if (m.type() === 'error') problems.push(`console.error: ${m.text()}`);
  });
  await page.goto(`${BASE}/#${fragment}`);
  await page.waitForSelector('.body-label', { state: 'attached', timeout: 30000 });
  // Many frames, not two: a fault on the frame after arrival must have had time to show.
  await page.waitForTimeout(2500);
  const fatal = await page.evaluate(() => {
    const node = document.getElementById('fatal');
    return node && !node.hidden ? node.textContent : null;
  });
  if (fatal) throw new Error(`the application refused to start: ${fatal}`);
  return { page, context };
}

async function shot(page, name, clip) {
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/${name}.png`, ...(clip ? { clip } : {}) });
}

/** Every body name now shown: where it sits, the gap that tracks its disc's size, and whether it is selected. */
const labels = (page) =>
  page.evaluate(() =>
    Object.fromEntries(
      [...document.querySelectorAll('.body-label')]
        .filter((el) => el.style.display !== 'none')
        .map((el) => {
          const r = el.getBoundingClientRect();
          return [el.textContent, { x: r.left, y: r.top + r.height / 2, gap: parseFloat(el.style.paddingLeft) || 0, selected: el.classList.contains('selected') }];
        }),
    ),
  );

async function wheel(page, deltaY, times, pause = 250) {
  for (let i = 0; i < times; i += 1) {
    await page.mouse.wheel(0, deltaY);
    await page.waitForTimeout(pause);
  }
  await page.waitForTimeout(800);
}

// --------------------------------------------------------------- reading pixels

/** Mean luminance of each row of a 20-pixel-wide column of the picture, centred on x. */
async function columnLuminance(page, x) {
  const png = await page.screenshot({ clip: { x: x - 10, y: 0, width: 20, height: WIDE.height } });
  return page.evaluate(async (b64) => {
    const { data, width, height } = await window.__pixels(b64);
    const rows = [];
    for (let y = 0; y < height; y += 1) {
      let sum = 0;
      for (let px = 0; px < width; px += 1) {
        const i = (y * width + px) * 4;
        sum += 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
      }
      rows.push(sum / width);
    }
    return rows;
  }, png.toString('base64'));
}

const mean = (values) => values.reduce((sum, v) => sum + v, 0) / values.length;

/** The ground on one column: how bright the foot and the head of the picture are, and the row of the ground's upper edge. */
async function ground(page, x) {
  const rows = await columnLuminance(page, x);
  const bottom = mean(rows.slice(-30));
  const top = mean(rows.slice(0, 30));
  const threshold = Math.max(12, bottom * 0.5);
  let edge = null;
  for (let y = rows.length - 1; y >= 0; y -= 1) {
    if (rows[y] < threshold) {
      edge = y;
      break;
    }
  }
  return { bottom, top, edge };
}

/** How many pixels differ between two pages showing the same instant. */
async function differing(pageA, pageB) {
  const [a, b] = await Promise.all([pageA.screenshot(), pageB.screenshot()]);
  return pageA.evaluate(
    async ([x, y]) => {
      const p = (await window.__pixels(x)).data;
      const q = (await window.__pixels(y)).data;
      let count = 0;
      for (let i = 0; i < p.length; i += 4) {
        if (Math.abs(p[i] - q[i]) > 24 || Math.abs(p[i + 1] - q[i + 1]) > 24 || Math.abs(p[i + 2] - q[i + 2]) > 24) count += 1;
      }
      return count;
    },
    [a.toString('base64'), b.toString('base64')],
  );
}

/** The shades inside three quarters of a disc's radius, coarsened to steps of 8, commonest first. */
async function discShades(page, centre, radius) {
  const png = await page.screenshot();
  return page.evaluate(
    async ([b64, cx, cy, r]) => {
      const { data, width, height } = await window.__pixels(b64);
      const tally = new Map();
      let total = 0;
      for (let y = Math.ceil(cy - r); y <= cy + r; y += 1) {
        for (let x = Math.ceil(cx - r); x <= cx + r; x += 1) {
          if (x < 0 || y < 0 || x >= width || y >= height || Math.hypot(x - cx, y - cy) > r) continue;
          const i = (y * width + x) * 4;
          const key = [data[i], data[i + 1], data[i + 2]].map((v) => Math.round(v / 8) * 8).join(',');
          tally.set(key, (tally.get(key) ?? 0) + 1);
          total += 1;
        }
      }
      return [...tally].map(([key, n]) => [key, n / total]).sort((m, n) => n[1] - m[1]).slice(0, 5);
    },
    [png.toString('base64'), centre.x, centre.y, radius * 0.75],
  );
}

// -------------------------------------------------- what the pure modules expect

const drum = getEra('anaximander').createModel();

/** A body as the viewer on the drum sees it. The viewer stands on its face, not at its centre. */
function fromTheDrum(jd, id) {
  const { bodies } = drum.state(jd, { guides: false });
  const o = drum.observer(jd);
  const v = [bodies[id].pos[0] - o[0], bodies[id].pos[1] - o[1], bodies[id].pos[2] - o[2]];
  return { altitude: deg(Math.asin(v[2] / Math.hypot(...v))), aperture: bodies[id].aperture };
}

/** The row on which altitude `alt` falls, on the central column of a view aimed `aim` degrees up. */
const rowOf = (alt, aim, fov) => WIDE.height / 2 - ((WIDE.height / 2) * Math.tan(rad(alt - aim))) / Math.tan(rad(fov / 2));

const JD_DEFAULT = getEra('anaximander').defaultJd;

/** The same morning, earlier: the moment the Sun, seen from the drum, climbs through four degrees. */
function sunFourDegreesUp() {
  const step = 1 / 2880;
  for (let t = JD_DEFAULT - 0.4; t < JD_DEFAULT; t += step) {
    if (fromTheDrum(t, 'sun').altitude >= 4 && fromTheDrum(t - step, 'sun').altitude < 4) return t;
  }
  return null;
}

/** A night soon after, with the Moon's vent nearly full open and the Moon well up. */
function fullMoonWellUp() {
  for (let t = JD_DEFAULT; t < JD_DEFAULT + 30; t += 1 / 96) {
    const moon = fromTheDrum(t, 'moon');
    if (moon.aperture > 0.9 && moon.altitude > 20 && moon.altitude < 40 && fromTheDrum(t, 'sun').altitude < -10) return t;
  }
  return null;
}

// ------------------------------------------------------------------- the wheel

async function wheelMagnifiesTheSky() {
  const { page, context } = await open('era=galileo&view=sky&body=jupiter&paused=1&panels=0');
  const before = await labels(page);
  await page.mouse.move(640, 200);
  await wheel(page, -600, 6);
  const zoomed = await labels(page);
  const moons = MOONS.filter((m) => zoomed[m]);
  record('the wheel magnifies the sky view, as a telescope does', (zoomed.Jupiter?.gap ?? 0) > (before.Jupiter?.gap ?? 0) + 3, `Jupiter's disc gap ${before.Jupiter?.gap}px -> ${zoomed.Jupiter?.gap}px`);
  record('magnified, the moons of Jupiter come out of its glare', moons.length >= 2, `moons named before: [${MOONS.filter((m) => before[m])}]; after: [${moons}]`);
  await wheel(page, 600, 6);
  const back = await labels(page);
  record('and the wheel widens the view again', Math.abs((back.Jupiter?.gap ?? 0) - (before.Jupiter?.gap ?? 0)) <= 2, `gap back to ${back.Jupiter?.gap}px (started at ${before.Jupiter?.gap}px)`);
  await context.close();
}

async function wheelZoomsTheCosmos() {
  const { page, context } = await open('era=kepler&paused=1&panels=0');
  const before = await labels(page);
  await page.mouse.move(640, 200);
  await wheel(page, -400, 3, 300);
  const after = await labels(page);
  const d0 = apart(before.Sun, before.Jupiter);
  const d1 = after.Jupiter ? apart(after.Sun, after.Jupiter) : Infinity;
  record('the wheel zooms the cosmos view', d1 > d0 * 1.15, `Sun to Jupiter ${d0.toFixed(0)}px -> ${Number.isFinite(d1) ? `${d1.toFixed(0)}px` : 'Jupiter left the frame'}`);
  await context.close();
}

// ---------------------------------------------------------------- drag and click

async function draggingTurnsTheSky() {
  const { page, context } = await open('era=galileo&view=sky&body=jupiter&paused=1&panels=0');
  const before = await labels(page);
  await page.mouse.move(640, 300);
  await page.mouse.down();
  for (let x = 660; x <= 840; x += 20) {
    await page.mouse.move(x, 300);
    await page.waitForTimeout(40);
  }
  await page.mouse.up();
  await page.waitForTimeout(900);
  const after = await labels(page);
  const shift = (after.Jupiter?.x ?? NaN) - before.Jupiter.x;
  // Tracking is on when the drag begins. If the drag did not switch it off, the view would spring back.
  record('dragging pulls the sky round, and it stays where it was put', shift > 120 && shift < 280, `dragged 200px to the right; Jupiter moved ${shift.toFixed(0)}px`);
  await context.close();
}

async function clickingSelects() {
  const { page, context } = await open('era=kepler&paused=1&panels=0');
  const before = await labels(page);
  await page.mouse.click(before.Saturn.x, before.Saturn.y);
  await page.waitForTimeout(900);
  const after = await labels(page);
  const selected = Object.entries(after).filter(([, l]) => l.selected).map(([name]) => name);
  record('clicking a planet in the picture selects it', selected.length === 1 && selected[0] === 'Saturn', `selected: [${selected}]`);
  record('and selecting does not move the camera', apart(before.Sun, after.Sun) < 4, `the Sun moved ${apart(before.Sun, after.Sun).toFixed(1)}px on screen`);
  await context.close();
}

async function timeHoldsAndRuns() {
  const { page, context } = await open('era=kepler&paused=1');
  const date = () => page.evaluate(() => document.querySelector('#transport .date')?.textContent ?? '');
  const p0 = await date();
  await page.waitForTimeout(1200);
  const p1 = await date();
  await page.keyboard.press('Space');
  await page.waitForTimeout(1500);
  const running = await date();
  await page.keyboard.press('Space');
  await page.waitForTimeout(300);
  const s0 = await date();
  await page.waitForTimeout(1200);
  const s1 = await date();
  record('time holds while paused, runs while playing, and holds again', p0 === p1 && running !== p1 && s0 === s1, `paused "${p0}" = "${p1}"; playing -> "${running}"; paused again "${s0}" = "${s1}"`);
  await context.close();
}

// ---------------------------------------------------- the shape of the viewport

async function fitsAnUprightPhone() {
  const { page, context } = await open('era=ptolemy&paused=1&panels=0', UPRIGHT);
  const l = await labels(page);
  const outer = ['Saturn', 'Jupiter', 'Mars'];
  const inside = outer.filter((name) => inFrame(l[name], UPRIGHT));
  record('the whole cosmos fits an upright phone at load', inside.length === 3, `inside the ${UPRIGHT.width}px-wide frame: [${inside}]  ${outer.map((name) => `${name} at ${at(l[name])}`).join('; ')}`);
  await context.close();
}

// The separation of two bodies on screen changes by one factor if a resize re-framed
// the cosmos and by quite another if it left the camera alone. Both are computed
// here by projecting the real bodies through a real camera, placed as the stage
// places it. The obvious shortcut, viewport height over camera distance, is right
// for a camera left alone (x1.24) but not for one that backs away: bodies well off
// the centre of a perspective view close up faster than that, x0.49 where the
// shortcut says x0.55. An earlier version of this check used the shortcut and so
// could only ask which factor the measurement was nearer to.
const ptolemy = getEra('ptolemy');
const ptolemyModel = ptolemy.createModel();
const ptolemyScale = FRAME_UNITS / ptolemyModel.frameRadius;
const ptolemyBodies = ptolemyModel.state(ptolemy.defaultJd, { guides: false }).bodies;

/** Where the stage's default camera, at `distance`, puts Saturn and Jupiter in a viewport, and how far apart. */
function saturnToJupiter(viewport, distance) {
  const view = ptolemyModel.defaultView ?? { azimuth: 0, elevation: 31 };
  const az = rad(view.azimuth);
  const el = rad(view.elevation);
  const camera = new PerspectiveCamera(COSMOS_FOV, viewport.width / viewport.height, 1e-5, 1e7);
  camera.position.set(Math.sin(az) * Math.cos(el), Math.sin(el), Math.cos(az) * Math.cos(el)).multiplyScalar(distance);
  camera.lookAt(0, 0, 0);
  camera.updateMatrixWorld(true);
  const onScreen = (id) => {
    const p = toThree(ptolemyBodies[id].pos, ptolemyScale).project(camera);
    return { x: ((p.x + 1) / 2) * viewport.width, y: ((1 - p.y) / 2) * viewport.height };
  };
  return apart(onScreen('saturn'), onScreen('jupiter'));
}

const ptolemyMustSee = (ptolemyModel.fitHalfWidth ?? ptolemyModel.frameRadius) * ptolemyScale;
const D_WIDE = cosmosDistance(ptolemyMustSee, WIDE.width / WIDE.height);
const D_UPRIGHT = cosmosDistance(ptolemyMustSee, UPRIGHT.width / UPRIGHT.height);
const IF_REFRAMED = saturnToJupiter(UPRIGHT, D_UPRIGHT) / saturnToJupiter(WIDE, D_WIDE);
const IF_LEFT_ALONE = saturnToJupiter(UPRIGHT, D_WIDE) / saturnToJupiter(WIDE, D_WIDE);
/** A short drag turns the camera a few degrees before the resize, so the match is close and not exact. */
const RESIZE_TOLERANCE = 0.05;

async function resizing(name, gesture, expectReframe) {
  const { page, context } = await open('era=ptolemy&paused=1&panels=0');
  await gesture(page);
  await page.waitForTimeout(600);
  const before = await labels(page);
  await page.setViewportSize(UPRIGHT);
  await page.waitForTimeout(1500);
  const after = await labels(page);
  const measurable = ['Saturn', 'Jupiter'].every((n) => before[n] && after[n]);
  const ratio = measurable ? apart(after.Saturn, after.Jupiter) / apart(before.Saturn, before.Jupiter) : NaN;
  const want = expectReframe ? IF_REFRAMED : IF_LEFT_ALONE;
  record(name, measurable && Math.abs(ratio / want - 1) < RESIZE_TOLERANCE, `Saturn to Jupiter changed by x${measurable ? ratio.toFixed(3) : 'n/a'}; projected through the same camera, re-framed is x${IF_REFRAMED.toFixed(3)} and left alone is x${IF_LEFT_ALONE.toFixed(3)}; expected x${want.toFixed(3)} within ${RESIZE_TOLERANCE * 100}%`);
  await context.close();
}

// --------------------------------------------------------- the view from the drum

async function theGroundIsThere() {
  const arrival = await open('era=anaximander&view=sky&paused=1&panels=0');
  await shot(arrival.page, 'drum_arrival');
  const g = await ground(arrival.page, 200);
  const l = await labels(arrival.page);
  record('arriving on the drum, the ground is in the picture with the sky above it', g.bottom > 30 && g.top < 25, `foot of the picture luminance ${g.bottom.toFixed(0)}, head ${g.top.toFixed(0)} (bare sky is about 5)`);
  record('and so is the Sun', inFrame(l.Sun), `Sun at ${at(l.Sun)}`);
  await arrival.context.close();

  // The fault this guards against showed only on the second frame: arrival kept
  // the ground, and tracking, which is on by default, then centred the Sun.
  const { page, context } = await open('era=anaximander&view=sky&body=sun&paused=1&panels=0');
  await shot(page, 'drum_tracking_sun');
  const side = await ground(page, 200);
  const sun = (await labels(page)).Sun;
  const aim = preferredAltitude(60);
  const wantSun = rowOf(fromTheDrum(JD_DEFAULT, 'sun').altitude, aim, 60);
  record('with the Sun selected and tracked, the ground is still there after many frames', side.bottom > 30 && side.top < 25 && inFrame(sun), `foot ${side.bottom.toFixed(0)}, head ${side.top.toFixed(0)}, Sun at ${at(sun)}`);
  record('the Sun sits where the tracking rule puts it', Boolean(sun) && Math.abs(sun.x - WIDE.width / 2) < 6 && Math.abs(sun.y - wantSun) < 6, `Sun at ${at(sun)}; the rule gives ${WIDE.width / 2},${wantSun.toFixed(0)} for a view aimed ${aim} degrees up`);
  // Read beneath the Sun, on the central column, where the projection is exact.
  const centre = await ground(page, WIDE.width / 2);
  const eyeHeight = drum.observer(JD_DEFAULT)[2] - drum.drum.height / 2;
  const rim = -deg(Math.atan(eyeHeight / (drum.drum.diameter / 2)));
  const wantEdge = rowOf(rim, aim, 60);
  record('and the horizon falls where that aim puts it', centre.edge !== null && Math.abs(centre.edge - wantEdge) < 6, `the ground's upper edge is at row ${centre.edge} of ${WIDE.height}; computed ${wantEdge.toFixed(0)}, the drum's rim lying ${Math.abs(rim).toFixed(2)} degrees below the level`);
  await context.close();
}

async function aRisingSunMagnified(jd) {
  const fov = 20;
  const sunAltitude = fromTheDrum(jd, 'sun').altitude;
  const byFragment = await open(`era=anaximander&view=sky&body=sun&paused=1&panels=0&jd=${jd}&fov=${fov}`);
  await shot(byFragment.page, 'drum_rising_sun_fov20');
  const sun = (await labels(byFragment.page)).Sun;
  const g = await ground(byFragment.page, 200);
  const aim = preferredAltitude(fov);
  const want = rowOf(sunAltitude, aim, fov);
  record('a Sun four degrees up stays in a 20 degree field', inFrame(sun) && Math.abs(sun.y - want) < 6, `Sun at row ${sun?.y.toFixed(0)}; computed ${want.toFixed(0)}. Held at a fixed 18 degrees it would fall on row ${rowOf(sunAltitude, 18, fov).toFixed(0)} of ${WIDE.height}, off the foot of the picture`);
  record('and the ground is kept as well, since both fit', g.bottom > 20 && g.top < 25, `foot ${g.bottom.toFixed(0)}, head ${g.top.toFixed(0)}`);
  await byFragment.context.close();

  const { page, context } = await open(`era=anaximander&view=sky&body=sun&paused=1&panels=0&jd=${jd}`);
  await page.mouse.move(WIDE.width / 2, 200);
  // A body is not a point. An earlier version of this check asked only that the
  // Sun's centre stay in the frame, and passed a trace in which, at the sixth
  // notch, the centre sat on row 108 with a disc 170 pixels in radius: the top of
  // the Sun cut off by the frame. So the whole disc is checked. A disc that fits
  // must be wholly inside; one too large to be held off-centre must be centred.
  // The radius is read from the name's gap, which the application stops growing
  // at 400 pixels, by which point the disc is larger than the frame in any case.
  const half = WIDE.height / 2;
  const trace = [];
  let lost = 0;
  let cut = 0;
  let first = null;
  let last = null;
  for (let notch = 0; notch <= 14; notch += 1) {
    if (notch > 0) {
      await page.mouse.wheel(0, -300);
      await page.waitForTimeout(450);
    }
    const l = (await labels(page)).Sun;
    first ??= l;
    last = l;
    if (!inFrame(l)) {
      lost += 1;
      trace.push(`${notch}: LOST`);
      continue;
    }
    const radius = l.gap - LABEL_GAP;
    const fits = radius <= half;
    // The rule takes the disc's radius out of its reach, so none is left once the radius exceeds it.
    const tooLargeToOffset = radius >= TRACKING_REACH * half;
    const whole = l.y - radius >= -2 && l.y + radius <= WIDE.height + 2;
    const centred = Math.abs(l.y - half) <= 6;
    const ok = (!fits || whole) && (!tooLargeToOffset || centred);
    if (!ok) cut += 1;
    if (notch === 6) await shot(page, 'drum_rising_sun_wheel_notch6');
    trace.push(`${notch}: row ${l.y.toFixed(0)}, radius ${radius}${ok ? '' : ' CUT'}`);
  }
  await shot(page, 'drum_rising_sun_wheel_magnified');
  record('magnifying a rising Sun with the wheel never loses it, at any notch', lost === 0, trace.join('; '));
  record('nor cuts its disc off with the edge of the frame', lost === 0 && cut === 0, `${cut} of 15 notches showed a disc cut by the frame or held off-centre when too large for that`);
  record('and the wheel did magnify it', (last?.gap ?? 0) > (first?.gap ?? Infinity) * 3, `disc gap ${first?.gap}px -> ${last?.gap}px`);
  await context.close();
}

async function whatIsSeenFromTheEarth() {
  const on = await open('era=anaximander&view=sky&paused=1&panels=0');
  const off = await open('era=anaximander&view=sky&paused=1&panels=0&off=machinery');
  const wheels = await differing(on.page, off.page);
  record('from the drum the wheels of fire are drawn, and their toggle removes them', wheels > 300, `${wheels} pixels differ between wheels on and wheels off`);
  await on.context.close();
  await off.context.close();

  const ptolemyOn = await open('era=ptolemy&view=sky&body=mars&paused=1&panels=0');
  const ptolemyOff = await open('era=ptolemy&view=sky&body=mars&paused=1&panels=0&off=machinery');
  const constructions = await differing(ptolemyOn.page, ptolemyOff.page);
  record('from Ptolemy\'s Earth no deferent or epicycle is drawn in the sky, toggle or no toggle', constructions <= 5, `${constructions} pixels differ`);
  await ptolemyOn.context.close();
  await ptolemyOff.context.close();
}

const toLinear = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const toSrgb = (c) => (c <= 0.0031308 ? c * 12.92 : 1.055 * c ** (1 / 2.4) - 0.055);

/** The colour a vent should show on screen: its body's colour, dimmed in linear light as the renderer dims it. */
function ventColour(id, aperture) {
  const k = ventBrightness(aperture ?? 1);
  const hex = BODIES[id].color;
  return [1, 3, 5].map((i) => Math.round(255 * toSrgb(toLinear(parseInt(hex.slice(i, i + 2), 16) / 255) * k)));
}

/** Shades are coarsened to steps of 8, so allow that and a little rounding. */
const SHADE_TOLERANCE = 10;

/**
 * A vent is a hole in the mist of its wheel, so its disc must be one clear colour,
 * and that colour must be the vent's own. Drawn before the mist it came out
 * veiled: 93 per cent of the Sun's disc a dull 224,192,136, a blend with the grey
 * of the rim, and the rest bright flecks. Both halves of the check matter. The
 * first version asked only for one colour, and passed a Moon that was veiled
 * evenly, 184,192,208 where 200,208,224 was due: uniform, and wrong.
 */
async function aVentIsClear(name, fragment, body, file, id, aperture) {
  const { page, context } = await open(fragment);
  const l = (await labels(page))[body];
  if (!inFrame(l)) {
    record(name, false, `${body} is not in the frame`);
  } else {
    await shot(page, file, { x: Math.max(0, l.x - 120), y: Math.max(0, l.y - 120), width: 240, height: 240 });
    const radius = l.gap - LABEL_GAP;
    const shades = await discShades(page, l, radius);
    const want = ventColour(id, aperture);
    const got = shades[0][0].split(',').map(Number);
    const off = Math.max(...got.map((v, i) => Math.abs(v - want[i])));
    record(name, shades[0][1] > 0.97 && off <= SHADE_TOLERANCE, `disc radius ${radius}px; its own colour would be ${want.join(',')}, furthest channel off by ${off}; shades as rgb: share  ${shades.map(([key, share]) => `${key}: ${(100 * share).toFixed(1)}%`).join(' | ')}`);
  }
  await context.close();
}

// ------------------------------------------------------------------------- run

try {
  await wheelMagnifiesTheSky();
  await wheelZoomsTheCosmos();
  await draggingTurnsTheSky();
  await clickingSelects();
  await timeHoldsAndRuns();
  await fitsAnUprightPhone();
  await resizing('an untouched view re-frames when the window turns upright', async () => {}, true);
  await resizing('a plain click does not switch that re-framing off', async (p) => p.mouse.click(640, 120), true);
  await resizing('once the user has dragged the camera, a resize leaves it alone', async (p) => {
    await p.mouse.move(640, 150);
    await p.mouse.down();
    await p.mouse.move(646, 153);
    await p.mouse.move(652, 156);
    await p.mouse.up();
  }, false);
  await resizing('once the user has zoomed with the wheel, a resize leaves it alone', async (p) => {
    await p.mouse.move(640, 150);
    await p.mouse.wheel(0, -120);
  }, false);

  await theGroundIsThere();
  const jdRising = sunFourDegreesUp();
  if (jdRising === null) record('a morning on which the Sun climbs through four degrees', false, 'none found before the default date');
  else await aRisingSunMagnified(jdRising);
  await whatIsSeenFromTheEarth();

  if (jdRising !== null) await aVentIsClear('from the drum the Sun\'s disc is one clear colour, not veiled by the mist of its wheel', `era=anaximander&view=sky&body=sun&paused=1&panels=0&jd=${jdRising}&fov=20`, 'Sun', 'vent_sun_from_drum', 'sun', 1);
  const jdMoon = fullMoonWellUp();
  if (jdMoon === null) record('a night with a full Moon well up', false, 'none found in the month after the default date');
  else await aVentIsClear('and the Moon\'s likewise', `era=anaximander&view=sky&body=moon&paused=1&panels=0&jd=${jdMoon}&fov=20`, 'Moon', 'vent_moon_from_drum', 'moon', fromTheDrum(jdMoon, 'moon').aperture);
  await aVentIsClear('from outside, close to the Sun on its wheel, the disc is clear too', 'era=anaximander&body=sun&zoom=1&paused=1&panels=0&cam=9,72,14', 'Sun', 'vent_sun_from_outside', 'sun', 1);
} finally {
  await browser.close();
}

console.log('\n--- console errors and page errors, across every check ---');
console.log(problems.length ? [...new Set(problems)].join('\n') : '(none)');
const failed = results.filter((r) => !r.pass);
console.log(`\n${results.length - failed.length} passed, ${failed.length} failed`);
process.exitCode = failed.length || problems.length ? 1 : 0;
