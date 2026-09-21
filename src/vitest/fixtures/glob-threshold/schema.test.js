import { expect, test } from "vitest";

// Both branches of "type" are exercised, giving 100% branch coverage.
test("covered", async () => {
  await expect(42).toMatchJsonSchema("./covered.schema.json");
  await expect("foo").not.toMatchJsonSchema("./covered.schema.json");
});

// Only the "true" branch of "type" is exercised, giving 50% branch coverage.
test("uncovered", async () => {
  await expect(42).toMatchJsonSchema("./uncovered.schema.json");
});
