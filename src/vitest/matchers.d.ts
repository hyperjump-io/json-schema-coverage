import type { SchemaObject } from "@hyperjump/json-schema";
import "vitest";

declare module "vitest" {
  interface Matchers<R = unknown> {
    matchJsonSchema: (uriOrSchema: string | SchemaObject | boolean) => Promise<R>;
    toMatchJsonSchema: (uriOrSchema: string | SchemaObject | boolean) => Promise<R>;
  }
}

export * from "./json-schema-matcher.d.ts";
