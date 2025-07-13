/** @module vitest */
import { readFile } from "node:fs/promises";
import { extname } from "node:path";
import { pathToFileURL } from "node:url";
import { registerSchema as register, unregisterSchema as unregister } from "./json-schema.js";
import { getKeywordId, getKeywordName } from "@hyperjump/json-schema/experimental";
import YAML from "yaml";
import { toAbsoluteIri } from "@hyperjump/uri";
import JsonSchemaCoverageProvider from "./coverage-provider.js";

/**
 * @import { SchemaObject } from "@hyperjump/json-schema"
 */
// @ts-expect-error There appears to be a bug in TypeScript
/** @import * as API from "./index.d.ts" */

export * from "./json-schema-coverage-plugin.js";
export * from "./json-schema-matchers.js";

/** @type API.registerSchema */
export const registerSchema = async (schemaPath) => {
  const text = await readFile(schemaPath, "utf-8");
  const extension = extname(schemaPath);

  /** @type SchemaObject */
  let schema;
  switch (extension) {
    case ".json":
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      schema = JSON.parse(text);
      break;
    case ".yaml":
    case ".yml":
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      schema = YAML.parse(text);
      break;
    default:
      throw Error(`File of type '${extension}' is not supported.`);
  }

  register(schema);
};

/** @type (schemaPath: string) => Promise<void> */
export const unregisterSchema = async (schemaPath) => {
  const text = await readFile(schemaPath, "utf-8");
  const extension = extname(schemaPath);

  /** @type SchemaObject */
  let schema;
  switch (extension) {
    case ".json":
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      schema = JSON.parse(text);
      break;
    case ".yaml":
    case ".yml":
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      schema = YAML.parse(text);
      break;
    default:
      throw Error(`File of type '${extension}' is not supported.`);
  }

  const dialectUri = toAbsoluteIri(/** @type string */ (schema.$schema));
  const idToken = getKeywordName(dialectUri, "https://json-schema.org/keyword/id")
    ?? getKeywordId("https://json-schema.org/keyword/draft-04/id", dialectUri);
  const schemaUri = /** @type string */ (schema[idToken]) ?? pathToFileURL(schemaPath).toString();

  unregister(schemaUri);
};

export default JsonSchemaCoverageProvider;
