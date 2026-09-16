#!/usr/bin/env node
/**
 * Assembled-site check for inwaves.io. Serves the complete Pages output (the Zola site with the apps
 * copied in, exactly as the deploy workflow assembles it), then:
 *  1. checks that the third-party notices ship with the app as plain text,
 *  2. follows the article's link to Cosmographia and checks the linked worldview loads cleanly,
 *  3. runs the per-era smoke test (every era in both views) against /cosmographia/.
 *
 * Usage: node scripts/site-check.mjs [--site=../public] [--port=8080] [--out=<dir>] [--wait=ms]
 * Exits non-zero on any failure; the static server is always stopped.
 */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const args = process.argv.slice(2);
const flag = (name, fallback) => {
  const hit = args.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : fallback;
};

const here = path.dirname(fileURLToPath(import.meta.url));
const siteDir = path.resolve(flag('site', path.join(here, '..', '..', 'public')));
const port = Number(flag('port', '8080'));
const outDir = path.resolve(flag('out', path.join(os.tmpdir(), 'cosmographia-site-check')));
const wait = flag('wait', '3000');
const origin = `http://127.0.0.1:${port}`;
const ARTICLE_PATH = '/posts/conceptions-of-the-heavens/';
const APP_LINK = '/cosmographia/?era=ptolemy';
const BENIGN_CONSOLE = /GPU stall|swiftshader|WebGL-.*Performance/i;

if (!fs.existsSync(path.join(siteDir, 'cosmographia', 'index.html'))) {
  console.error(`No assembled site at ${siteDir}: run zola build and copy cosmographia/dist into public/cosmographia/ first.`);
  process.exit(2);
}

const server = spawn('python3', ['-m', 'http.server', String(port), '--bind', '127.0.0.1', '--directory', siteDir], {
  stdio: 'ignore',
});
const stopServer = () => {
  if (server.exitCode === null && server.signalCode === null) server.kill();
};
process.on('exit', stopServer);

const failures = [];
function check(ok, message) {
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${message}`);
  if (!ok) failures.push(message);
}

async function waitForServer(url, timeoutMs = 30000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (server.exitCode !== null) throw new Error(`static server exited with code ${server.exitCode} (is port ${port} in use?)`);
    try {
      const res = await fetch(url);
      if (res.ok) return;
    } catch {
      // Not listening yet.
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`static server did not answer at ${url} within ${timeoutMs} ms`);
}

async function checkNotices() {
  const res = await fetch(`${origin}/cosmographia/THIRD_PARTY_NOTICES.txt`);
  const type = res.headers.get('content-type') ?? '';
  const body = res.ok ? await res.text() : '';
  check(res.ok && type.startsWith('text/plain') && body.includes('CC BY-SA'), `third-party notices served as text (${res.status} ${type})`);
}

async function checkArticleLink() {
  const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    const errors = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error' && !BENIGN_CONSOLE.test(msg.text())) errors.push(msg.text());
    });
    page.on('pageerror', (err) => errors.push(`pageerror: ${err.message}`));
    page.on('response', (res) => {
      if (res.status() >= 400) errors.push(`HTTP ${res.status()} ${res.url()}`);
    });

    await page.goto(origin + ARTICLE_PATH, { waitUntil: 'load', timeout: 60000 });
    const link = page.getByRole('link', { name: 'Cosmographia', exact: true });
    check((await link.count()) === 1, 'article has one text link named Cosmographia');
    check((await link.first().getAttribute('href')) === APP_LINK, `article link points at ${APP_LINK}`);
    check((await page.locator('article a[href^="/cosmographia/"] img').count()) === 1, 'article figure links to Cosmographia');

    await link.first().click();
    await page.waitForURL(origin + APP_LINK, { timeout: 30000 });
    const header = page.locator('.era-figure');
    await header.waitFor({ timeout: 60000 });
    const figure = (await header.textContent()) ?? '';
    check(/Ptolemy/.test(figure), `article link opens Ptolemy's worldview (header: "${figure}")`);
    check((await page.locator('canvas.scene-canvas').count()) === 1, 'linked app renders its scene canvas');
    await page.waitForTimeout(Number(wait));
    check(errors.length === 0, `no console errors or failed requests on the article or linked app${errors.length ? `: ${errors.join(' | ')}` : ''}`);
  } finally {
    await browser.close();
  }
}

function runSmoke() {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [path.join(here, 'smoke.mjs'), `${origin}/cosmographia`, outDir, `--wait=${wait}`], {
      stdio: 'inherit',
    });
    child.on('exit', (code) => resolve(code ?? 1));
  });
}

let exitCode = 1;
try {
  await waitForServer(`${origin}/cosmographia/`);
  await checkNotices();
  await checkArticleLink();
  check((await runSmoke()) === 0, 'every era renders in both views at /cosmographia/');
  exitCode = failures.length ? 1 : 0;
} catch (err) {
  console.log(`FAIL ${err instanceof Error ? err.message : String(err)}`);
  exitCode = 1;
} finally {
  stopServer();
}
console.log(exitCode === 0 ? 'SITE_CHECK_OK' : `SITE_CHECK_FAILED (${failures.length || 1})`);
process.exit(exitCode);
