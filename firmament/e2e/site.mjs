/**
 * Checks the application where it is actually published: inside the assembled site.
 *
 * The unit tests cover the kinematics and `interaction.mjs` covers the interface, but both see
 * the application alone, at the root of its own server. Published, it is a static build mounted
 * under /firmament/ of a Zola site and reached from a link in an article, and that is where a
 * wrong base path, a missing file or a broken link would show. This script serves the assembled
 * output and checks, in headless Chromium:
 *
 *   1. that the third-party notices and the provenance notes are in the build;
 *   2. that the article's addendum is there with its figure, and that its link opens the
 *      application on the worldview and the body it names;
 *   3. that every worldview loads from its own link and draws a picture, from outside and from
 *      the Earth, with no console errors, page errors or failed requests;
 *   4. that discoveries are gated in the published build: each era offers exactly the bodies
 *      that src/data/eras.js says it may know.
 *
 * It is meant for CI, so it is deterministic: everything is paused, and the only pixel test is
 * whether anything was drawn at all. Run it once the site is assembled (see the root README):
 *
 *   npx playwright install chromium      (once)
 *   npm run test:site
 *
 * SITE names the assembled output (default ../public, beside this app). The script serves it
 * itself, on a port the system picks, so it cannot collide with another server, and it always
 * stops that server.
 */
import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { BODIES, ERAS } from '../src/data/eras.js';

const HERE = fileURLToPath(new URL('.', import.meta.url));
const SITE = resolve(process.env.SITE ?? join(HERE, '..', '..', 'public'));
const MOUNT = '/firmament/';
const ARTICLE = '/posts/conceptions-of-the-heavens/';
const ADDENDUM = 'Addendum \u2014 18 September 2026';
const FIGURE = '/images/conceptions-of-the-heavens/firmament-aristotle.jpg';
const VIEWPORT = { width: 1280, height: 720 };

/**
 * Least share of the picture that must be brighter than the empty background for it to count as
 * drawn. With names and panels off, everything lit comes from the WebGL canvas. Measured across
 * all twenty views at 1280 by 720, the sparsest, Newton's cosmos from outside, lights 0.67 per
 * cent of the frame, thirteen times this; the same page with its canvas hidden lights none.
 */
const MIN_LIT_SHARE = 0.0005;

const results = [];
function record(name, pass, detail) {
  results.push({ name, pass });
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}\n      ${detail}`);
}

// ------------------------------------------------------------------ a static server

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.pdf': 'application/pdf',
};

/** Serves `root` as a static host does: index.html for a directory, and a redirect to add its slash. */
function serve(root) {
  const server = createServer((req, res) => {
    const path = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    let file = normalize(join(root, path));
    if (file !== root && !file.startsWith(root + sep)) {
      res.writeHead(403).end();
      return;
    }
    if (existsSync(file) && statSync(file).isDirectory()) {
      if (!path.endsWith('/')) {
        res.writeHead(301, { Location: `${path}/` }).end();
        return;
      }
      file = join(file, 'index.html');
    }
    if (!existsSync(file)) {
      res.writeHead(404, { 'Content-Type': 'text/plain' }).end('Not found');
      return;
    }
    res.writeHead(200, { 'Content-Type': TYPES[extname(file).toLowerCase()] ?? 'application/octet-stream' });
    createReadStream(file).pipe(res);
  });
  return new Promise((ok, fail) => {
    server.once('error', fail);
    server.listen(0, '127.0.0.1', () => ok({ server, origin: `http://127.0.0.1:${server.address().port}` }));
  });
}

// ------------------------------------------------------------------------ the page

/** Waits until the application has drawn its first frame, or has said why it cannot. */
async function ready(page) {
  // The date is written only after a frame has been drawn.
  await page.waitForFunction(
    () => {
      const fatal = document.getElementById('fatal');
      return (fatal && !fatal.hidden) || Boolean(document.querySelector('#transport .date')?.textContent);
    },
    null,
    { timeout: 45000 },
  );
  const fatal = await page.evaluate(() => {
    const node = document.getElementById('fatal');
    return node && !node.hidden ? node.textContent : null;
  });
  if (fatal) throw new Error(`the application refused to start: ${fatal}`);
  // A few more frames, so that trails and machinery are all in the picture.
  await page.waitForTimeout(1200);
}

/** Collects what should never happen while the application is on screen. */
function watch(page, origin, problems, label) {
  const inTheApp = () => {
    try {
      return new URL(page.url()).pathname.startsWith(MOUNT);
    } catch {
      return false;
    }
  };
  page.on('pageerror', (e) => {
    if (inTheApp()) problems.push(`${label}: page error: ${e.message}`);
  });
  page.on('console', (m) => {
    if (m.type() === 'error' && inTheApp()) problems.push(`${label}: console error: ${m.text()}`);
  });
  page.on('response', (r) => {
    const url = new URL(r.url());
    if (url.origin === origin && url.pathname.startsWith(MOUNT) && r.status() >= 400) problems.push(`${label}: ${r.status()} ${url.pathname}`);
  });
}

/** The share of the picture brighter than the empty background. */
async function litShare(page) {
  const png = await page.screenshot();
  return page.evaluate(async (b64) => {
    const img = new Image();
    img.src = `data:image/png;base64,${b64}`;
    await img.decode();
    const canvas = document.createElement('canvas');
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0);
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    let lit = 0;
    // The background is #03050b, whose channels sum to 19.
    for (let i = 0; i < data.length; i += 4) if (data[i] + data[i + 1] + data[i + 2] > 60) lit += 1;
    return lit / (data.length / 4);
  }, png.toString('base64'));
}

const percent = (share) => `${(100 * share).toFixed(2)}%`;

// ---------------------------------------------------------------------- the checks

async function documentsAreInTheBuild(origin) {
  const expected = [
    ['THIRD_PARTY_NOTICES.txt', ['three.js authors', 'Olaf Frohn', 'Redistributions in binary form']],
    ['SOURCES.txt', ['Almagest', 'Illustrative', 'Planetary Hypotheses']],
  ];
  for (const [name, phrases] of expected) {
    const response = await fetch(`${origin}${MOUNT}${name}`);
    const text = response.ok ? await response.text() : '';
    const missing = phrases.filter((phrase) => !text.includes(phrase));
    record(`${name} ships with the build`, response.ok && missing.length === 0, response.ok ? `${text.length} characters${missing.length ? `; missing: ${missing.join(', ')}` : ''}` : `HTTP ${response.status}`);
  }
}

async function theArticleLinksHere(context, origin, problems) {
  const page = await context.newPage();
  watch(page, origin, problems, 'from the article');
  await page.goto(`${origin}${ARTICLE}`);

  const heading = await page.getByRole('heading', { name: ADDENDUM, exact: true }).count();
  record('the article carries the dated addendum', heading === 1, `headings named "${ADDENDUM}": ${heading}`);

  const figure = page.locator(`article a[href^="${MOUNT}"] img`);
  const figures = await figure.count();
  const drawn = figures === 1 ? await figure.evaluate((img) => img.complete && img.naturalWidth > 0 && img.getAttribute('src')) : null;
  const figureLink = figures === 1 ? await page.locator(`article a[href^="${MOUNT}"]:has(img)`).getAttribute('href') : null;
  record('its figure loads and links to the worldview it shows', drawn === FIGURE && figureLink === `${MOUNT}#era=aristotle`, `figures: ${figures}; image: ${drawn}; links to: ${figureLink}`);

  const link = page.getByRole('link', { name: 'Firmament', exact: true });
  const href = (await link.count()) === 1 ? await link.getAttribute('href') : null;
  record('its link names Ptolemy and Mars', href === `${MOUNT}#era=ptolemy&body=mars`, `href: ${href}`);
  if (href === null) {
    await page.close();
    return;
  }

  await link.click();
  await page.waitForURL((url) => url.pathname === MOUNT, { timeout: 30000 });
  await ready(page);
  const arrived = await page.evaluate(() => ({
    era: document.querySelector('.era.active .era-title')?.textContent ?? null,
    selected: document.querySelector('.body-label.selected')?.textContent ?? null,
  }));
  record('and following it opens the application there', arrived.era === 'Ptolemy' && arrived.selected === 'Mars', `worldview: ${arrived.era}; selected: ${arrived.selected}; at ${new URL(page.url()).pathname}${new URL(page.url()).hash}`);
  await page.close();
}

/** The bodies an era may offer beyond the seven of antiquity and the Earth, from what it declares. */
function discoveriesOf(era) {
  const names = [];
  if (era.features.jupiterMoons) names.push(BODIES.io.name, BODIES.europa.name, BODIES.ganymede.name, BODIES.callisto.name);
  if (era.features.titan) names.push(BODIES.titan.name);
  if (era.features.comet) names.push(BODIES.comet.name);
  return names;
}

const EVERY_DISCOVERY = [BODIES.io.name, BODIES.europa.name, BODIES.ganymede.name, BODIES.callisto.name, BODIES.titan.name, BODIES.comet.name];

async function everyWorldviewDraws(context, origin, problems) {
  for (const era of ERAS) {
    const page = await context.newPage();
    watch(page, origin, problems, era.id);
    // Paused, with names and panels off: whatever is lit was drawn by the canvas.
    await page.goto(`${origin}${MOUNT}#era=${era.id}&paused=1&panels=0&off=labels`);
    await ready(page);

    const title = await page.evaluate(() => document.querySelector('.era.active .era-title')?.textContent ?? null);
    const offered = await page.evaluate(() => [...document.querySelectorAll('#tools .chip')].map((el) => el.textContent));
    const outside = await litShare(page);

    await page.keyboard.press('v');
    await page.waitForTimeout(1500);
    const view = await page.evaluate(() => document.querySelector('#tools .segmented button.active')?.textContent ?? null);
    const fromEarth = await litShare(page);

    const drew = outside > MIN_LIT_SHARE && fromEarth > MIN_LIT_SHARE;
    record(`${era.title} loads from its own link and draws, from outside and from the Earth`, title === era.title && view === 'The sky from Earth' && drew, `worldview: ${title}; second view: ${view}; lit from outside ${percent(outside)}, from the Earth ${percent(fromEarth)}`);

    const allowed = discoveriesOf(era);
    const shown = EVERY_DISCOVERY.filter((name) => offered.includes(name));
    const gated = shown.length === allowed.length && allowed.every((name) => shown.includes(name));
    record(`${era.title} offers exactly the discoveries of its time`, gated, `offers [${shown.join(', ') || 'none'}]; its era allows [${allowed.join(', ') || 'none'}]`);
    await page.close();
  }
}

// ----------------------------------------------------------------------------- run

if (!existsSync(join(SITE, 'firmament', 'index.html'))) {
  console.error(`No assembled site at ${SITE}: expected firmament/index.html inside it.\nBuild the site and copy this app's dist/ into public/firmament/ first; see the root README.`);
  process.exit(2);
}

const problems = [];
const { server, origin } = await serve(SITE);
// Software rendering, so that the run does not depend on the machine's GPU.
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl'] });
try {
  const context = await browser.newContext({ viewport: VIEWPORT, deviceScaleFactor: 1 });
  await documentsAreInTheBuild(origin);
  await theArticleLinksHere(context, origin, problems);
  await everyWorldviewDraws(context, origin, problems);
} catch (error) {
  record('the check ran to the end', false, error.stack ?? String(error));
} finally {
  await browser.close();
  await new Promise((done) => server.close(done));
}

console.log('\n--- console errors, page errors and failed requests, across every check ---');
console.log(problems.length ? [...new Set(problems)].join('\n') : '(none)');
const failed = results.filter((r) => !r.pass);
console.log(`\n${results.length - failed.length} passed, ${failed.length} failed`);
process.exitCode = failed.length || problems.length ? 1 : 0;
