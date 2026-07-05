# Tasks: Refine the Instant-Quote Panel

## 1. Tests first
- [x] 1.1 Extend `tests/unit/QuotePanel.test.jsx`: when the server quote has
      `minimumApplied: true`, the panel shows a minimum-price note.
- [x] 1.2 When the quote has `inputs.printHours`, the print-time line shows the
      estimated hours.

## 2. QuotePanel
- [x] 2.1 Render a "Minimum order price applied" note when `quote.minimumApplied`.
- [x] 2.2 Show `inputs.printHours` on the print-time line; clarify it is machine
      time / an estimate.
- [x] 2.3 Disambiguate the geometry line: solid **Volume** vs bounding **Box**.

## 3. Editor (result.jsx)
- [x] 3.1 Render all admin colour swatches (remove `.slice(0, 12)`).
- [x] 3.2 Note that simple-mode colour applies to the whole model; per-part
      colour is in Advanced Mode.

## 4. Verify
- [x] 4.1 `yarn test:run` green.
- [ ] 4.2 Browser spot-check (deferred to client manual QA — see
      `verify-quoting-flows-browser`).
