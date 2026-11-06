import { expect, test } from "bun:test";
import { baseSchema, loadConfig, z } from "./index";

const schema = baseSchema.extend({
  DATABASE_URL: z.url(),
  SIGNED_URL_TTL_SECONDS: z.coerce.number().int().positive().default(300),
});

test("valid env parses, coerces numbers and applies defaults", () => {
  const cfg = loadConfig(schema, { DATABASE_URL: "postgres://u:p@localhost:5432/db", PORT: "8080" });
  expect(cfg.PORT).toBe(8080);
  expect(cfg.NODE_ENV).toBe("development");
  expect(cfg.SIGNED_URL_TTL_SECONDS).toBe(300);
});

test("missing required var throws and names it", () => {
  expect(() => loadConfig(schema, {})).toThrow(/DATABASE_URL/);
});

test("invalid value throws and names it", () => {
  expect(() =>
    loadConfig(schema, { DATABASE_URL: "postgres://localhost/db", PORT: "not-a-port" }),
  ).toThrow(/PORT/);
});

test("error message never echoes the secret value", () => {
  const secret = "sk_live_should_not_leak";
  try {
    loadConfig(schema.extend({ STRIPE_SECRET_KEY: z.string().startsWith("sk_test_") }), {
      DATABASE_URL: "postgres://localhost/db",
      STRIPE_SECRET_KEY: secret,
    });
    throw new Error("expected loadConfig to throw");
  } catch (e) {
    expect(String(e)).toContain("STRIPE_SECRET_KEY");
    expect(String(e)).not.toContain(secret);
  }
});

test("enum failures don't echo the received value either", () => {
  const secret = "prod_secret_value";
  expect(() => loadConfig(baseSchema, { NODE_ENV: secret })).toThrow(/NODE_ENV/);
  expect(() => loadConfig(baseSchema, { NODE_ENV: secret })).not.toThrow(new RegExp(secret));
});
