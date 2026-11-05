# Supersonixz — Architecture Plan

Thai-translated manga publisher. Solo dev, hundreds → few thousand users in year 1, cheap managed hosting, TypeScript everywhere.

## Repo layout (one monorepo, Bun workspaces)

```
apps/
  web-reader/     Next.js  → app.supersonixz.net     (read + buy + subscribe)
  web-social/     Next.js  → social.supersonixz.net  (posts, comments, chat)
  web-admin/      Vite+React SPA → admin.supersonixz.net (marketing, stock)
  landing/        current static coming-soon page → supersonixz.net
services/
  gateway/        Elysia → api.supersonixz.net
  auth/           Elysia + Better Auth
  reading/        Elysia
  transaction/    Elysia + Stripe
  social/         Elysia + WebSocket
  marketing/      Elysia + OneSignal
packages/
  db/             Drizzle schemas (one Postgres schema per service) + migrations
  ui/             shared React components (reader + social)
```

Frontends call the gateway through Eden Treaty (`@elysiajs/eden`), so request and response types flow from each service to the UI without codegen.

## Services

| Service | Owns | Talks to |
|---|---|---|
| **gateway** | JWT verify, rate limit, CORS, path routing | all services (internal network) |
| **auth** | users, sessions, roles (`reader`, `admin`), JWT issue; email+password, magic link, Google, LINE, X; TOTP 2FA required for admins | OneSignal email |
| **reading** | series, chapters, pages, reading progress, entitlements (read model), admin page upload (presigned PUT) | R2 (signed URLs; paid pages watermarked per user with sharp) |
| **transaction** | products, stock, orders, subscriptions, payments | Stripe; emits `entitlement.granted/revoked` |
| **social** | posts, comments, chat rooms/messages, product refs | reading (product card lookup via gateway) |
| **marketing** | announcements, campaigns, segments | OneSignal API |

**Transaction ↔ reading split.** transaction is the source of truth for "who paid for what". On a Stripe webhook it writes the order, then publishes `entitlement.granted {userId, seriesId|chapterId|plan, expiresAt}`. reading consumes the event into its own `entitlements` table and checks only that table when serving pages. Neither service reads the other's tables.

> ponytail: events go through a Postgres `outbox` table + polling (no broker). Switch to Upstash QStash/Redis streams if delivery lag or volume becomes a problem.

## API gateway routes (`api.supersonixz.net`)

| Path | → Service | Auth | Rate limit |
|---|---|---|---|
| `/auth/*` | auth | public | 10/min/IP on sign-in |
| `/reading/catalog/*` | reading | public | 120/min/IP |
| `/reading/chapters/:id/pages` | reading | user JWT (entitlement checked in service) | 60/min/user |
| `/reading/progress/*` | reading | user | 60/min/user |
| `/tx/checkout`, `/tx/orders/*`, `/tx/subscriptions/*` | transaction | user | 20/min/user |
| `/tx/webhooks/stripe` | transaction | Stripe signature (no JWT) | — |
| `/social/*` (REST) | social | public read / user write | 30 writes/min/user |
| `/social/ws` | social | user (token in query on upgrade) | 5 conns/user |
| `/marketing/subscribe` | marketing | public | 5/min/IP |
| `/admin/*` | any (`/admin/tx/*` → transaction, …) | `role=admin` | 60/min/user |

The gateway verifies the JWT once and forwards `x-user-id` and `x-user-role` to services over the private network. Services trust those headers only from the gateway, which is enforced by keeping them private on Railway's internal network.

> ponytail: in-memory rate limits (single gateway instance). Move to Upstash Redis when running more than one gateway replica.

## DB schema outline (Postgres, one schema per service)

**auth**: `users(id, email nullable, name, role, birth_date, dob_confirmed_at, created_at)`, 2FA tables, `sessions`, `accounts` (Better Auth tables)

**reading**
- `series(id, slug, title_th, title_ja, title_en, author, cover_url, status, rating[all|13+|18+], license_until, on_license_expiry[keep_access|revoke])` — trigram indexes on titles
- `genres`, `series_genres`, `follows(user_id, series_id)`
- `chapters(id, series_id, number, title, is_free, free_from, free_until, published_at)` — free = `is_free OR now() in [free_from, free_until)`
- `pages(id, chapter_id, index, r2_key)`
- `reading_progress(user_id, chapter_id, page_index, updated_at)`
- `reader_prefs(user_id, mode[rtl_page|vertical])`
- `entitlements(user_id, scope_type[series|chapter|plan], scope_id, expires_at)` (fed by transaction events)

**transaction**
- `products(id, type[digital_chapter|digital_series|physical_book|plan], ref_id, price_satang, active)`
- `stock(product_id, quantity, reserved)`: physical items only
- `orders(id, user_id, status, total_satang, stripe_payment_intent, shipping_address jsonb, fulfillment_status[pending|shipped|delivered], tracking_no, created_at)`
- `product_bundles(product_id, grants_scope_type, grants_scope_id)`: physical book → digital entitlement
- `order_items(order_id, product_id, qty, unit_price_satang)`
- `subscriptions(id, user_id, plan_id, stripe_sub_id, status, current_period_end)`
- `outbox(id, event, payload, published_at)`

**social**
- `posts(id, user_id, body, created_at)`
- `post_product_refs(post_id, product_id)`
- `comments(id, post_id|chapter_id, user_id, body, parent_id)`
- `chat_rooms(id, type[dm|group|series], ref_id)`, `chat_members`, `messages(id, room_id, user_id, body, created_at)`
- `reports(id, target_type, target_id, reporter_id, reason, status)`, `blocked_words(word, lang)`; posts/comments/messages get `hidden_at`

**marketing**: `announcements(id, title, body, audience, publish_at)`, `campaigns(id, onesignal_id, status, sent_at)`

## Deployment topology

| Piece | Where | Cost (start) |
|---|---|---|
| web-reader, web-social, web-admin, landing | Vercel (Hobby → Pro when taking payments) | $0 → $20/mo |
| gateway + 5 services | Railway, Bun runtime, private networking; only gateway is public | ~$5–20/mo |
| Postgres | Neon (free tier, branch per PR later) | $0 |
| Manga images | Cloudflare R2 + signed URLs | $0 up to 10 GB, no egress |
| Payments | Stripe (PromptPay + cards + subscriptions) | per-transaction |
| Email/push | OneSignal (existing) — marketing + transactional email | free tier |
| Errors | Sentry (apps + services) | free tier |
| Analytics | PostHog (after cookie consent) | free tier |
| Backups | Neon PITR + nightly `pg_dump` → R2 (GitHub Action, 30 days) | $0 |
| Previews | Vercel preview + Railway PR env + Neon branch per PR | $0–low |

DNS stays on Vercel: `app`, `social` and `admin` point to Vercel; `api` gets a CNAME to the Railway gateway.

Decisions behind these choices: `.claude/memory/decisions.md`.

## Not in v1 (add when needed)
Message broker, Redis, Kubernetes, a separate DB per service, search engine (Postgres full-text first), CI beyond Vercel/Railway auto-deploy, mobile apps.
