import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/schema/*.ts",
  out: "./migrations",
  schemaFilter: ["auth", "reading"],
  // `migrate` script loads ../../.env.local; `generate` needs no DB.
  dbCredentials: { url: process.env.DATABASE_URL ?? "" },
});
