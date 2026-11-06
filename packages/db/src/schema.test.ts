import { expect, test } from "bun:test";
import { getTableConfig, type PgTable } from "drizzle-orm/pg-core";
import * as authSchema from "./schema/auth";
import * as readingSchema from "./schema/reading";

const tables = (mod: Record<string, unknown>) =>
  Object.values(mod).filter((v): v is PgTable => {
    try { getTableConfig(v as PgTable); return true; } catch { return false; }
  }).map((t) => getTableConfig(t));

test("auth tables live in the auth schema and include Better Auth core + jwks", () => {
  const t = tables(authSchema);
  expect(t.every((c) => c.schema === "auth")).toBe(true);
  expect(t.map((c) => c.name).sort()).toEqual(["account", "jwks", "session", "user", "verification"]);
});

test("reading tables live in the reading schema and never reference another schema", () => {
  const t = tables(readingSchema);
  expect(t.every((c) => c.schema === "reading")).toBe(true);
  for (const c of t) {
    for (const fk of c.foreignKeys) {
      expect(getTableConfig(fk.reference().foreignTable).schema).toBe("reading");
    }
  }
});

test("chapters support limited-time free windows (D23) and series carry rating + licence (D22, D28)", () => {
  const ch = getTableConfig(readingSchema.chapters).columns.map((c) => c.name);
  expect(ch).toEqual(expect.arrayContaining(["is_free", "free_from", "free_until"]));
  const se = getTableConfig(readingSchema.series).columns.map((c) => c.name);
  expect(se).toEqual(expect.arrayContaining(["rating", "license_until", "on_license_expiry"]));
});
