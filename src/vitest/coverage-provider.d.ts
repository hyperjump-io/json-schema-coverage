import type { CoverageProviderModule } from "vitest";
import type { CustomProviderOptions } from "vitest/node";

export default CoverageProviderModule;

export type JsonSchemaCoverageProviderOptions = CustomProviderOptions & {
  provider: "custom";
  customProviderModule: "@hyperjump/json-schema-coverage/vitest-coverage-provider";
  include?: string[];
};
