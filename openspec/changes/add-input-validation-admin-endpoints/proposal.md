# Proposal: Validate Dimensions/Inputs at Admin API Boundaries (backlog)

> Status: **structural validation implemented 2026-05-29** (kept active for the
> remaining threshold sub-item, which is **BLOCKED on a human/product decision**).
> Spun off from `fix-dimension-unit-mismatch` audit.

## Done (2026-05-29)

- `lib/validation/dimensions.validateDimensions` (pure, tested) — rejects
  non-object, non-finite, or negative dimension values and coerces numbers.
- Wired into `PUT /api/admin/custom-print-requests` and
  `POST /api/product/custom-print-config` (400 on invalid).
- **Security fix:** `POST /api/product/custom-print-config` previously called
  `checkAdminPrivileges` but ignored the result (no gate) — now returns 403 for
  non-admins.

## Remaining (BLOCKED — human input)

Realistic max RANGE thresholds (build-volume / weight limits, unit-typo catch).
Needs the print farm's real limits before enforcing — do not guess.

## Why

The admin endpoints `app/api/admin/custom-print-requests/route.js` and
`app/api/product/custom-print-config/route.js` save `dimensions` (and related
pricing inputs) more or less verbatim from the request body, with no schema
validation. Today this is not an active bug (the audit found correct unit
handling everywhere), but it is a latent risk: a typo entering weight in grams
instead of kilograms, or a negative/NaN value, would corrupt downstream delivery
pricing and the instant quote.

## What Changes

- **Safe now (no human input needed):** validate that submitted dimensions are
  finite, non-negative numbers and that pricing fields are well-formed, rejecting
  malformed payloads with a 400. Recommend adopting the same `zod` schemas
  introduced by `add-instant-quoting-engine` for consistency.
- **BLOCKED — needs client/product decision:** realistic **range thresholds**
  (max length/width/height, max weight) used to catch unit-typo mistakes (e.g.
  "weight 500 probably means 0.5 kg entered as grams"). We must NOT invent these;
  the print farm knows their real build-volume and weight limits. Capture the
  agreed limits, then enforce + warn.

## Impact

- **Specs:** adds an `admin-input-validation` requirement.
- **Code:** the two admin routes above; shared zod schemas.
- **Blocker owner:** client / print-farm operator — confirm max build dimensions
  and weight. Until then, ship only the structural validation.
- **Risk:** low for structural validation; medium for thresholds (could reject
  legitimate large prints if set wrong) — hence the human sign-off.
