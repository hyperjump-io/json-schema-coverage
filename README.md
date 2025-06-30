# Hyperjump - JSON Schema Test Coverage

This package provides tools for testing JSON Schemas and providing test coverage
for schema files in your code base. Integration is provided for Vitest, but the
component for collecting the coverage data is also exposed if you want to
do some other integration.

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
- **Branches** = true/false branches for each keyword
- **Functions** = Subschemas

## Limitations

The following are know limitations I'm hopeful can be addressed.

- Coverage can only be reported for `**/*.schema.json` and `**/schema.json`
  files.
- Coverage can't be reported for embedded schemas.
- Schemas in YAML aren't supported.
- Custom vocabularies aren't supported.
- There's no way to load schemas.
- Invalid schemas cause an error to be thrown.
- Coverage maps are generated in the order they're loaded from the filesystem.
  If one references a schema that hasn't been generated yet, an error will be
  thrown.

## Vitest

Integration with vitest is provided. You'll need a vitest config specifically
for running schema coverage. You can't run with coverage for both your js/ts
code and schema at the same time.

`vitest-schema.config.js`
```JavaScript
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    coverage: {
      provider: "custom",
      customProviderModule: "@hyperjump/json-schema-coverage/vitest-coverage-provider"
    }
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

You can also use the matcher with inline schemas, but you only get coverage for
file-based schemas.

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
