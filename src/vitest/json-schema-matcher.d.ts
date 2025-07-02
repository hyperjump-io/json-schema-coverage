import type { SchemaObject } from "@hyperjump/json-schema";
import type { AsyncExpectationResult } from "@vitest/expect";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const matchJsonSchema: (instance: any, uriOrSchema: string | SchemaObject | boolean) => AsyncExpectationResult;
export const toMatchJsonSchema: typeof matchJsonSchema;
