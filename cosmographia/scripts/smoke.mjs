#!/usr/bin/env node
/**
 * End-to-end smoke test: loads every era in both views in headless Chromium (software WebGL),
 * fails on any console error or uncaught exception, and saves a screenshot per view.
 *
 * Usage: node scripts/smoke.mjs [baseUrl] [outDir] [--eras=a,b] [--views=cosmos,sky] [--wait=ms]
 * Default baseUrl http://localhost:8080, outDir ./screenshots
 */
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const args = process.argv.slice(2);
const positional = args.filter((a) => !a.startsWith('--'));
const flag = (name, fallback) => {
  const hit = args.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : fallback;
};
const baseUrl = positional[0] ?? 'http://localhost:8080';
const outDir = positional[1] ?? path.resolve('screenshots');
const ERAS = flag('eras', 'anaximander,philolaus,eudoxus,aristotle,aristarchus,hipparchus,ptolemy,medieval,copernicus,tycho,galileo,kepler,newton').split(',');
const VIEWS = flag('views', 'cosmos,sky').split(',');
const WAIT = Number(flag('wait', '4500'));
const EXTRA = flag('extra', '');

fs.mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch({
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
});
const failures = [];
try {
  const context = await browser.newContext({ viewport: { width: 1600, height: 900 }, deviceScaleFactor: 1 });
  for (const era of ERAS) {
    for (const view of VIEWS) {
      const page = await context.newPage();
      const errors = [];
      page.on('console', (msg) => {
        if (msg.type() === 'error') errors.push(msg.text());
      });
      page.on('pageerror', (err) => errors.push(`pageerror: ${err.message}`));
      const url = `${baseUrl}/?era=${era}&view=${view}&intro=0${EXTRA ? `&${EXTRA}` : ''}`;
      try {
        await page.goto(url, { waitUntil: 'load', timeout: 60000 });
        await page.waitForTimeout(WAIT);
        const canvasCount = await page.locator('canvas.scene-canvas').count();
        if (canvasCount !== 1) errors.push(`expected one scene canvas, found ${canvasCount}`);
        const header = await page.locator('.era-figure').textContent();
        if (!header) errors.push('era header missing');
        const file = path.join(outDir, `${era}-${view}.png`);
        await page.screenshot({ path: file, timeout: 90000 });
        const relevant = errors.filter((e) => !/GPU stall|swiftshader|WebGL-.*Performance/i.test(e));
        console.log(`${relevant.length ? 'FAIL' : 'ok  '} ${era.padEnd(12)} ${view.padEnd(6)} ${header ?? ''} -> ${file}`);
        for (const e of relevant) console.log(`      ${e}`);
        if (relevant.length) failures.push({ era, view, errors: relevant });
      } catch (err) {
        console.log(`FAIL ${era.padEnd(12)} ${view.padEnd(6)} ${err.message.split('\n')[0]}`);
        failures.push({ era, view, errors: [err.message] });
      } finally {
        await page.close();
      }
    }
  }
} finally {
  await browser.close();
}
if (failures.length) {
  console.log(`SMOKE_FAILED ${failures.length}`);
  process.exit(1);
}
console.log('SMOKE_OK');
