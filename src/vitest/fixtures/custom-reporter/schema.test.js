import { expect, test } from "vitest";

test("matches", async () => {
  await expect("a").toMatchJsonSchema("./schema.schema.json");
});
