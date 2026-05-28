# Proposal: Improve Custom-Print Post-Configuration UX

## Why

Two related complaints about what happens *after* a customer finishes configuring
a custom print:

1. **Navigation (client note 1):** After clicking "Save Print Config" the user
   isn't reliably returned to the order/request page. Today
   `submitConfiguration` in `components/Editor/result.jsx` (~lines 260–343) saves
   via `PUT /api/custom-print/config`, then does a **fixed 1.5s-delayed full-page
   redirect** (`window.location.href = '/cart'` at line 334, or `/account` at
   line 308 for direct orders). This is fragile (timing-based, full reload, loses
   client state) and always lands on `/cart` regardless of where the editor was
   launched from.

2. **Alarming "Incomplete" wording (client note 5):** After saving, the request
   status becomes `configured` (awaiting an admin quote). In `app/cart/Cart.jsx`,
   `isCustomPrintPending` (lines 418–427) treats `pending_upload`,
   `pending_config`, **and** `configured` as "pending", and the banner logic
   (lines 984–1012) shows a yellow **"Custom Print Request Incomplete"** warning
   whenever any item isn't fully configured. Users who *have* finished their part
   read "Incomplete" as "I did something wrong," when they are simply waiting for
   a quote. (A fully-configured cart does show a blue "Awaiting Quote" banner, but
   stale request data right after the redirect, or any mixed/edge state, surfaces
   the alarming wording.)

## What Changes

- Replace the timed `window.location.href` redirect with deterministic
  client-side navigation back to the **originating context** (the page the editor
  was launched from), carrying the `requestId`, with an explicit success
  confirmation. Capture the origin when launching the editor (store/URL param).
- Ensure the destination reflects the just-saved status immediately (refetch /
  pass the updated request) so the user never sees stale "incomplete" state.
- Rework the customer-facing status copy so it distinguishes:
  - **Action needed by you** (`pending_upload`, `pending_config`) → "Finish your
    print request" (the only genuinely "incomplete" state).
  - **Awaiting quote** (`configured`, pre-instant-quote path) → reassuring
    "We're preparing your quote" — never the word "Incomplete".
  - **Ready to pay** (`quoted`+) → proceed to checkout.

## Impact

- **Specs:** modifies `3d-model-editor` (post-save navigation) and
  `custom-print-requests` (customer status communication).
- **Code:** `components/Editor/result.jsx` (submit handler + navigation),
  `app/editor/page.jsx` / `utils/store.js` (capture origin), `app/cart/Cart.jsx`
  (`isCustomPrintPending` + banner copy at 984–1012).
- **Depends on / coordinates with:** `add-instant-quoting-engine` and
  `add-generic-print-presets` — once generic configs are auto-quoted, a generic
  request jumps `configured → quoted` instantly and should route straight to
  payment, so the banner logic must account for the auto-quote path. Sequence
  this change *after* those two. See `openspec/ROADMAP.md`.
- **Risk:** low; UI/flow only. Verify all editor entry points (cart custom-print,
  direct print order) return to the correct origin.
