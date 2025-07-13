import { defineConfig } from "vitest/config";
import { jsonSchemaCoveragePlugin } from "./json-schema-coverage-plugin.js";

export default defineConfig({
  plugins: [jsonSchemaCoveragePlugin()]
});
