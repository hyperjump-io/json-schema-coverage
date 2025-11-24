import { afterAll, afterEach, beforeAll, describe, expect, test } from "vitest";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { CoverageMapService } from "./index.js";
import { registerSchema, unregisterSchema } from "@hyperjump/json-schema/draft-2020-12";
import "@hyperjump/json-schema/draft-07";
import { buildSchemaDocument } from "@hyperjump/json-schema/experimental";
import { addMediaTypePlugin, removeMediaTypePlugin } from "@hyperjump/browser";
import contentTypeParser from "content-type";
import YAML from "yaml";
import { censorCoverageMap } from "./test-utils.js";

/**
 * @import { CoverageMapData } from "istanbul-lib-coverage"
 * @import { SchemaObject } from "@hyperjump/json-schema"
 */

describe("CoverageMapService JSON", () => {
  const fixtureDirectory = ".coverage-map-service-fixtures";
  /** @type string */
  let fixturePath;

  /** @type (fileName: string, schemaJson: string) => Promise<CoverageMapData> */
  const coverageMapFor = async (fileName, schemaJson) => {
    fixturePath = resolve(fixtureDirectory, fileName);
    await writeFile(fixturePath, schemaJson);

    const service = new CoverageMapService();
    const schemaUri = await service.addFromFile(fixturePath);
    const coverageMap = service.getCoverageMap(schemaUri);

    return censorCoverageMap(coverageMap);
  };

  beforeAll(async () => {
    await mkdir(fixtureDirectory, { recursive: true });
  });

  afterAll(async () => {
    await rm(fixtureDirectory, { recursive: true });
  });

  afterEach(async () => {
    await rm(fixturePath);
  });

  test("minimal schema", async () => {
    const coverageMap = await coverageMapFor("subject.schema.json", `{
  "$schema": "https://json-schema.org/draft/2020-12/schema"
}`);

    expect(coverageMap).toMatchSnapshot();
  });

  test("keywords", async () => {
    const coverageMap = await coverageMapFor("subject.schema.json", `{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object"
}`);

    expect(coverageMap).toMatchSnapshot();
  });

  test("schemas", async () => {
    const coverageMap = await coverageMapFor("subject.schema.json", `{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "properties": {
    "foo": true
  }
}`);

    expect(coverageMap).toMatchSnapshot();
  });

  test("nested keywords", async () => {
    const coverageMap = await coverageMapFor("subject.schema.json", `{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "properties": {
    "foo": { "type": "number" }
  }
}`);

    expect(coverageMap).toMatchSnapshot();
  });

  test("title doesn't branch", async () => {
    const coverageMap = await coverageMapFor("subject.schema.json", `{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "Foo"
}`);

    expect(coverageMap).toMatchSnapshot();
  });

  test("description doesn't branch", async () => {
    const coverageMap = await coverageMapFor("subject.schema.json", `{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "description": "Foo"
}`);

    expect(coverageMap).toMatchSnapshot();
  });

  test("default doesn't branch", async () => {
    const coverageMap = await coverageMapFor("subject.schema.json", `{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "default": "Foo"
}`);

    expect(coverageMap).toMatchSnapshot();
  });

  test("deprecated doesn't branch", async () => {
    const coverageMap = await coverageMapFor("subject.schema.json", `{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "deprecated": true
}`);

    expect(coverageMap).toMatchSnapshot();
  });

  test("readOnly doesn't branch", async () => {
    const coverageMap = await coverageMapFor("subject.schema.json", `{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "readOnly": true
}`);

    expect(coverageMap).toMatchSnapshot();
  });

  test("writeOnly doesn't branch", async () => {
    const coverageMap = await coverageMapFor("subject.schema.json", `{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "readOnly": true
}`);

    expect(coverageMap).toMatchSnapshot();
  });

  test("examples doesn't branch", async () => {
    const coverageMap = await coverageMapFor("subject.schema.json", `{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "examples": ["Foo"]
}`);

    expect(coverageMap).toMatchSnapshot();
  });

  test("2020-12 format doesn't branch", async () => {
    const coverageMap = await coverageMapFor("subject.schema.json", `{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "format": "date"
}`);

    expect(coverageMap).toMatchSnapshot();
  });

  test("2019-09 format doesn't branch", async () => {
    const coverageMap = await coverageMapFor("subject.schema.json", `{
  "$schema": "https://json-schema.org/draft/2019-09/schema",
  "format": "date"
}`);

    expect(coverageMap).toMatchSnapshot();
  });

  test("$ref doesn't branch", async () => {
    const coverageMap = await coverageMapFor("subject.schema.json", `{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$ref": "#/$defs/foo",
  "$defs": {
    "foo": true
  }
}`);

    expect(coverageMap).toMatchSnapshot();
  });

  test("allOf doesn't branch", async () => {
    const coverageMap = await coverageMapFor("subject.schema.json", `{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "allOf": [true]
}`);

    expect(coverageMap).toMatchSnapshot();
  });

  test("properties doesn't branch", async () => {
    const coverageMap = await coverageMapFor("subject.schema.json", `{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "properties": {}
}`);

    expect(coverageMap).toMatchSnapshot();
  });

  test("patternProperties doesn't branch", async () => {
    const coverageMap = await coverageMapFor("subject.schema.json", `{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "patternProperties": {}
}`);

    expect(coverageMap).toMatchSnapshot();
  });

  test("addtionalProperties doesn't branch", async () => {
    const coverageMap = await coverageMapFor("subject.schema.json", `{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "addtionalProperties": true
}`);

    expect(coverageMap).toMatchSnapshot();
  });

  test("propertyNames doesn't branch", async () => {
    const coverageMap = await coverageMapFor("subject.schema.json", `{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "propertyNames": true
}`);

    expect(coverageMap).toMatchSnapshot();
  });

  test("items doesn't branch", async () => {
    const coverageMap = await coverageMapFor("subject.schema.json", `{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "items": true
}`);

    expect(coverageMap).toMatchSnapshot();
  });

  test("prefixItems doesn't branch", async () => {
    const coverageMap = await coverageMapFor("subject.schema.json", `{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "prefixItems": [true]
}`);

    expect(coverageMap).toMatchSnapshot();
  });

  test("draft-04 items doesn't branch", async () => {
    const coverageMap = await coverageMapFor("subject.schema.json", `{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "items": true
}`);

    expect(coverageMap).toMatchSnapshot();
  });

  test("additionalItems doesn't branch", async () => {
    const coverageMap = await coverageMapFor("subject.schema.json", `{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "additionalItems": true
}`);

    expect(coverageMap).toMatchSnapshot();
  });

  test("if doesn't branch", async () => {
    const coverageMap = await coverageMapFor("subject.schema.json", `{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "if": true
}`);

    expect(coverageMap).toMatchSnapshot();
  });

  test("then doesn't branch", async () => {
    const coverageMap = await coverageMapFor("subject.schema.json", `{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "then": true
}`);

    expect(coverageMap).toMatchSnapshot();
  });

  test("else doesn't branch", async () => {
    const coverageMap = await coverageMapFor("subject.schema.json", `{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "else": true
}`);

    expect(coverageMap).toMatchSnapshot();
  });

  test("dependentSchemas doesn't branch", async () => {
    const coverageMap = await coverageMapFor("subject.schema.json", `{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "dependentSchemas": {
    "foo": true
  }
}`);

    expect(coverageMap).toMatchSnapshot();
  });

  test("$dynamicRef doesn't branch", async () => {
    const coverageMap = await coverageMapFor("subject.schema.json", `{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$dynamicAnchor": "foo",
  "$dynamicRef": "#foo"
}`);

    expect(coverageMap).toMatchSnapshot();
  });

  test("unevaluatedProperties doesn't branch", async () => {
    const coverageMap = await coverageMapFor("subject.schema.json", `{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "unevaluatedProperties": true
}`);

    expect(coverageMap).toMatchSnapshot();
  });

  test("unevaluatedItems doesn't branch", async () => {
    const coverageMap = await coverageMapFor("subject.schema.json", `{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "unevaluatedItems": true
}`);

    expect(coverageMap).toMatchSnapshot();
  });

  test("unknown keywords don't branch", async () => {
    const coverageMap = await coverageMapFor("subject.schema.json", `{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "x-foo": "Foo"
}`);

    expect(coverageMap).toMatchSnapshot();
  });

  test("$comment isn't a statement", async () => {
    const coverageMap = await coverageMapFor("subject.schema.json", `{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$comment": "Foo"
}`);

    expect(coverageMap).toMatchSnapshot();
  });

  test("$defs isn't a statement", async () => {
    const coverageMap = await coverageMapFor("subject.schema.json", `{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$defs": {}
}`);

    expect(coverageMap).toMatchSnapshot();
  });

  test("self-identifying schema", async () => {
    const coverageMap = await coverageMapFor("subject.schema.json", `{
  "$id": "https://example.com/subject",
  "$schema": "https://json-schema.org/draft/2020-12/schema"
}`);

    expect(coverageMap).toMatchSnapshot();
  });

  test("embedded schema", async () => {
    const coverageMap = await coverageMapFor("subject.schema.json", `{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$ref": "https://example.com/foo",
  "$defs": {
    "foo": {
      "$id": "https://example.com/foo",
      "type": "string"
    }
  }
}`);

    expect(coverageMap).toMatchSnapshot();
  });

  test("invalid json", async () => {
    const coverageMapPromise = coverageMapFor("subject.schema.json", `***`);

    await expect(coverageMapPromise).rejects.to.throw(Error);
  });

  describe("with YAML media type plugin", () => {
    beforeAll(() => {
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
    });

    afterAll(() => {
      removeMediaTypePlugin("application/schema+yaml");
    });

    test("with .schema.yaml extension", async () => {
      const coverageMap = await coverageMapFor("subject.schema.yaml", `
$id: 'https://example.com/main'
$schema: 'https://json-schema.org/draft/2020-12/schema'
`);

      expect(coverageMap).toMatchSnapshot();
    });

    test("with .schema.yml extension", async () => {
      const coverageMap = await coverageMapFor("subject.schema.yml", `
$id: 'https://example.com/main'
$schema: 'https://json-schema.org/draft/2020-12/schema'
`);

      expect(coverageMap).toMatchSnapshot();
    });

    test("with .yaml extension", async () => {
      const coverageMap = await coverageMapFor("subject.yaml", `
$id: 'https://example.com/main'
$schema: 'https://json-schema.org/draft/2020-12/schema'
`);

      expect(coverageMap).toMatchSnapshot();
    });

    test("with .yml extension", async () => {
      const coverageMap = await coverageMapFor("subject.yml", `
$id: 'https://example.com/main'
$schema: 'https://json-schema.org/draft/2020-12/schema'
`);

      expect(coverageMap).toMatchSnapshot();
    });

    test("YAML features", async () => {
      const coverageMap = await coverageMapFor("subject.yml", `
$id: 'https://example.com/main'
$schema: 'https://json-schema.org/draft/2020-12/schema'
properties:
  foo: { $ref: '#/$defs/foo' }
  bar: true
anyOf:
  - required: [foo]
  - required: [bar]
$defs:
  foo:
    type: object
`);

      expect(coverageMap).toMatchSnapshot();
    });

    test("invalid YAML", async () => {
      const coverageMapPromise = coverageMapFor("subject.yml", `***`);

      await expect(coverageMapPromise).rejects.to.throw(Error);
    });
  });

  describe("with .foo media type plugin", () => {
    beforeAll(() => {
      addMediaTypePlugin("application/foo+json", {
        parse: async (response) => {
          const contentType = contentTypeParser.parse(response.headers.get("content-type") ?? "");
          const contextDialectId = contentType.parameters.schema ?? contentType.parameters.profile;

          /** @type SchemaObject */
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          const json = await response.json();
          return buildSchemaDocument(json, response.url, contextDialectId);
        },
        // eslint-disable-next-line @typescript-eslint/require-await
        fileMatcher: async (path) => /\.foo$/i.test(path)
      });
    });

    afterAll(() => {
      removeMediaTypePlugin("application/foo+json");
    });

    test("unsupported file extension", async () => {
      const coverageMapPromise = coverageMapFor("subject.foo", `{
  "$schema": "https://json-schema.org/draft/2020-12/schema"
}`);

      await expect(coverageMapPromise).rejects.to.throw(Error);
    });
  });

  describe("with non-file schema", () => {
    const schemaUri = "https://example.com/foo";

    beforeAll(() => {
      registerSchema({}, schemaUri, "https://json-schema.org/draft/2020-12/schema");
    });

    afterAll(() => {
      unregisterSchema(schemaUri);
    });

    test("reference to non-file schema", async () => {
      const coverageMap = await coverageMapFor("subject.schema.json", `{
  "$id": "https://example.com/subject",
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$ref": "/foo"
}`);

      expect(coverageMap).toMatchSnapshot();
    });
  });
});
