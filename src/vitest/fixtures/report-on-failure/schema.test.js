import { expect, test } from "vitest";

// Generates real coverage data, then fails for an unrelated reason, so the
// tests in `../../coverage-provider.test.js` can check what happens to
// coverage reporting/cleanup when a test run has failures.
test("fails after generating coverage", async () => {
  await expect({ name: "a" }).toMatchJsonSchema("./schema.schema.json");
  expect(true).toBe(false);
});
