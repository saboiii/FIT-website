# Proposal: Browser Verification of Quoting Flows (backlog — human QA)

> Status: backlog. **Assigned to a human** (requires `yarn dev` + Clerk/Mongo env
> + the interactive Three.js editor, which cannot run headlessly in CI here).
> Consolidates the "browser verify" loose ends from the archived quoting changes
> so they were not left dangling.

## Why

The quoting work (engine, generic presets, post-config UX, editor reset, admin
config view, model download) is implemented and covered by unit/integration tests
(+ RTL for the quote panel), but the interactive UI paths were not verified in a
real browser during implementation. This change is the checklist to do that.

## Checklist

Run `yarn dev` with valid env, signed in, then verify:

1. **Editor instant quote** — upload an STL; the QuotePanel shows volume/dims, an
   itemized total, and updates when Strength/Quality/Colour and infill change;
   non-watertight models show the low-confidence warning.
2. **Generic mode** — Strength/Quality/Colour selections change the leva settings
   and the quote; advanced (leva) mode still works; "Reset to defaults" works in
   generic mode.
3. **Pay-first** — submitting a custom-print config returns to the cart (no full
   reload), the request shows as `quoted`/payable, and the cart shows a price.
4. **Cart status copy** — a `configured` request shows "Preparing your quote"
   (blue), never "Incomplete"; an unfinished request shows the yellow "Finish"
   message.
5. **Admin** — Quoting/Pricing tab loads + saves rates/fees/colours; a custom
   print request row expands to show the full config + dimensions + quote total;
   the "Model File" download keeps the original filename + extension.

## Impact

- No code; record findings and open targeted fix changes for any issues found.
