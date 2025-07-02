import { expect } from "vitest";
import { matchJsonSchema } from "./json-schema-matcher.js";

expect.extend({
  matchJsonSchema: matchJsonSchema,
  toMatchJsonSchema: matchJsonSchema
});

export { registerSchema } from "../coverage-util.js";
export { unregisterSchema } from "@hyperjump/json-schema/draft-2020-12";
export { loadDialect, defineVocabulary, addKeyword } from "@hyperjump/json-schema/experimental";

export * from "./json-schema-matcher.js";
