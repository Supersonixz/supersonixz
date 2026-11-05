# Decisions

One line per decision. Newest first. The loop reads this before asking a question; if it's answered here, don't ask.

## 2026-11-05 — v1 grill session

| # | Topic | Decision | Why |
|---|---|---|---|
| D1 | Landing move | Loop moves `index.html`/`privacy.html` → `apps/landing/` on a branch, then **stops**. Human flips Vercel Root Directory, then merges. | Live site; Vercel config is outside the repo. |
| D2 | Auth tokens | Better Auth JWT plugin. Gateway verifies via JWKS fetched from auth (cached). Same short-lived JWT for `/social/ws` query param. | No shared secret, stateless gateway. |
| D3 | First slice | auth + gateway + free chapters from R2. No money until this works end to end. | Proves the full path with zero payment risk. |
| D4 | Done gate | `bun test` + `bun run typecheck` green. Loop uses Stripe **test** keys + Neon **dev branch** via `.env.local` (gitignored). Live keys are human-only. | |
| D5 | Subscription payment | Cards = recurring Stripe subscription. PromptPay = one-off fixed pass (e.g. 30 days, no auto-renew). Loop must verify PromptPay limits in current Stripe docs before building. | PromptPay is believed to be one-off only. |
| D6 | Plan scope | Active plan unlocks **all digital chapters** until `current_period_end`. Cancel = keep access to period end. | One entitlement row, `scope_type=plan`. |
| D7 | Physical → digital | Buying a physical book **also grants** digital entitlement for its chapters. Needs `product_bundles(product_id, grants_scope_type, grants_scope_id)`. | Owner choice. |
| D8 | Shipping | `orders` gets `shipping_address` (jsonb), `fulfillment_status[pending|shipped|delivered]`, `tracking_no`. Admin marks shipped manually. No carrier API. | |
| D9 | Page upload | reading `/admin/series/:id/chapters/:id/uploads` returns presigned R2 PUT URLs; browser uploads direct; reading writes `pages` rows on confirm. | Big files skip the gateway. |
| D10 | Image protection | Free chapters: short-lived (≈5 min) signed R2 URLs. Paid chapters: reading stamps faint userId watermark with `sharp` at serve time, short cache. | Leak tracing for paid content only. |
| D11 | PDPA | Self-serve account delete: profile/posts/chat anonymised or removed. Orders/payments kept 5 yrs (**human to verify** Thai retention rule). No chat auto-expiry. | |
| D12 | Moderation | Report button → admin queue in web-admin (hide content, ban user) + Thai/EN word blocklist checked on write. | |
| D13 | Git flow | Branch + PR per Plans.md task. Loop **may auto-merge** when tests are green and reviewer agent approves — **except** PRs touching approval gates in `CLAUDE.md`. | Speed, with gates on risky areas. |
| D14 | Notify | Push notification only when blocked (approval gate or 2 failures on the same task). Finished work = merged PRs. | Low noise. |
| D15 | i18n | Thai + English from day 1 with `next-intl` (reader, social). web-admin: Thai only. | Owner choice. |
