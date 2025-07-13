/**
 * @import { Plugin } from "vite"
 * @import { VitestPluginContext, ResolvedCoverageOptions } from "vitest/node"
 */

import { resolve } from "path";

/** @type () => Plugin */
export const jsonSchemaCoveragePlugin = () => {
  return {
    name: "json-schema-coverage-plugin",

    /** @type (context: VitestPluginContext) => void */
    configureVitest(context) {
      const config = context.vitest.config;

      const coverage = /** @type ResolvedCoverageOptions<"custom"> */ (config.coverage);
      coverage.provider = "custom";
      coverage.customProviderModule = resolve(import.meta.dirname, "./coverage-provider.js");

      config.setupFiles.push(resolve(import.meta.dirname, "./register-matchers.js"));
    }
  };
};
