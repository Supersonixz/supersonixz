# Supersonixz — agent rules

Thai-translated manga publisher. Architecture: `docs/ARCHITECTURE.md`. Decisions: `.claude/memory/decisions.md`. Work queue: `Plans.md`.

Read all three before starting a task. If a decision is already recorded, follow it, don't re-ask.

## Stack
Bun workspaces monorepo · TypeScript everywhere · Elysia services · Next.js (reader, social) · Vite+React (admin) · Drizzle + Neon Postgres · Better Auth (JWT plugin) · Stripe · Cloudflare R2 · OneSignal.

## Commands
Created by task 0.1 — keep these names stable:
- `bun install`
- `bun test` — all workspaces
- `bun run typecheck` — `tsc --noEmit` across workspaces
- `bun run dev` — all services + apps locally
- `bun run db:migrate` — Drizzle migrations against `DATABASE_URL` (dev branch only)

**Done = `bun test` and `bun run typecheck` both green.** No exceptions, no skipped tests to get there.

## Conventions
- Code, comments, commits, PR text: English. UI strings: Thai + English via `next-intl` message files, never inline (web-admin: Thai only, still in one messages file).
- One Postgres schema per service. A service never reads another service's tables — use the outbox events or the gateway.
- Services trust `x-user-id` / `x-user-role` only because they are private on Railway. Never expose a service port publicly.
- Money = integer **satang** (Stripe's minor unit), columns named `*_satang`. Never floats.
- No new dependency without a one-line reason in the PR. Prefer what's already installed.
- Secrets live in `.env.local` (gitignored). Never commit keys, never print them in logs or PRs.

## Git flow
- One branch + one PR per Plans.md task: `task/<id>-<slug>`. Never push to `main` directly.
- Update the task's Status in `Plans.md` in the same PR (`cc:WIP` → `cc:完了`).
- Auto-merge allowed when: tests + typecheck green **and** reviewer agent approves **and** the PR touches no approval gate below.
- Merging to `main` deploys to production once Vercel/Railway are linked. Treat every merge as a deploy.
- Max **5 auto-merged PRs per day** (D25). After the 5th, keep working but leave PRs open.
- At the end of each Plans.md phase, **stop** and push-notify for re-plan. Don't start the next phase.
- Runs locally in git worktrees (D24); each worktree copies `.env.local` from the main checkout.

## Approval gates — stop, label PR `needs-human`, push-notify, do not merge
1. Deploy/infra config: Vercel/Railway settings, DNS, `vercel.json`, `railway.*`, moving the landing page (decision D1).
2. Database migrations that drop/rename columns or tables, or anything run against a non-dev Neon branch.
3. Payments: Stripe webhook handler, checkout, refunds, entitlement grant/revoke logic, anything with live keys.
4. Auth: JWT signing/verification, JWKS, role checks, session handling.
5. User data / PDPA: account deletion, data export, retention.
6. A new service, a new paid SaaS, or a new top-level dependency.
7. Anything `decisions.md` marks **human to verify**.
8. DNS / sending-domain / OAuth app setup (LINE, Google, X, OneSignal email) — loop writes the code, human creates the external apps and keys.

## When blocked
- Same task fails twice → set Status `blocked: <reason>`, push-notify, move to the next unblocked task.
- Missing decision → add the question under `## Open questions` in `Plans.md`, mark the task `blocked`, push-notify, move on. Don't guess.
- Don't notify for finished tasks — the merged PR is the report.
