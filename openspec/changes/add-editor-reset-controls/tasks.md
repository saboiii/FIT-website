# Tasks: Discoverable Reset-to-Defaults

> Implemented 2026-05-29.

## 1. Global reset discoverability
- [x] 1.1 Surfaced a "Reset to defaults" button in generic mode (and kept the leva
      "Reset All Settings" in advanced); both call one shared `resetAllToDefaults`
- [x] 1.2 Default constants moved to module scope (single source); reset also
      restores the generic Strength/Quality/Colour selection

## 2. Per-setting reset
- [ ] 2.1 **DEFERRED (leva limitation):** leva has no clean inline per-field reset
      affordance, and generic mode exposes only the 3 coarse choices (no individual
      fields to reset). The global reset covers the client's primary ask ("make all
      values default"). Revisit per-field reset if we move off leva or add a custom
      controls panel.

## 3. Verify
- [x] 3.2 `yarn test:run` green (123); edited JSX parses clean (esbuild)
- [ ] 3.1 **BLOCKED — needs browser/human:** confirm in `/editor` that "Reset to
      defaults" restores all values (generic mode) and the leva control still works.
