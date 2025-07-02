import type { SchemaObject } from "@hyperjump/json-schema";
import "vitest";

declare module "vitest" {
  interface Matchers<R = unknown> {
    matchJsonSchema: (uriOrSchema: string | SchemaObject | boolean) => Promise<R>;
    toMatchJsonSchema: (uriOrSchema: string | SchemaObject | boolean) => Promise<R>;
  }
}

export { registerSchema } from "../coverage-util.js";
export { unregisterSchema } from "@hyperjump/json-schema/draft-2020-12";
export { loadDialect, defineVocabulary, addKeyword } from "@hyperjump/json-schema/experimental";

export * from "./json-schema-matcher.js";
