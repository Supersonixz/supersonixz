import { expect, test } from "bun:test";

// ponytail: keeps `bun test` green until real workspaces bring their own tests
test("workspace root runs tests", () => {
  expect(1 + 1).toBe(2);
});
