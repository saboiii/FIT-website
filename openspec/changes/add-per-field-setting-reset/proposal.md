# Proposal: Per-Field Reset for Print Settings (backlog)

> Status: backlog — **DEFERRED (needs design decision).** leva has no clean inline
> per-field reset; doing this well likely means a bespoke advanced-settings panel
> (off leva). The global reset already covers the primary ask. Spun out of
> `add-editor-reset-controls` (task 2.1).

## Why

A global "Reset to defaults" now exists in both editor modes. The client also
asked to reset an individual value to its default. leva (the advanced controls)
has no clean inline per-field reset affordance, and generic mode exposes only the
three coarse choices — so per-field reset was deferred.

## What Changes

- Provide a per-setting "reset to default" affordance for the advanced print
  settings (a custom controls panel, or a leva plugin/custom row, or a move off
  leva to a bespoke settings panel). Reuse the module-scope default constants in
  `components/Editor/result.jsx` (`defaultPrintability`, etc.).

## Impact

- **Code:** `components/Editor/result.jsx` (and possibly replacing/augmenting leva).
- **Decision needed:** whether to invest in a leva customization or build a small
  bespoke advanced-settings panel (which would also unblock nicer per-field UX).
- **Risk:** medium if it means moving off leva; low if a small affordance suffices.
