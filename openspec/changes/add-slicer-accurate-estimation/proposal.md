# Proposal: Slicer-Accurate Time & Filament Estimation (future)

> Status: backlog — **DEFERRED (needs browser/worker env).** cura-wasm is a heavy
> WASM slicer that must run in a Web Worker and can't be meaningfully built or
> verified headlessly here; the heuristic engine is sufficient for the instant
> quote. Not blocking. Depends on `add-instant-quoting-engine` (provides the
> `estimatePrintHours` / material-estimate interfaces this swaps behind).

## Why

The instant quote's print-time and filament figures are **heuristics**. For
higher-value or complex prints, customers and operators expect numbers close to
what the slicer actually reports. The client referenced two tools:

- [cloud-cnc/cura-wasm](https://github.com/cloud-cnc/cura-wasm) — CuraEngine
  compiled to WebAssembly; slices an STL in-browser/worker and reports estimated
  print time and filament used.
- [slic3r/Slic3r](https://github.com/slic3r/Slic3r) — a full slicer (heavier,
  more of a desktop/server engine; reference for slicing concepts).

## What Changes

- Add an optional slicer-backed estimator that implements the existing
  `estimatePrintHours(metrics, settings)` and material-weight interfaces using
  **cura-wasm** in a Web Worker, mapping our print settings → Cura definition
  (layer height, infill, walls, support, nozzle).
- Feature-flag it: heuristic stays the default for the *instant* preview; the
  slicer runs asynchronously for a "precise quote" (it is slow + WASM-heavy).
- Cache slice results by (model hash + settings hash) to avoid re-slicing.

## Impact

- **Specs:** modifies `instant-quoting-engine` (print-time/material become
  slicer-backed when enabled; heuristic fallback retained).
- **Code:** new `lib/quoting/slicer/` worker integration; bundle-size and
  cold-start considerations.
- **Risks:** WASM payload size, slice latency (seconds–minutes for big models),
  browser memory; must run off the main thread and degrade gracefully to the
  heuristic on failure/timeout.
