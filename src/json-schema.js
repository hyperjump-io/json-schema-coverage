import "@hyperjump/json-schema/draft-2020-12";
import "@hyperjump/json-schema/draft-2019-09";
import "@hyperjump/json-schema/draft-07";
import "@hyperjump/json-schema/draft-06";
import "@hyperjump/json-schema/draft-04";
import "@hyperjump/json-schema/openapi-3-0";
import "@hyperjump/json-schema/openapi-3-1";
import { buildSchemaDocument } from "@hyperjump/json-schema/experimental";
import { addMediaTypePlugin } from "@hyperjump/browser";
import contentTypeParser from "content-type";
import YAML from "yaml";

/**
 * @import { SchemaObject } from "@hyperjump/json-schema"
 */

addMediaTypePlugin("application/schema+json", {
  parse: async (response) => {
    const contentType = contentTypeParser.parse(response.headers.get("content-type") ?? "");
    const contextDialectId = contentType.parameters.schema ?? contentType.parameters.profile;

    /** @type SchemaObject */
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const json = await response.json();
    return buildSchemaDocument(json, response.url, contextDialectId);
  },
  // eslint-disable-next-line @typescript-eslint/require-await
  fileMatcher: async (path) => /\.json$/i.test(path)
});

addMediaTypePlugin("application/schema+yaml", {
  parse: async (response) => {
    const contentType = contentTypeParser.parse(response.headers.get("content-type") ?? "");
    const contextDialectId = contentType.parameters.schema ?? contentType.parameters.profile;

    /** @type SchemaObject */
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const yaml = YAML.parse(await response.text());
    return buildSchemaDocument(yaml, response.url, contextDialectId);
  },
  // eslint-disable-next-line @typescript-eslint/require-await
  fileMatcher: async (path) => /\.ya?ml$/i.test(path)
});

export * from "@hyperjump/json-schema/draft-2020-12";
