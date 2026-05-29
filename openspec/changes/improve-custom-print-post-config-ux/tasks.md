# Tasks: Improve Custom-Print Post-Configuration UX

> Test-first (GOOS). Progress: 2026-05-29 — status helper + cart copy + editor
> nav + pay-first persist implemented (116 tests). Browser verify pending.

## 1. Status semantics (pure logic)
- [x] 1.1 Unit tests for `customPrintStage(status)` → `action_needed`
      (pending_upload/pending_config), `awaiting_quote` (configured),
      `ready_to_pay` (quoted+), `in_production`, `cancelled`, `unknown`
- [x] 1.2 Implement `utils/customPrintStatus.js`; `isCustomPrintPending` in
      `app/cart/Cart.jsx` now delegates to `isCustomPrintBlockingCheckout`

## 2. Customer-facing copy
- [x] 2.1 Cart banner driven by the helper: `configured` shows reassuring
      "Preparing your quote" (blue); the word "Incomplete" is gone
- [x] 2.2 Only `pending_upload`/`pending_config` show the yellow "Finish your
      print request" message

## 3. Post-save navigation
- [x] 3.2 Replaced the 1.5s `window.location.href` redirects (result.jsx) with
      `router.push` (client nav, deterministic, no full reload)
- [x] 3.3 Success toast retained; destination (cart) refetches request status so
      the just-saved state shows (no stale "incomplete")
- [ ] 3.1 Explicit origin capture (`returnTo`) — currently routes by context
      (custom print → `/cart`, direct order → `/account`, which ARE the origins).
      A `returnTo` param for arbitrary entry points is a small follow-up.

## 4. Coordinate with auto-quote (pay-first)
- [x] 4.1 On custom-print submit, after saving config the editor persists a
      server-authoritative quote via `POST /api/quote` (auto-advances the request
      to `quoted`) using the customer's chosen options/expedite (lifted from
      QuotePanel), then routes to `/cart` ready to pay. Best-effort: quoting
      failure never blocks the save (admin/manual quote remains the fallback).

## 5. Verify
- [x] 5.3 `yarn test:run` green (116); changed files lint-clean
- [ ] 5.1 / 5.2 **BLOCKED — needs browser/human:** manual `/editor` flows
      (configure from cart → returns to cart with correct copy + payable;
      direct print order → returns to order page). Cannot run the interactive
      Three.js/leva editor headlessly.
