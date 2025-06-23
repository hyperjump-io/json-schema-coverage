import type { SchemaObject } from "@hyperjump/json-schema";
import "vitest";

declare module "vitest" {
  interface Matchers<R = unknown> {
    matchJsonSchema: (uriOrSchema: string | SchemaObject) => Promise<R>;
  }
}
