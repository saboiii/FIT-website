# Proposal: Refine the Instant-Quote Panel (clarity)

> Status: active. From client manual-testing feedback (#2, #4, #5, #6, #18).
> Depends on `add-instant-quoting-engine` (already archived).

## Why

The engine is correct, but the live quote panel hides information that made the
client think it was broken:

- **Minimum price is invisible (#4, #6).** Sub-$5 configurations are floored to
  the `minimumPrice` ($5). The engine already returns `minimumApplied`, but the
  panel never shows it, so toggling post-processing / special-request / priority
  (or changing simple-mode settings) appears to "do nothing" when the subtotal is
  still under the floor.
- **Print time has no time shown (#5).** The "Print time" line shows a price but
  not the hours, and the label doesn't explain it is machine time. The engine
  returns `inputs.printHours`.
- **Volume looks wrong (#4).** "24.8 cm³ · 6.0×6.0×2.3 cm" is correct — 24.8 is
  the solid mesh volume and 6×6×2.3 is the bounding box (≈82.8 cm³). The labels
  don't disambiguate, so the box volume looks like the "right" answer.
- **Colour palette is truncated (#2).** The swatch row is `.slice(0, 12)`, so
  admin colours beyond the first 12 have no swatch (only the dropdown lists them).
- **Per-part colour is unclear (#18).** Simple mode applies one colour to the
  whole model; per-part colour lives in Advanced. This isn't explained.

## What Changes

- Quote panel shows a **"Minimum order price applied"** note when
  `quote.minimumApplied`, including the floor amount (= total).
- Print-time line shows the **estimated hours** (`inputs.printHours`) and is
  labelled as machine time / estimate.
- Geometry line disambiguates **solid Volume** vs bounding **Box**.
- Editor renders **all** admin colour swatches (no `.slice`).
- Simple-mode colour section notes that one colour applies to the whole model and
  per-part colour is in Advanced Mode.

## Impact

- **Specs:** `instant-quoting-engine` (quote-panel display requirements).
- **Code:** `components/Editor/QuotePanel.jsx`, `components/Editor/result.jsx`.
- **Tests:** extend `tests/unit/QuotePanel.test.jsx` (minimum note, hours shown).
- **Risk:** low — presentational only; no pricing/engine changes.
