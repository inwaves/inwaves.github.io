import { defineConfig } from "@playwright/test";
import explorerConfig from "./playwright.config";

/** Exercise the actual Pages output, including the article and the original /space/ app. */
// defineConfig(a, b) concatenates webServer entries; replace it explicitly instead.
export default defineConfig({
  ...explorerConfig,
  testMatch: "**/*.spec.ts",
  use: { ...explorerConfig.use, baseURL: "http://127.0.0.1:8080/orbis/" },
  webServer: {
    command:
      "python3 -m http.server 8080 --bind 127.0.0.1 --directory ../public",
    url: "http://127.0.0.1:8080/orbis/",
    reuseExistingServer: false,
    timeout: 30000,
  },
});
