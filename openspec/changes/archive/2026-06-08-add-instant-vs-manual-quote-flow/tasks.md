# Tasks: Two Quote Flows — Instant and Manual

## 1. Pure foundations (tests first)
- [x] 1.1 `lib/customPrintDelivery.js` — `resolveCustomPrintDeliveryDefaults(types)`
      returns active `additionalDeliveryType`s where
      `applicableToProductTypes` includes `'print'`, mapped to the request
      `delivery.deliveryTypes` shape.
- [x] 1.2 `lib/manualQuoteEmail.js` — `buildManualQuoteAdminEmail({request})`
      returns `{subject, html}` (no I/O; pure body builder).
- [x] 1.3 Unit tests for both helpers.

## 2. Model & validation
- [x] 2.1 Add `quoteMode: 'instant'|'manual'` and `printConfiguration.generic`
      to `CustomPrintRequest`.
- [x] 2.2 `QuoteInputSchema` accepts optional `mode: 'instant'|'manual'`;
      integration test (`tests/integration/quoteRequest.test.js`) confirms.

## 3. /api/quote (persisting branch)
- [x] 3.1 When persisting (requestId + auth), set `quoteMode = 'instant'`.
- [x] 3.2 If `request.delivery.deliveryTypes` is empty, apply admin defaults via
      `resolveCustomPrintDeliveryDefaults`.
- [x] 3.3 Set `request.dimensions` from metrics + `quote.inputs.weightGrams`
      (kg) so delivery pricing tiers work.

## 4. /api/custom-print/config (PUT)
- [x] 4.1 Accept optional `generic` and `mode`. Persist on
      `printConfiguration.generic` and `quoteMode`.
- [x] 4.2 If `mode === 'manual'`, best-effort send `buildManualQuoteAdminEmail`
      via `lib/email.js`; never block the save on email failure.

## 5. Editor
- [x] 5.1 Simple panel gets a primary **Save & Get Instant Quote** CTA.
- [x] 5.2 `submitConfiguration({mode})`:
      - instant: PUT config (with `generic` + `mode`) → POST /api/quote
        (check response, toast on failure) → router.push to cart.
      - manual: PUT config (with `mode: 'manual'`) → router.push to cart.
- [x] 5.3 Leva export button labels reflect the mode ("Save Print Config —
      Manual Quote" in advanced).

## 6. Cart
- [x] 6.1 Use `quote.total` for instant quoted prints; legacy
      `basePrice + printFee` for manual.
- [x] 6.2 Show the generic Strength/Quality/Colour view for instant prints;
      keep the advanced settings list for manual prints.
- [x] 6.3 Status copy differentiates instant ("Ready to checkout") from manual
      ("Awaiting admin quote — we'll be in touch / chat with us").

## 7. Verify
- [x] 7.1 `yarn test:run` green.
- [ ] 7.2 Browser e2e (deferred to client QA — `verify-quoting-flows-browser`):
      instant flow → checkout works, manual flow → admin sets quote → payable.
