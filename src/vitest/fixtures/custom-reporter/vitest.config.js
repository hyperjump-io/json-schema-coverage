import { resolve } from "node:path";
import { defineConfig } from "vitest/config";
import { jsonSchemaCoveragePlugin } from "../../json-schema-coverage-plugin.js";

export default defineConfig({
  root: import.meta.dirname,
  plugins: [jsonSchemaCoveragePlugin()],
  test: {
    coverage: {
      enabled: true,
      reporter: [resolve(import.meta.dirname, "custom-reporter.mjs")]
    }
  }
});
