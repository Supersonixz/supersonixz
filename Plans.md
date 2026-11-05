# Supersonixz Plans.md

作成日: 2026-11-05

Rules: `CLAUDE.md`. Decisions referenced as D1…D15 in `.claude/memory/decisions.md`. Phases 2+ are coarse on purpose — break them down when Phase 1 is done.

---

## Phase 0: Monorepo skeleton

| Task | 内容 | DoD | Depends | Status |
|------|------|-----|---------|--------|
| 0.1 | Bun workspaces root: `package.json`, `tsconfig.base.json`, scripts `test`/`typecheck`/`dev`/`db:migrate`, `.gitignore` incl. `.env.local` | `bun install && bun test && bun run typecheck` exit 0 | - | cc:TODO |
| 0.2 | Move `index.html`, `privacy.html` → `apps/landing/` (D1) [tdd:skip:static-move] **gate** | files moved, PR labelled `needs-human`, notified | 0.1 | cc:TODO |
| 0.3 | `packages/db`: Drizzle setup, `auth` + `reading` schemas, first migration on Neon dev branch | `bun run db:migrate` succeeds on dev branch; schema test passes | 0.1 | cc:TODO |

## Phase 1: First slice — sign up, read a free chapter (D3)

| Task | 内容 | DoD | Depends | Status |
|------|------|-----|---------|--------|
| 1.1 | `services/auth`: Better Auth email sign-up/in + JWT plugin + JWKS endpoint (D2) [tdd:required] **gate** | test: sign up → get JWT → verify against JWKS | 0.3 | cc:TODO |
| 1.2 | `services/gateway`: JWKS verify, forward `x-user-id`/`x-user-role`, CORS, in-memory rate limits per ARCHITECTURE routes [tdd:required] **gate** | tests: bad token 401, good token forwards headers, rate limit returns 429 | 1.1 | cc:TODO |
| 1.3 | `services/reading`: catalog (series, chapters) public endpoints [tdd:required] | tests for list series / list chapters | 0.3 | cc:TODO |
| 1.4 | `services/reading`: `GET /chapters/:id/pages` → signed R2 URLs (≈5 min) for `is_free` chapters; 403 otherwise (D10) [tdd:required] | tests: free → URLs, paid without entitlement → 403 | 1.3 | cc:TODO |
| 1.5 | Seed script: one series, one free chapter, pages uploaded to R2 dev bucket | `bun run seed` idempotent; 1.4 test hits real dev data | 1.4 | cc:TODO |
| 1.6 | `apps/web-reader`: next-intl th/en, sign up/in, catalog, read free chapter via Eden Treaty (D15) | component tests pass in th + en; manual check steps listed in PR | 1.2, 1.4 | cc:TODO |
| 1.7 | Reading progress save/restore [tdd:required] | test: save page_index → reload returns it | 1.6 | cc:TODO |

## Phase 2: Money (coarse — break down after Phase 1)

| Task | 内容 | DoD | Depends | Status |
|------|------|-----|---------|--------|
| 2.0 | [spike] Verify Stripe PromptPay one-off limits + Thai 5-yr record retention (D5, D11) | findings appended to decisions.md, notify human | Phase 1 | cc:TODO |
| 2.1 | transaction schema incl. `product_bundles` (D7), shipping fields (D8), outbox | migration + tests | 2.0 | cc:TODO |
| 2.2 | Checkout (card sub, PromptPay pass, one-off purchases) + Stripe webhook → outbox **gate** | Stripe test-mode webhook tests | 2.1 | cc:TODO |
| 2.3 | reading consumes `entitlement.granted/revoked`; plan = all digital (D6) **gate** | test: event → paid chapter unlocks; expiry relocks | 2.2 | cc:TODO |
| 2.4 | Paid-chapter serve-time watermark with sharp (D10) | test: output image differs per userId | 2.3 | cc:TODO |

## Phase 3: Admin, social, marketing (coarse)

| Task | 内容 | DoD | Depends | Status |
|------|------|-----|---------|--------|
| 3.1 | web-admin: presigned R2 page upload (D9), stock, mark-shipped (D8) | tests + manual check in PR | Phase 2 | cc:TODO |
| 3.2 | social service + web-social: posts, comments, chat, report + word blocklist (D12) | tests | Phase 1 | cc:TODO |
| 3.3 | Account self-delete (D11) **gate** | test: user deleted, orders retained, posts anonymised | 3.2 | cc:TODO |
| 3.4 | marketing service: OneSignal announcements | tests | Phase 1 | cc:TODO |

## Open questions

- (loop appends here when blocked)
