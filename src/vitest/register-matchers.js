import { expect } from "vitest";
import { matchJsonSchema, toMatchJsonSchema } from "./json-schema-matchers.js";

expect.extend({
  matchJsonSchema: matchJsonSchema,
  toMatchJsonSchema: toMatchJsonSchema
});
