import type { SchemaObject } from "@hyperjump/json-schema";
import type { AsyncExpectationResult } from "@vitest/expect";
import "vitest";

declare module "vitest" {
  interface Matchers<R = unknown> {
    matchJsonSchema: (uriOrSchema: string | SchemaObject | boolean) => Promise<R>;
    toMatchJsonSchema: (uriOrSchema: string | SchemaObject | boolean) => Promise<R>;
  }
}

/**
 * Register a schema in your code base by it's path.
 *
 * _**NOTE**: This is **not** the same as the function from
 * [@hyperjump/json-schema](https://github.com/hyperjump-io/json-schema) that takes a schema._
 */
export const registerSchema: (filePath: string) => Promise<void>;

/**
 * Remove a registered schema in your code base by it's path.
 *
 * _**NOTE**: This is **not** the same as the function from
 * [@hyperjump/json-schema](https://github.com/hyperjump-io/json-schema) that takes the schema's `$id`._
 */
export const unregisterSchema: (filePath: string) => Promise<void>;

/**
 * A vitest matcher that can be used to validate a JSON-compatible value. It
 * can take a relative or full URI for a schema in your codebase. Use relative
 * URIs to reference a file and full URIs to reference the `$id` of a schema
 * you registered using the `registerSchema` function.
 *
 * You can use this matcher with an inline schema as well, but you will only
 * get coverage for schemas that are in files.
 *
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const matchJsonSchema: (instance: any, uriOrSchema: string | SchemaObject | boolean) => AsyncExpectationResult;
export const toMatchJsonSchema: typeof matchJsonSchema;

export { loadDialect, defineVocabulary, addKeyword } from "@hyperjump/json-schema/experimental";
