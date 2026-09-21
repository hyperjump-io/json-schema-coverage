import { configDefaults, defineConfig } from "vitest/config";
import { jsonSchemaCoveragePlugin } from "./json-schema-coverage-plugin.js";

export default defineConfig({
  plugins: [jsonSchemaCoveragePlugin()],
  test: {
    // Fixture projects under `fixtures/` are run as separate, nested Vitest
    // processes by `coverage-provider.test.js` -- they aren't tests of this
    // project and shouldn't be collected by it.
    exclude: [...configDefaults.exclude, "src/vitest/fixtures/**"],
    coverage: {
      // Same reasoning as `exclude` above, but for this plugin's own schema-file
      // discovery (a separate mechanism from Vitest's test file discovery).
      include: ["**/*.schema.(json|yaml|yml)", "!src/vitest/fixtures/**"]
    }
  }
});
