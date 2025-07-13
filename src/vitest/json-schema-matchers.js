import { randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import { registerSchema, unregisterSchema, validate } from "./json-schema.js";
import { BASIC } from "@hyperjump/json-schema/experimental";
import { FileCoverageMapService } from "./file-coverage-map-service.js";
import { TestCoverageEvaluationPlugin } from "../test-coverage-evaluation-plugin.js";

/**
 * @import { OutputUnit } from "@hyperjump/json-schema"
 * @import * as API from "./index.d.ts"
 */

const coverageFilesDirectory = ".json-schema-coverage";
const coverageMapsDirectory = join(".json-schema-coverage", "maps");

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

      const coverageMapPath = join(coverageFilesDirectory, `${randomUUID()}.json`);
      const coverageMapJson = JSON.stringify(testCoveragePlugin.coverage);
      await writeFile(coverageMapPath, coverageMapJson);
    } else {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      output = await validate(uri, instance, BASIC);
    }
  } else {
    const schema = uriOrSchema;
    const uri = `urn:uuid:${randomUUID()}`;
    registerSchema(schema, uri, "https://json-schema.org/draft/2020-12/schema");
    try {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      output = await validate(uri, instance, BASIC);
    } finally {
      unregisterSchema(uri);
    }
  }

  return {
    pass: output.valid,
    message: () => JSON.stringify(output, null, "  ")
  };
};

export const toMatchJsonSchema = matchJsonSchema;
