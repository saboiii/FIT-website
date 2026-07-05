# Proposal: Rate-Limit the Quote API (backlog — needs infra)

> Status: **COMPLETE 2026-06-12** (archived; Upstash credentials provided by the client). Was flagged
> from `add-instant-quoting-engine`: the route `app/api/quote/route.js` ships with
> a `TODO(infra)` at the exact point a limiter should run.

## Why

`POST /api/quote` performs work (DB read + compute) and is callable anonymously
for previews. Without rate limiting it can be abused (cost, scraping of pricing,
DoS). A reliable limiter on Vercel's distributed serverless needs a shared store
— an in-memory `Map` only works on a single warm instance and is not dependable.

## What Changes

- Add `@upstash/ratelimit` + `@upstash/redis`, a sliding-window limiter declared
  at module scope, keyed by `userId ?? client IP`, with tighter limits for
  anonymous traffic; return `429` + `Retry-After`/`X-RateLimit-*` headers.
- Apply it at the marked point in the quote route (and reuse for other public
  compute endpoints).

## Impact / Blocker

- **Needs human/infra:** an Upstash Redis instance and the
  `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` environment variables
  added to the deployment. Cannot be completed in-code alone.
- **Code:** `app/api/quote/route.js` (remove the TODO, add the guard); new
  `lib/rateLimit.js`.
- **Alternative if Upstash is undesired:** Vercel's built-in WAF/rate-limiting or
  another shared store — a product/infra decision to confirm.
