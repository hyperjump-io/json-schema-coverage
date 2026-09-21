import { defineConfig } from "vitest/config";
import { jsonSchemaCoveragePlugin } from "../../json-schema-coverage-plugin.js";

export default defineConfig({
  root: import.meta.dirname,
  plugins: [jsonSchemaCoveragePlugin()],
  test: {
    coverage: {
      enabled: true,
      reporter: [],
      thresholds: {
        perFile: true,
        branches: 100
      }
    }
  }
});
