# Tasks: Improve Custom-Print Post-Configuration UX

> Test-first (GOOS): the status-copy logic and the "is genuinely incomplete"
> predicate are pure and should be extracted and unit-tested before wiring UI.

## 1. Status semantics (pure logic)
- [ ] 1.1 Failing unit tests for a `customPrintStage(status)` helper mapping each
      status to one of: `action_needed` (pending_upload/pending_config),
      `awaiting_quote` (configured), `ready_to_pay` (quoted+), `in_production`, etc.
- [ ] 1.2 Implement the helper; replace the inline `isCustomPrintPending` array
      check in `app/cart/Cart.jsx` (418–427) with it

## 2. Customer-facing copy
- [ ] 2.1 Update the cart banner (Cart.jsx 984–1012): remove "Incomplete" for
      `configured`; show reassuring "preparing your quote" copy
- [ ] 2.2 Only `pending_upload`/`pending_config` show a "finish your request" CTA

## 3. Post-save navigation
- [ ] 3.1 Capture the editor's origin (where it was launched from) in the store /
      URL when entering `/editor` for a custom print
- [ ] 3.2 Replace the 1.5s `window.location.href` redirect (result.jsx 308/334)
      with router navigation back to the origin, passing `requestId`
- [ ] 3.3 Show an explicit success confirmation; ensure destination shows the
      updated status (no stale "incomplete")

## 4. Coordinate with auto-quote
- [ ] 4.1 When the request is auto-quoted (generic path), route straight to the
      pay step instead of an "awaiting quote" state

## 5. Verify
- [ ] 5.1 Manual: configure from cart → returns to cart with correct status copy
- [ ] 5.2 Manual: configure a direct print order → returns to the order page
- [ ] 5.3 `yarn test:run` green
