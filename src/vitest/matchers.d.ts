import type { SchemaObject } from "@hyperjump/json-schema";
import type { AsyncExpectationResult } from "@vitest/expect";
import "vitest";

declare module "vitest" {
  interface Matchers<R = unknown> {
    matchJsonSchema: (uriOrSchema: string | SchemaObject | boolean) => Promise<R>;
    toMatchJsonSchema: (uriOrSchema: string | SchemaObject | boolean) => Promise<R>;
  }
}

export const registerSchema: (filePath: string) => Promise<void>;
export const unregisterSchema: (filePath: string) => Promise<void>;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const matchJsonSchema: (instance: any, uriOrSchema: string | SchemaObject | boolean) => AsyncExpectationResult;
export const toMatchJsonSchema: typeof matchJsonSchema;

export { loadDialect, defineVocabulary, addKeyword } from "@hyperjump/json-schema/experimental";
