import { expect } from "vitest";
import { matchJsonSchema } from "./json-schema-matcher.js";

expect.extend({
  matchJsonSchema: matchJsonSchema,
  toMatchJsonSchema: matchJsonSchema
});
