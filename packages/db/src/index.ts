import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as authSchema from "./schema/auth";
import * as readingSchema from "./schema/reading";

export const schema = { ...authSchema, ...readingSchema };

export function createDb(url = process.env.DATABASE_URL) {
  if (!url) throw new Error("DATABASE_URL is not set (see .env.local)");
  return drizzle(postgres(url), { schema });
}
