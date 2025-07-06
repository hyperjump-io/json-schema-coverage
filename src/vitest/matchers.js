import { expect } from "vitest";
import { matchJsonSchema, toMatchJsonSchema } from "./json-schema-matchers.js";

expect.extend({
  matchJsonSchema: matchJsonSchema,
  toMatchJsonSchema: toMatchJsonSchema
});

export * from "./json-schema-matchers.js";
export { loadDialect, defineVocabulary, addKeyword } from "@hyperjump/json-schema/experimental";
