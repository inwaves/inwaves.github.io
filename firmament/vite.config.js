import { readFileSync } from 'node:fs';
import { defineConfig } from 'vite';

// The dev and preview servers listen on all interfaces, so that they can be reached through a
// tunnel or a preview proxy. Hosts other than localhost have to be named: add your own
// development hostname here when you need one.
const listen = {
  host: '0.0.0.0',
  port: 8080,
  strictPort: true,
  allowedHosts: ['.preview.dev.igent.ai', '.e2b-dev.igent.dev'],
};

// Some filesystems deliver no change events: network shares, some containers, and FUSE mounts.
// There the dev server never learns that a file changed and goes on serving its cached copy of
// the old module, even across a full page reload, with no error anywhere. Polling fixes that at
// some cost in CPU, so it is opt-in:
//
//   FIRMAMENT_POLL=1 npm run dev      (or: npm run dev:poll)
//
// A symptom worth knowing: edits that pass `npm run build` and `npm test`, both of which read
// from disk, yet do not show up in the browser.
const watch = process.env.FIRMAMENT_POLL === '1' ? { usePolling: true, interval: 300 } : undefined;

/**
 * Documents that ship with the application, keyed by the name they are served under. They are
 * served as plain text so that a browser shows them instead of offering a download.
 *
 * The notices have to travel with every distribution: the BSD licence of the star data and the
 * MIT licence of three.js both require it, and the bundler keeps neither notice in the script.
 * The provenance notes are what the interface's "How faithful is this picture?" points to. Each
 * stays a single file in the source tree; nothing is copied by hand.
 */
const DOCUMENTS = {
  'THIRD_PARTY_NOTICES.txt': 'THIRD_PARTY_NOTICES.md',
  'SOURCES.txt': 'docs/SOURCES.md',
};

function shipDocuments() {
  const read = (file) => readFileSync(new URL(file, import.meta.url), 'utf8');
  return {
    name: 'firmament:ship-documents',
    generateBundle() {
      for (const [fileName, source] of Object.entries(DOCUMENTS)) {
        this.emitFile({ type: 'asset', fileName, source: read(source) });
      }
    },
    // The same addresses work under `npm run dev`, where nothing is bundled.
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const name = (req.url ?? '').split('?')[0].replace(/^\//, '');
        if (!Object.hasOwn(DOCUMENTS, name)) {
          next();
          return;
        }
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.end(read(DOCUMENTS[name]));
      });
    },
  };
}

export default defineConfig({
  // Relative, so that the build works wherever it is mounted. The site serves it at /firmament/.
  base: './',
  plugins: [shipDocuments()],
  server: { ...listen, watch },
  preview: listen,
  build: { target: 'es2022', chunkSizeWarningLimit: 900 },
});
