import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';
import type { Plugin } from 'vite';
import react from '@vitejs/plugin-react';

const NOTICES_SOURCE = fileURLToPath(new URL('./THIRD_PARTY_NOTICES.md', import.meta.url));
const NOTICES_FILE = 'THIRD_PARTY_NOTICES.txt';

/**
 * Ships the third-party notices (library and font licences, the CC BY-SA terms of the derived star
 * data) with the app, as plain text so browsers display rather than download them. Emitted into the
 * build and served by the dev server at the same relative path.
 */
function thirdPartyNotices(): Plugin {
  return {
    name: 'cosmographia-third-party-notices',
    configureServer(server) {
      server.middlewares.use(`/${NOTICES_FILE}`, (_req, res) => {
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.end(readFileSync(NOTICES_SOURCE, 'utf8'));
      });
    },
    generateBundle() {
      this.emitFile({ type: 'asset', fileName: NOTICES_FILE, source: readFileSync(NOTICES_SOURCE, 'utf8') });
    },
  };
}

/**
 * Hosts the dev/preview servers answer to. Vite's host check protects against DNS rebinding,
 * so rather than disabling it we allow localhost plus explicitly configured public hostnames:
 *  - PUBLIC_HOSTNAME: a full URL (e.g. https://example.preview.dev) exported by the sandbox
 *  - COSMOGRAPHIA_ALLOWED_HOSTS: optional comma-separated list of extra hostnames
 */
function allowedHosts(): string[] {
  const hosts = ['localhost', '127.0.0.1'];
  const publicUrl = process.env.PUBLIC_HOSTNAME;
  if (publicUrl) {
    try {
      hosts.push(new URL(publicUrl.includes('://') ? publicUrl : `https://${publicUrl}`).hostname);
    } catch {
      // Ignore a malformed value; the server stays restricted to localhost.
    }
  }
  const extra = process.env.COSMOGRAPHIA_ALLOWED_HOSTS;
  if (extra) hosts.push(...extra.split(',').map((h) => h.trim()).filter(Boolean));
  return hosts;
}

export default defineConfig({
  plugins: [react(), thirdPartyNotices()],
  // Relative base so the production build works from any path: inwaves.io serves it at /cosmographia/.
  base: './',
  server: {
    host: '0.0.0.0',
    port: 8080,
    allowedHosts: allowedHosts(),
    // Network and FUSE mounts may not deliver native file events; COSMOGRAPHIA_POLL=1 opts into polling.
    watch: process.env.COSMOGRAPHIA_POLL ? { usePolling: true, interval: 400 } : undefined,
  },
  preview: {
    host: '0.0.0.0',
    port: 8080,
    allowedHosts: allowedHosts(),
  },
  build: {
    chunkSizeWarningLimit: 1500,
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts', 'scripts/**/*.test.mjs'],
  },
});
