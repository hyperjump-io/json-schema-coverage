import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, test } from "vitest";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { registerSchema, validate } from "@hyperjump/json-schema/draft-2020-12";
import { CoverageMapService, TestCoverageEvaluationPlugin } from "./index.js";
import { censorCoverageMap } from "./test-utils.js";

describe("TestCoverageEvaluationPlugin", () => {
  /** @type CoverageMapService */
  let coverageMapService;

  const fixtureDirectory = ".test-coverage-evaluation-plugin-fixtures";

  /** @type string */
  let fixturePath;

  /** @type (fixturePath: string, schemaJson: string) => Promise<void> */
  const addSchemaFile = async (fileName, schemaJson) => {
    fixturePath = resolve(fixtureDirectory, fileName);
    await writeFile(fixturePath, schemaJson);

    await coverageMapService.addFromFile(fixturePath);
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

  beforeEach(() => {
    coverageMapService = new CoverageMapService();
  });

  test("root schema", async () => {
    await addSchemaFile("subject.schema.json", `{
  "$schema": "https://json-schema.org/draft/2020-12/schema"
}`);
    const testCoveragePlugin = new TestCoverageEvaluationPlugin(coverageMapService);
    await validate(fixturePath, 42, { plugins: [testCoveragePlugin] });

    expect(censorCoverageMap(testCoveragePlugin.coverage)).toMatchSnapshot();
  });

  test("passing branching keyword", async () => {
    await addSchemaFile("subject.schema.json", `{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "number"
}`);
    const testCoveragePlugin = new TestCoverageEvaluationPlugin(coverageMapService);
    await validate(fixturePath, 42, { plugins: [testCoveragePlugin] });

    expect(censorCoverageMap(testCoveragePlugin.coverage)).toMatchSnapshot();
  });

  test("failing branching keyword", async () => {
    await addSchemaFile("subject.schema.json", `{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "number"
}`);
    const testCoveragePlugin = new TestCoverageEvaluationPlugin(coverageMapService);
    await validate(fixturePath, "foo", { plugins: [testCoveragePlugin] });

    expect(censorCoverageMap(testCoveragePlugin.coverage)).toMatchSnapshot();
  });

  test("both branches of a branching keyword", async () => {
    await addSchemaFile("subject.schema.json", `{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "number"
}`);
    const testCoveragePlugin = new TestCoverageEvaluationPlugin(coverageMapService);
    await validate(fixturePath, 42, { plugins: [testCoveragePlugin] });
    await validate(fixturePath, "foo", { plugins: [testCoveragePlugin] });

    expect(censorCoverageMap(testCoveragePlugin.coverage)).toMatchSnapshot();
  });

  test("non-branching keyword", async () => {
    await addSchemaFile("subject.schema.json", `{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "Foo"
}`);
    const testCoveragePlugin = new TestCoverageEvaluationPlugin(coverageMapService);
    await validate(fixturePath, 42, { plugins: [testCoveragePlugin] });

    expect(censorCoverageMap(testCoveragePlugin.coverage)).toMatchSnapshot();
  });

  test("non-statement keyword", async () => {
    await addSchemaFile("subject.schema.json", `{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$comment": "Foo"
}`);
    const testCoveragePlugin = new TestCoverageEvaluationPlugin(coverageMapService);
    await validate(fixturePath, 42, { plugins: [testCoveragePlugin] });

    expect(censorCoverageMap(testCoveragePlugin.coverage)).toMatchSnapshot();
  });

  test("sub-schema", async () => {
    await addSchemaFile("subject.schema.json", `{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "properties": {
    "foo": true
  }
}`);
    const testCoveragePlugin = new TestCoverageEvaluationPlugin(coverageMapService);
    await validate(fixturePath, { foo: 42 }, { plugins: [testCoveragePlugin] });

    expect(censorCoverageMap(testCoveragePlugin.coverage)).toMatchSnapshot();
  });

  test("sub-schema that isn't evaluated", async () => {
    await addSchemaFile("subject.schema.json", `{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "properties": {
    "foo": true
  }
}`);
    const testCoveragePlugin = new TestCoverageEvaluationPlugin(coverageMapService);
    await validate(fixturePath, 42, { plugins: [testCoveragePlugin] });

    expect(censorCoverageMap(testCoveragePlugin.coverage)).toMatchSnapshot();
  });

  test("embedded schema", async () => {
    await addSchemaFile("subject.schema.json", `{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "properties": {
    "foo": { "$ref": "#/$defs/foo" }
  },
  "$defs": {
    "foo": { "type": "number" }
  }
}`);
    const testCoveragePlugin = new TestCoverageEvaluationPlugin(coverageMapService);
    await validate(fixturePath, { foo: 42 }, { plugins: [testCoveragePlugin] });

    expect(censorCoverageMap(testCoveragePlugin.coverage)).toMatchSnapshot();
  });

  test("reference to a non-file schema", async () => {
    registerSchema({ type: "number" }, "https://example.com/foo", "https://json-schema.org/draft/2020-12/schema");
    await addSchemaFile("subject.schema.json", `{
  "$id": "https://example.com/subject",
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$ref": "/foo"
}`);
    const testCoveragePlugin = new TestCoverageEvaluationPlugin(coverageMapService);
    await validate(fixturePath, 42, { plugins: [testCoveragePlugin] });

    expect(censorCoverageMap(testCoveragePlugin.coverage)).toMatchSnapshot();
  });
});
