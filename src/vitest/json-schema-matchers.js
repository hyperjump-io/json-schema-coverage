import { randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import { extname } from "node:path";
import { pathToFileURL } from "node:url";
import { registerSchema as register, unregisterSchema as unregister, validate } from "./json-schema.js";
import { getKeywordId, getKeywordName, BASIC } from "@hyperjump/json-schema/experimental";
import YAML from "yaml";
import { FileCoverageMapService } from "./file-coverage-map-service.js";
import { TestCoverageEvaluationPlugin } from "../test-coverage-evaluation-plugin.js";

/**
 * @import { OutputUnit, SchemaObject } from "@hyperjump/json-schema"
 * @import * as API from "./matchers.d.ts"
 */

const coverageFilesDirectory = ".json-schema-coverage";
const coverageMapsDirectory = ".json-schema-coverage/maps";

/** @type FileCoverageMapService */
let coverageService;
if (existsSync(coverageMapsDirectory)) {
  coverageService = await FileCoverageMapService.restoreFrom(coverageMapsDirectory);
}

/** @type API.matchJsonSchema */
export const matchJsonSchema = async (instance, uriOrSchema) => {
  /** @type OutputUnit */
  let output;

  if (typeof uriOrSchema === "string") {
    const uri = uriOrSchema;

    if (coverageService) {
      const testCoveragePlugin = new TestCoverageEvaluationPlugin(coverageService);

      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      output = await validate(uri, instance, {
        outputFormat: BASIC,
        plugins: [testCoveragePlugin]
      });

      const coverageMapPath = `${coverageFilesDirectory}/${randomUUID()}.json`;
      const coverageMapJson = JSON.stringify(testCoveragePlugin.coverage);
      await writeFile(coverageMapPath, coverageMapJson);
    } else {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      output = await validate(uri, instance, BASIC);
    }
  } else {
    const schema = uriOrSchema;
    const uri = `urn:uuid:${randomUUID()}`;
    register(schema, uri, "https://json-schema.org/draft/2020-12/schema");
    try {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      output = await validate(uri, instance, BASIC);
    } finally {
      unregister(uri);
    }
  }

  return {
    pass: output.valid,
    message: () => JSON.stringify(output, null, "  ")
  };
};

export const toMatchJsonSchema = matchJsonSchema;

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

  const dialectUri = /** @type string */ (schema.$schema);
  const idToken = getKeywordName(dialectUri, "https://json-schema.org/keyword/id")
    ?? getKeywordId("https://json-schema.org/keyword/draft-04/id", dialectUri);
  const schemaUri = /** @type string */ (schema[idToken]) ?? pathToFileURL(schemaPath).toString();

  unregister(schemaUri);
};
