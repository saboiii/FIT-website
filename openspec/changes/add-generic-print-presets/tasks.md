# Tasks: Generic Print Presets

> GOOS / test-first. The mapping is pure — drive it with unit tests before any UI.

## 1. Preset mapping (pure, `lib/quoting/genericPresets.js`)
- [ ] 1.1 Unit tests: each Quality maps to the agreed layerHeight; each Strength
      maps to the agreed wallLoops + infill; Strong > Normal > Draft on
      walls/infill; High < Medium < Draft on layer height
- [ ] 1.2 Unit tests: colour maps to meshColors; material-bearing colours
      (Wood/Marble/Transparent/Natural) set materialType
- [ ] 1.3 Implement `mapGenericToPrintSettings({ strength, quality, colour })`
      with the mapping tables as data

## 2. Colour/material catalogue (`models/AppSettings.js`)
- [ ] 2.1 Add `printColours: [{ name, hex, material?, priceModifier? }]`
- [ ] 2.2 Seed defaults from the client's colour list; admin settings UI to edit

## 3. Quote integration
- [ ] 3.1 Unit test: a generic selection produces a deterministic instant quote
      via the engine (price changes sensibly with Strength/Quality/Colour)
- [ ] 3.2 Wire generic selection → mapGenericToPrintSettings → calculateInstantQuote

## 4. Editor generic mode UI (`components/Editor/result.jsx`)
- [ ] 4.1 Generic mode (default) with Strength, Quality, Colour controls
- [ ] 4.2 Live quote shown; advanced (leva) mode still reachable via toggle
- [ ] 4.3 Replace the ad-hoc 4 presets / 8 swatches with the catalogue-driven UI

## 5. Pay-first flow
- [ ] 5.1 On complete generic selection, auto-quote (configured → quoted) and
      route to payment (coordinate with improve-custom-print-post-config-ux)
- [ ] 5.2 Integration test (mocked): generic submit yields a payable quoted request

## 6. Verify
- [ ] 6.1 Manual: generic flow upload → 3 choices → instant price → pay
- [ ] 6.2 Manual: advanced flow still works
- [ ] 6.3 `yarn test:run` green
