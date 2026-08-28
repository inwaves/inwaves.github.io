import { defineConfig } from 'vite';

// Relative base so the build can be served from any path (the site hosts it at /space/).
// Run `npm run dev -- --host` to expose the dev server beyond localhost.
export default defineConfig({
  base: './',
  server: { port: 8080, strictPort: true },
  preview: { port: 8080, strictPort: true },
  build: { target: 'es2020', sourcemap: false },
});
