# Proposal: Admin-Configurable Print-Time Model (guided setup)

> Status: **COMPLETE 2026-06-12** (archived). Client request: "make print time
> per model configurable via the admin panel (ask the admin a series of
> questions to help them set it up)".

## What was built

- `AppSettings.quotingConfig.timeModel` — per-machine overrides for the
  print-time heuristic: `baseFlowCm3PerHour`, `layerHeightRefMm`,
  `supportTimeFactor`, `wallTimeFactorPerLoop`, `minHours` (null = built-in
  default).
- Pure `resolveTimeModel(overrides)` in `lib/quoting/pricingDefaults.js`;
  `calculateInstantQuote` feeds it into `estimatePrintHours`, so every quote's
  hours + time cost reflect the admin's machines.
- `TimeModelSchema` (strict zod) in the admin quoting update schema; GET
  returns the resolved model so the UI shows effective values.
- Admin → Quoting & Pricing gains a **"Print time estimation — set up for your
  machines"** section: five plain-language questions, each with a how-to-measure
  hint (e.g. "material used ÷ hours from a recent 0.2mm print"), unit labels,
  empty = keep default.

## Tests

`tests/unit/printTimeEstimate.test.js` — resolver merge semantics + a quote
asserting a faster configured flow lowers hours and the printTime line amount.

## Spec

Folded into `instant-quoting-engine` ("Quote configuration" requirement now
includes the time model) — see spec update in this commit.
