# Secrets & config

Decisions D40–D43. Two rules:

- **Secret** = would hurt if leaked → lives in **Infisical** only. Never in git, `.env*` files, logs, PRs or chat.
- **Config** = safe to publish (URLs, IDs, limits, flags, public keys) → committed in **`packages/config`**, typed and validated at boot.

If unsure, treat it as a secret.

## Environments

| Infisical env | Used by | Who can read |
|---|---|---|
| `dev` | your laptop + the loop (`infisical run --env=dev -- …`) | you, loop machine identity (read-only) |
| `preview` | Vercel previews + Railway PR environments (synced) | you, Vercel/Railway integrations |
| `prod` | Vercel + Railway production (synced) | **you only** + Vercel/Railway integrations |

The loop never gets `preview` or `prod` access (D42). Staff (D37) never get Infisical access.

Per-PR databases (D32): the Neon ↔ Railway/Vercel integration injects each preview's `DATABASE_URL`; Infisical `preview` holds everything else.

## Running things

```sh
infisical run --env=dev -- bun run dev
infisical run --env=dev -- bun run db:migrate
infisical run --env=dev -- bun test
```

Scripts read `process.env` only — no `--env-file`, no hardcoded paths. Infisical injects; `packages/config` validates.

`.env.local` is allowed **only** for the Infisical machine-identity credentials the loop needs to log in (gitignored). No app secrets in it.

## Secret inventory

| Secret | Service(s) | dev | prod | Rotate | How to rotate |
|---|---|---|---|---|---|
| `DATABASE_URL` | all services | Neon dev branch | Neon main | 90 d | Neon → Roles → reset password → update Infisical `prod` → redeploy Railway |
| `BETTER_AUTH_SECRET` | auth | random | random | 90 d | `openssl rand -base64 32` → Infisical → redeploy auth. Signs sessions: everyone gets logged out |
| JWT signing keys (`auth.jwks`) | auth → gateway | auto | auto | **auto** | Better Auth JWT plugin rotates; gateway refetches JWKS. Never by hand |
| `STRIPE_SECRET_KEY` | transaction | `sk_test_…` | `sk_live_…` | 90 d | Stripe → Developers → API keys → roll key (set overlap window) → Infisical → redeploy |
| `STRIPE_WEBHOOK_SECRET` | transaction | `whsec_` test | `whsec_` live | 90 d | Stripe → Webhooks → endpoint → roll secret → Infisical → redeploy |
| `R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY` | reading | dev bucket token | prod bucket token | 90 d | Cloudflare → R2 → API tokens → create new (bucket-scoped) → Infisical → redeploy → delete old |
| `ONESIGNAL_REST_API_KEY` | marketing, auth (email) | dev app | prod app | 90 d | OneSignal → Settings → Keys → create new → Infisical → redeploy → revoke old |
| `GOOGLE_CLIENT_SECRET` | auth | dev OAuth app | prod OAuth app | on leak | Google Cloud → Credentials → add secret → Infisical → redeploy → disable old |
| `LINE_CHANNEL_SECRET` | auth | dev channel | prod channel | on leak | LINE Developers → channel → reissue → Infisical → redeploy |
| `X_CLIENT_SECRET` | auth | dev app | prod app | on leak | X developer portal → app → regenerate → Infisical → redeploy |
| `SENTRY_AUTH_TOKEN` | build only (source maps) | — | CI/Vercel build | on leak | Sentry → Auth tokens → new → Vercel env → delete old |
| `BACKUP_R2_*` | nightly `pg_dump` GitHub Action (D33) | — | GitHub Actions secret | 90 d | as R2 above, write-only token for the backup bucket |
| Infisical machine identity | loop | `.env.local` | — | 90 d | Infisical → Machine identities → new client secret → `.env.local` → revoke old |

Add a row here **in the same PR** that introduces a new secret (CLAUDE.md rule).

## Config (committed, not secret)

Lives in `packages/config`, one validated object per service. Env vars override defaults, so you can still change these per environment without a deploy.

Examples: `API_URL`, `APP_URL`, `R2_ACCOUNT_ID`, `R2_BUCKET`, signed-URL TTL (300 s), rate limits, `STRIPE_PUBLISHABLE_KEY`, `ONESIGNAL_APP_ID`, `SENTRY_DSN`, `POSTHOG_KEY`, OAuth **client IDs**, feature flags.

Public-by-design keys (publishable, DSN, app IDs, client IDs) are config, not secrets.

A missing/invalid value → the service **exits at boot** with the variable name. Never fall back silently to a default for a secret.

## Rotation routine (D43)

- **Every 90 days** (calendar reminder): rows marked `90 d` above, prod first.
- **Immediately**: anything that leaked (committed, pasted, screenshotted, logged), or everything a departing staff member could see. Then check that service's logs for misuse.
- **Never by hand**: JWT signing keys.

Order for any rotation: create new → update Infisical → redeploy → verify → revoke old. Never revoke first.

## Leak checklist

1. Rotate the key now (steps above).
2. If it was committed: rotating is the fix. Rewriting git history doesn't un-leak it.
3. Check the provider's logs for use between leak and rotation.
4. Record in `.claude/memory/decisions.md` what leaked and what changed so it doesn't repeat.
