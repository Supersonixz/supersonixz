import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/schema/*.ts",
  out: "./migrations",
  schemaFilter: ["auth", "reading"],
  // DATABASE_URL injected by `infisical run --env=dev --` (D40); `generate` needs no DB.
  dbCredentials: { url: process.env.DATABASE_URL ?? "" },
});
