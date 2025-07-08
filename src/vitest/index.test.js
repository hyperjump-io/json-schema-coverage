import { afterAll, afterEach, beforeAll, describe, expect, test } from "vitest";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { registerSchema, unregisterSchema } from "./index.js";

describe("Worksheet", () => {
  test("matches with schema", async () => {
    await expect("foo").to.matchJsonSchema({ type: "string" });
  });

  test("doesn't match with schema", async () => {
    await expect(42).to.not.matchJsonSchema({ type: "string" });
  });

  test("match failure returns BASIC output", async () => {
    try {
      await expect(42).to.matchJsonSchema({
        $id: "https://example.com/main",
        type: "string"
      });
      expect.fail();
    } catch (error) {
      expect(/** @type Error */ (error).message).toMatchSnapshot();
    }
  });

  describe("with file-based schema in JSON", () => {
    const fixtureDirectory = ".vitest-matchers-json-fixtures";

    /** @type string */
    let fixturePath;

    /** @type (fixturePath: string, schemaJson: string) => Promise<void> */
    const addSchemaFile = async (fileName, schemaJson) => {
      fixturePath = resolve(fixtureDirectory, fileName);
      await writeFile(fixturePath, schemaJson);
    };

    beforeAll(async () => {
      await mkdir(fixtureDirectory, { recursive: true });
    });

    afterEach(async () => {
      await unregisterSchema(fixturePath);
      await rm(fixturePath);
    });

    afterAll(async () => {
      await rm(fixtureDirectory, { recursive: true });
    });

    test("match with registered schema's $id (json)", async () => {
      await addSchemaFile("subject.schema.json", `{
  "$id": "https://example.com/subject",
  "$schema": "https://json-schema.org/draft/2020-12/schema"
}`);
      await registerSchema(fixturePath);
      await expect(42).to.matchJsonSchema("https://example.com/subject");
    });

    test("match with schema's path (json)", async () => {
      await addSchemaFile("subject.schema.json", `{
  "$schema": "https://json-schema.org/draft/2020-12/schema"
}`);
      await expect(42).to.matchJsonSchema(fixturePath);
    });

    test("match with registered schema's $id (yaml)", async () => {
      await addSchemaFile("subject.schema.yaml", `
$id: 'https://example.com/subject'
$schema: 'https://json-schema.org/draft/2020-12/schema'
`);
      await registerSchema(fixturePath);
      await expect(42).to.matchJsonSchema("https://example.com/subject");
    });

    test("match with schema's path (yaml)", async () => {
      await addSchemaFile("subject.schema.yaml", `
$schema: 'https://json-schema.org/draft/2020-12/schema'
`);
      await expect(42).to.matchJsonSchema(fixturePath);
    });

    test("match with registered schema's $id (yml)", async () => {
      await addSchemaFile("subject.schema.yml", `
$id: 'https://example.com/subject'
$schema: 'https://json-schema.org/draft/2020-12/schema'
`);
      await registerSchema(fixturePath);
      await expect(42).to.matchJsonSchema("https://example.com/subject");
    });

    test("match with schema's path (yml)", async () => {
      await addSchemaFile("subject.schema.yml", `
$schema: 'https://json-schema.org/draft/2020-12/schema'
`);
      await expect(42).to.matchJsonSchema(fixturePath);
    });

    test("registered with draft-04 id", async () => {
      await addSchemaFile("subject.schema.json", `{
  "id": "https://example.com/subject",
  "$schema": "http://json-schema.org/draft-04/schema#"
}`);
      await registerSchema(fixturePath);
      await expect(42).to.matchJsonSchema("https://example.com/subject");
    });
  });
});
