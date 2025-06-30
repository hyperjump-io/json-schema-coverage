import type { SchemaObject } from "@hyperjump/json-schema";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const matchJsonSchema: (instance: any, uriOrSchema: string | SchemaObject | boolean) => AsyncExpectationResult;
export const toMatchJsonSchema: typeof matchJsonSchema;

export type { registerSchema, unregisterSchema } from "@hyperjump/json-schema/draft-2020-12";
export type { loadDialect, defineVocabulary, addKeyword } from "@hyperjump/json-schema/experimental";
