import { randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import { writeFile } from "node:fs/promises";
import { expect } from "vitest";
import { registerSchema, unregisterSchema, validate } from "@hyperjump/json-schema/draft-2020-12";
import "@hyperjump/json-schema/draft-2019-09";
import "@hyperjump/json-schema/draft-07";
import "@hyperjump/json-schema/draft-06";
import "@hyperjump/json-schema/draft-04";
import { BASIC } from "@hyperjump/json-schema/experimental";
import { TestCoverageEvaluationPlugin } from "../test-coverage-evaluation-plugin.js";

/**
 * @import { OutputUnit } from "@hyperjump/json-schema"
 */

expect.extend({
  async matchJsonSchema(instance, uriOrSchema) {
    /** @type OutputUnit */
    let output;

    const isCoverageEnabled = existsSync(".json-schema-coverage");
    const plugins = isCoverageEnabled
      ? [new TestCoverageEvaluationPlugin()]
      : [];

    if (typeof uriOrSchema === "string") {
      const uri = uriOrSchema;

      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      output = await validate(uri, instance, {
        outputFormat: BASIC,
        plugins: plugins
      });
    } else {
      const schema = uriOrSchema;
      const uri = `urn:uuid:${randomUUID()}`;
      registerSchema(schema, uri, "https://json-schema.org/draft/2020-12/schema");
      try {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        output = await validate(uri, instance, {
          outputFormat: BASIC,
          plugins: plugins
        });
      } finally {
        unregisterSchema(uri);
      }
    }

    if (isCoverageEnabled) {
      const testCoveragePlugin = plugins[0];
      await writeFile(`.json-schema-coverage/${randomUUID()}.json`, JSON.stringify(testCoveragePlugin.coverageMap, null, "  "));
    }

    return {
      pass: output.valid,
      message: () => JSON.stringify(output, null, "  ")
    };
  }
});
