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
6. **Server geometry recompute vs live S3** (from
   `add-server-side-geometry-verification` task 3.5) — persist a quote (pass a
   `requestId`) for an uploaded STL, OBJ, GLB, and 3MF; confirm the persisted
   quote's volume matches the editor preview (server recompute agreed), and that
   an unsupported format (e.g. FBX) still persists the client-derived quote
   without error. Watch the server log for unexpected
   `[quote] geometry deviation` lines (parser divergence would show up there).

7. **Newsletter end-to-end send** (from `add-newsletter-suite` task 4.4 —
   needs Gmail creds + `CRON_SECRET` + a real inbox) — subscribe via the blog
   footer form; receive the welcome drip; compose + send a campaign from
   Admin → Newsletter; confirm open/click events appear on the campaign's
   history row; the unsubscribe link works and stops further sends; the
   preferences page updates interests.

8. **Stripe webhook hardening** (from `harden-payment-webhooks` task 4.2 —
   piggybacks on the migrate-change 5.4 test-mode purchase) — after the test
   purchase completes, use the Stripe dashboard/CLI to **resend** the
   `checkout.session.completed` event and confirm: no duplicate Order, no
   second stock decrement, no duplicate product-print request (the webhook
   should log/return a duplicate no-op). Also confirm the recorded Order now
   has `paymentMethod` populated (brand/last4).

## Impact

- No code; record findings and open targeted fix changes for any issues found.
