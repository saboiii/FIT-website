# Proposal: Test Coverage Thresholds & CI Gating (backlog)

> Status: **implemented 2026-05-29.** Vitest v8 coverage gates lib/quoting,
> lib/download, utils/customPrintStatus (90% stmts/lines/funcs, 80% branches);
> `.github/workflows/ci.yml` runs `yarn test:coverage` on push/PR. Spun out of
> `add-test-framework` (task 4.2).

## Why

We have a Vitest suite but nothing enforces it. Coverage can silently erode and a
red suite can be merged. Gating on CI keeps the safety net real as the codebase
(and the quoting engine) grows.

## What Changes

- Enable Vitest coverage (`@vitest/coverage-v8`) with sensible thresholds for the
  pure logic under `lib/quoting/` and `utils/` (start realistic, ratchet up).
- Add a CI workflow (e.g. GitHub Actions) that runs `yarn test:run` (and lint)
  on PRs and blocks merge on failure.

## Impact / Considerations

- **Code:** `vitest.config.mjs` (coverage config + thresholds), a CI workflow file.
- **Needs decision:** initial threshold numbers and which paths to gate — agree so
  CI isn't either toothless or constantly red.
- **Infra:** GitHub Actions (already available on the repo); no new external infra.
