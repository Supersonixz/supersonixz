import { z } from "zod";

export { z };

/**
 * Validate env-backed config at boot (D41). Call at module top level in each
 * service entry so a bad config crashes the process before it serves traffic.
 * Secrets come from Infisical via process.env (D40); non-secret defaults live
 * in each service's schema via `.default(...)`.
 */
export function loadConfig<S extends z.ZodType>(
  schema: S,
  env: Record<string, string | undefined> = process.env,
): z.infer<S> {
  const result = schema.safeParse(env);
  if (result.success) return result.data;
  const problems = result.error.issues
    .map((i) => `  ${i.path.join(".") || "(root)"}: ${i.message}`)
    .join("\n");
  throw new Error(`Invalid config:\n${problems}`);
}

/** Shared by every service. Services `.extend()` this with their own vars. */
export const baseSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(3000),
  SENTRY_DSN: z.url().optional(),
});
