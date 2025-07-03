# Hyperjump - JSON Schema Test Coverage

This package provides tools for testing JSON Schemas and providing test coverage
for schema files in JSON or YAML in your code base. Integration is provided for
Vitest, but the component for collecting the coverage data is also exposed if
you want to do some other integration.

Validation is done by `@hyperjump/json-schema`, so you can use any version of
JSON Schema supported by that package.

```
-------------|---------|----------|---------|---------|-------------------
File         | % Stmts | % Branch | % Funcs | % Lines | Uncovered Line #s 
-------------|---------|----------|---------|---------|-------------------
All files    |   81.81 |    66.66 |      80 |   88.88 |                   
 schema.json |   81.81 |    66.66 |      80 |   88.88 | 5                 
-------------|---------|----------|---------|---------|-------------------
```

![HTML coverage example](coverage.png)

**Legend**
- **Statements** = Keywords and subschemas
- **Branches** = true/false branches for each keyword (except for keywords that
  don't branch such as annotation-only keywords)
- **Functions** = Subschemas

## Limitations

The following are a list of known limitations. Some might be able to be
addressed at some point, while others might not.

- Keywords can pass/fail for multiple reasons, but not all branches are captured
  - Example: `type: ["object", "boolean"]`. If you test with an object and a
    number, you've covered pass/fail, but haven't tested that a boolean should
    pass.

## Vitest

Integration with vitest is provided. You'll need a vitest config specifically
for running schema coverage. You can't run with coverage for both your js/ts
code and schema code at the same time.

By default, it will track coverage for any file with a `*.schema.json`,
`*.schema.yaml`, or `*.schema.yml` extension. You can change this with the
`include` option.

**Options**

- **include** -- An array of glob paths of schemas you want to track coverage
  for. For example, if you keep your schemas in a folder called `schemas` and
they just have plain extensions (`*.json`) instead of schema extensions
`*.schema.json`, you could use `["./schemas/**/*.json"]`.

`vitest-schema.config.js`
```TypeScript
import { defineConfig } from "vitest/config";
import type { JsonSchemaCoverageProviderOptions } from "@hyperjump/json-schema-coverage/vitest-coverage-provider";

export default defineConfig({
  test: {
    coverage: {
      provider: "custom",
      customProviderModule: "@hyperjump/json-schema-coverage/vitest-coverage-provider",
      include: ["./schemas/**/*.json"] // Optional
    } as JsonSchemaCoverageProviderOptions
  }
});
```

```bash
vitest run --config=vitest-schema.config.js --coverage
```

When you use the provided custom matcher `matchJsonSchema`/`toMatchJsonSchema`,
if vitest has coverage is enabled, it will collect coverage data from those
tests.

```JavaScript
import { describe, expect, test } from "vitest";
import "@hyperjump/json-schema-coverage/vitest-matchers";

describe("Worksheet", () => {
  test("matches with uri", async () => {
    await expect({ foo: 42 }).toMatchJsonSchema("./schema.json");
  });

  test("doesn't match with uri", async () => {
    await expect({ foo: null }).not.toMatchJsonSchema("./schema.json");
  });
});
```

Instead of referring to the file path, you can register the schema and use its
`$id`. Another reason to register a schema is if your schema references another
schema.

```JavaScript
import { describe, expect, test } from "vitest";
import { registerSchema, unregisterSchema } from "@hyperjump/json-schema-coverage/vitest-matchers";

describe("Worksheet", () => {
  beforeEach(() => {
    registerSchema("./schema.json");
  });

  afterEach(() => {
    unregisterSchema("./schema.json");
  });

  test("matches with uri", async () => {
    await expect({ foo: 42 }).toMatchJsonSchema("https://example.com/main");
  });

  test("doesn't match with uri", async () => {
    await expect({ foo: null }).not.toMatchJsonSchema("https://example.com/main");
  });
});
```

You can also use the matcher with inline schemas, but you only get coverage for
schemas from files in your code base.

```JavaScript
import { describe, expect, test } from "vitest";
import "@hyperjump/json-schema-coverage/vitest-matchers";

describe("Worksheet", () => {
  test("matches with schema", async () => {
    await expect("foo").to.matchJsonSchema({ type: "string" });
  });

  test("doesn't match with schema", async () => {
    await expect(42).to.not.matchJsonSchema({ type: "string" });
  });
});
```

## TestCoverageEvaluationPlugin

TODO
