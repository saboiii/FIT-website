# Proposal: Two Quote Flows — Instant (simple) and Manual (advanced)

> Status: active. From client manual-testing feedback (#10, #12, #14, #15, #16).
> Depends on `add-instant-quoting-engine` (archived) and
> `add-generic-print-presets` (archived).

## Why

The current cart blocks checkout on "Preparing your quote" for instant requests
and shows `basePrice + printFee` for quoted prints — neither uses
`quote.total` from the Instant Quoting Engine ([Cart.jsx:614]). The simple-mode
panel has no "save" affordance (#10) — the only Save button lives inside the
leva export panel that is hidden when leva is hidden. And custom-print requests
arrive at the cart with `No delivery options` (#14) because nothing populates
`request.delivery.deliveryTypes` for instant prints.

The client's intended split is clean and matches the existing Simple/Advanced
toggle: a simple-mode configuration is an **instant** quote (server-authoritative
price, admin-default delivery, immediately payable, no admin gate), while an
advanced-mode configuration is a **manual** quote (admin reviews, sets price and
delivery; email notification + Stream Chat for negotiation).

## What Changes

### A. Persisted quote mode
- Add `quoteMode: 'instant' | 'manual'` to `CustomPrintRequest`. Default `null`
  until a configuration is saved.
- Add `printConfiguration.generic = { strength, quality, colour, material }` so
  simple-mode selections are first-class (not only as derived leva values).

### B. Simple mode → instant flow
- A dedicated **"Save & Get Instant Quote"** CTA in the simple panel (#10).
- On click: save the config with `mode: 'instant'` + the generic block; POST
  `/api/quote` with the `requestId`, surface failures (no longer best-effort
  silent). On success the request is `quoted`, has admin-default delivery types
  attached, and is immediately payable.
- `POST /api/quote` (persisting branch) auto-applies admin-default delivery for
  print (i.e. every active `additionalDeliveryType` whose
  `applicableToProductTypes` includes `'print'`) when the request has none, and
  records `quoteMode: 'instant'` + the geometry-derived dimensions/weight.

### C. Advanced mode → manual flow
- The advanced leva Save button keeps the request at `configured` (no
  auto-quote), records `quoteMode: 'manual'`, and sends a best-effort admin
  email via `lib/email.js` so the admin knows to review and quote.
- Status copy makes clear that an admin will follow up; Stream Chat is the
  existing communication channel (no new channel infra here).

### D. Cart
- Use `quote.total` for instant prints; keep `basePrice + printFee` for manual
  prints.
- Show the generic (Strength/Quality/Colour) view for instant prints; keep the
  advanced settings view for manual prints (#16).
- Delivery selector populates from the admin-default print delivery types now
  attached at quote time (#14).

## Impact

- **Specs:** `custom-print-requests` (mode, generic block, instant flow),
  `instant-quoting-engine` (auto-apply delivery + dimensions on persist),
  `admin-custom-print-requests` (manual flow remains the existing admin
  set-quote action).
- **Code:** `models/CustomPrintRequest.js`, `lib/quoting/quoteRequest.js`
  (schema), `app/api/quote/route.js`, `app/api/custom-print/config/route.js`,
  `lib/customPrintDelivery.js` (new — pure helper for admin defaults +
  manual-quote email body), `lib/manualQuoteEmail.js` (new — pure body
  builder), `components/Editor/result.jsx`, `app/cart/Cart.jsx`.
- **Tests:** pure unit tests for delivery-default resolution + email body
  builder; extend `tests/integration/quoteRequest.test.js` to assert the schema
  accepts `mode`. Cart/editor wiring is browser-verified.
- **Risks:** non-trivial blast radius (model + 2 routes + cart + editor); each
  slice is small and reversible. Email send needs `GMAIL_USER`/`GMAIL_PASSWORD`
  (already used in repo); if unset the send fails silently — flagged.
