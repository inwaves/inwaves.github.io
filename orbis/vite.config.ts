import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  // The Pages workflow mounts dist/ at /orbis/; keep standalone previews portable too.
  base: "./",
  plugins: [react()],
  server: {
    host: "0.0.0.0",
    port: 8080,
    strictPort: true,
    allowedHosts: [".preview.dev.igent.ai", ".e2b-dev.igent.dev"],
    watch: { usePolling: true, interval: 500 },
  },
  preview: { allowedHosts: [".preview.dev.igent.ai", ".e2b-dev.igent.dev"] },
  build: {
    // Three.js is isolated and lazy-loaded; its 140 kB gzip engine is intentionally one chunk.
    chunkSizeWarningLimit: 600,
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [{ name: "three", test: /node_modules\/three/ }],
        },
      },
    },
  },
  test: { include: ["src/**/*.test.ts"] },
});
