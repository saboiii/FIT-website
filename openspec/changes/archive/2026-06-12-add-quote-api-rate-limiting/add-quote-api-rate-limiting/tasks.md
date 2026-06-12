# Tasks: Rate-Limit the Quote API

- [x] 1.1 Upstash env vars added to the deployment by the client (2026-06-12,
      with eviction-on-max-size enabled on the Upstash side).
- [x] 1.2 `lib/rateLimit.js` — module-scope sliding-window limiters
      (authed 60/min by userId, anonymous 15/min by first x-forwarded-for IP);
      no-op with a single warning when env vars are unset (dev/CI); fail-open
      if Redis errors. Pure helpers (`clientIpFrom`, `rateLimitHeaders`)
      unit-tested.
- [x] 1.3 Wired into `POST /api/quote` before any DB work; 429 +
      Retry-After/X-RateLimit-* on limit. Auth moved to the top of the handler
      (single `auth()` call serves both limiter keying and the persist branch).
- [x] 1.4 `yarn test:run` green (233).
