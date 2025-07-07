import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    coverage: {
      provider: "custom",
      customProviderModule: "./src/vitest/coverage-provider.js"
    }
  }
});
