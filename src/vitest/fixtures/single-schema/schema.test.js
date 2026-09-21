import { expect, test } from "vitest";

// Only the "name" property (and the "true" branch of its `type` keyword) is
// exercised. `age` and the `required` keyword's "false" branch are left
// uncovered, giving predictable, partial statement/branch coverage for the
// threshold tests in `../../coverage-provider.test.js` to check against.
test("matches", async () => {
  await expect({ name: "a" }).toMatchJsonSchema("./schema.schema.json");
});
