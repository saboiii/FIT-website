# Tasks: Generic Print Presets

> GOOS / test-first. The mapping is pure — drive it with unit tests before any UI.
> Progress: 2026-05-28 — mapping + catalogue + editor generic UI done (109 tests).

## 1. Preset mapping (pure, `lib/quoting/genericPresets.js`)
- [x] 1.1 Tests: Quality→layerHeight (High<Medium<Draft); Strength→walls+infill
      (Strong>Normal>Draft)
- [x] 1.2 Tests: colour→hex; material-bearing colours (Wood/Marble/Transparent/
      Natural) set materialType; case-insensitive; unknown colour falls back
- [x] 1.3 `mapGenericToPrintSettings({ strength, quality, colour })` with data tables

## 2. Colour/material catalogue
- [x] 2.1 `AppSettings.printColours: [{ name, hex, material?, priceModifier? }]`
- [x] 2.2 `DEFAULT_PRINT_COLOURS` seeds the client's 31-colour list; densities for
      wood/marble/transparent/natural added to `pricingDefaults`
- [ ] 2.3 Admin settings UI to curate `printColours` — **TODO (next), with the
      `quotingConfig` admin UI from the engine change (5.3)**
- [ ] 2.4 Editor sources colours from `AppSettings.printColours` (currently uses
      `DEFAULT_PRINT_COLOURS`) — small follow-up once the admin UI exists

## 3. Quote integration
- [x] 3.1 Tests: stronger/higher selection costs more; denser colour ≥ plastic
- [x] 3.2 Editor maps generic selection → printSettings → live quote (via QuotePanel)

## 4. Editor generic mode UI (`components/Editor/result.jsx`)
- [x] 4.1 Generic mode (default, `!advancedMode`) with Strength, Quality, Colour
- [x] 4.2 Live quote shown (QuotePanel); advanced (leva) mode still reachable
- [x] 4.3 Replaced the ad-hoc 4 presets / 8 swatches with the catalogue-driven UI
- [ ] 4.4 **BLOCKED — needs browser/human:** interactive `/editor` verification
      (selections update leva + colour + quote). Verified the pure mapping by
      tests; the leva/three wiring can't be exercised headlessly.

## 5. Pay-first flow
- [ ] 5.1 **DEFERRED to `improve-custom-print-post-config-ux`:** on a complete
      generic selection, persist the quote (status → `quoted`) and route to
      payment. The API (`POST /api/quote` with `requestId`) + model already
      support persistence; the editor-submit trigger + pay-first routing land with
      the post-config-ux change so the option/expedite state and routing are
      handled in one place. Tracked there, not dropped.
- [ ] 5.2 Integration test for the pay-first submit (with 5.1)

## 6. Verify
- [x] 6.1 `yarn test:run` green (109 tests); changed files lint-clean
- [ ] 6.2 Manual generic + advanced flows in the browser (see 4.4)
