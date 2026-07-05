# Change Roadmap & Sequencing

> Recommended implementation order for the changes in `openspec/changes/`.
> Sequenced by dependency and risk, GOOS-style: build a working spine first, then
> layer features, then polish. Implement one change at a time, test-first; archive
> each into `openspec/specs/` when done (see `AGENTS.md`).

## Dependency graph (high level)

```
fix-dimension-unit-mismatch ─┐
add-test-framework ──────────┼─▶ add-instant-quoting-engine ─┬─▶ add-generic-print-presets ─┐
                             │                               │                               ├─▶ improve-custom-print-post-config-ux
                             │                               ├─▶ add-quote-persistence-and-sharing
                             │                               └─▶ add-slicer-accurate-estimation
                             │
independent ────────────────┴─ enhance-admin-request-config-view, fix-model-download-filename,
                                add-editor-reset-controls, fix-print-config-in-memory-store,
                                add-otp-contact-verification, retire-deprecated-printorder-model
```

## Phase 1 — Foundations (do first)

1. **add-test-framework** — harness + baseline suite. *(✅ archived 2026-05-28 →
   `changes/archive/`; `testing` spec in `openspec/specs/`)*
2. **fix-dimension-unit-mismatch** — investigated: **no active bug**; pinned by a
   unit-contract test; admin-validation follow-up split to
   `add-input-validation-admin-endpoints`. *(✅ archived 2026-05-28)*
3. **add-instant-quoting-engine** — the core: geometry→volume→weight, print-time
   estimate, the seven cost factors, expedite, minimum price, server-authoritative
   pricing, editor quote panel, admin pricing UI. *(✅ archived 2026-05-29; specs
   `instant-quoting-engine` + folded into `custom-print-requests`/`3d-model-editor`)*

Follow-up backlog: **add-test-coverage-ci** (coverage thresholds + CI gating).

## Phase 2 — Quote-driven customer experience (depends on Phase 1)

4. **add-generic-print-presets** — Strength × Quality × Colour generic mode →
   instant quote → pay first; admin colour catalogue. *(✅ archived 2026-05-29;
   spec `generic-print-presets`)*
5. **improve-custom-print-post-config-ux** — router return-to-origin + clear
   status copy + pay-first auto-quote at submit. *(✅ archived 2026-05-29)*
6. **add-quote-persistence-and-sharing** — save/share quotes. *(DROPPED 2026-06-08
   at client request; the backend was removed via `remove-saved-shared-quotes`.
   Customers compute quotes live or have admin assign one — they don't need to
   save or share.)*

## Phase 3 — Operator tooling & fixes (largely independent; parallelizable)

7. **enhance-admin-request-config-view** — expandable print-config panel + dims/
   quote for the print farm. *(✅ archived 2026-05-29; spec `admin-custom-print-requests`)*
8. **fix-model-download-filename** — downloads keep original filename + extension.
   *(✅ archived 2026-05-29)*
9. **add-editor-reset-controls** — discoverable reset in generic mode (per-field
   spun to `add-per-field-setting-reset`). *(✅ archived 2026-05-29)*
10. **fix-print-config-in-memory-store** — investigated: **dead code** (zero
    callers); removal folded into `retire-deprecated-printorder-model`.
    *(✅ archived 2026-05-29)*

## Phase 4 — Refinements & tech debt

11. **add-slicer-accurate-estimation** — cura-wasm slicer behind the engine's
    interface. *(DEFERRED — needs browser/worker env; heuristic suffices)*
    The lightweight alternative shipped instead: see
    `add-lightweight-print-time-estimator` *(✅ archived 2026-07-05 — pure
    layer-stack estimator + worker, validation harness (CLI + pure fitter),
    and a self-serve admin calibration panel (Settings → Print Timing +
    wizard step 4); spec folded into `admin-dashboard`. The client's physical
    calibration and the pricing flip it gates were spun out to
    `enable-shape-aware-print-pricing`)*.
12. **add-otp-contact-verification** — OTP contact channel at checkout.
    *(DROPPED 2026-06-12 — client chose email-only; superseded by
    `add-email-notifications-suite`)*
13. **retire-deprecated-printorder-model** — *(✅ COMPLETE 2026-07-05 via
    `migrate-print-delivery-to-custom-requests` 7.x: webhook/routes stopped
    writing it earlier; the owner's backfill dry-run found **0 documents**, so
    the model, proxyAccess check, and backfill script were deleted)*

## Phase 5 — Client manual-testing batch (2026-06-08)

Items raised from client browser testing. All 7 implemented test-first, archived
under `openspec/changes/archive/2026-06-08-*` and folded into the established
specs (`3d-model-editor`, `custom-print-requests`).

14. **refine-instant-quote-panel** — surface min-price floor, show print-time
    hours, distinguish solid volume vs bounding box, render all admin colour
    swatches, clarify per-part colour. *(✅ archived 2026-06-08)*
15. **fix-editor-panel-layout** — anchor overlay panels to the canvas; move the
    quote panel out of the chat launcher's corner. *(✅ archived 2026-06-08)*
16. **fix-upload-progress** — XHR `upload.onprogress` for the custom-print S3
    PUT so the bar tracks real bytes sent. *(✅ archived 2026-06-08)*
17. **fix-editor-lighting-and-perf** — key drei `<Stage>` on `preset` so the
    light rig rebuilds; memoize `meshColors` for steadier re-renders.
    *(✅ archived 2026-06-08)*
18. **add-instant-vs-manual-quote-flow** — the core of the batch. Simple mode →
    instant CTA → server quote → admin-default delivery auto-applied → payable.
    Advanced mode → manual quote (admin email + Stream Chat for negotiation).
    Cart uses `quote.total` for instant; persists the generic Strength/Quality/
    Colour view. *(✅ archived 2026-06-08)*
19. **verify-quote-and-checkout-flows** — extract pure `customPrintDisplayPrice`
    helper; admin set-quote defensively marks `quoteMode='manual'`. Stripe
    checkout completion deferred to browser QA. *(✅ archived 2026-06-08)*

## Backlog spun out during implementation

- **add-test-coverage-ci** — *(✅ archived 2026-05-29)*
- **add-public-quoting-config** — *(✅ archived 2026-05-29)*
- **add-returnto-origin-capture** — *(✅ archived 2026-05-29)*
- **add-input-validation-admin-endpoints** — *(✅ archived 2026-06-12; range
  thresholds became admin-configurable `machineLimits` — entered in Admin →
  Quoting & Pricing, enforced at the admin dimension endpoints (400) and the
  quote API (422); null = no limit, so nothing is guessed)*
- **add-server-side-geometry-verification** — *(✅ archived 2026-06-10; STL/OBJ/
  glTF-GLB/3MF recompute + deviation logging folded into the
  `instant-quoting-engine` spec. Deviation rejection policy spun out to
  `decide-geometry-deviation-policy`; live-S3 QA folded into
  `verify-quoting-flows-browser` item 6)*
- **decide-geometry-deviation-policy** — *(✅ resolved 2026-06-12: REJECT —
  suspicious volume understatement now 400s instead of silently repricing)*
- **restrict-proxy-private-prefixes** — *(✅ archived 2026-06-12; `models/` is
  now private through /api/proxy — owner, digital buyer, print-order owner, or
  admin; images/viewables stay public)*
- **fix-user-batch-pii-exposure** — *(✅ archived 2026-06-12; GET /api/user/
  batch was unauthenticated and returned emails/phones/addresses/Stripe ids —
  now admin-gated)*
- **fix-upload-endpoint-hardening** — *(✅ archived 2026-06-12; /api/upload/
  cleanup was deletable-by-any-user for arbitrary S3 keys — now admin-gated;
  models/viewable presign keys sanitize the client filename via
  `lib/uploadKey.sanitizeKeyPart`)*
- **fix-jsonld-script-injection** — *(✅ archived 2026-06-12; JSON-LD blocks now
  escape `<` via `lib/jsonLd.jsonLdString` so DB-sourced titles can't break out
  of the script tag)*
- **fix-cart-custom-print-ownership** — *(✅ archived 2026-06-12; /api/cart/
  custom-print now scopes the lookup to the owner (was an IDOR: any signed-in
  user could cart+pay a foreign request), snapshots the display price, and no
  longer echoes internal error objects)*
- **fix-instant-quote-checkout-charge** — *(✅ archived 2026-06-12; instant
  quotes were charged `basePrice + printFee` instead of the displayed
  `quote.total` at checkout/webhook — extracted pure
  `customPrintChargeBreakdown`, wired into both checkout routes + Stripe
  webhook)*
- **add-quote-api-rate-limiting** — *(✅ archived 2026-06-12; Upstash sliding
  window on POST /api/quote — 60/min authed by userId, 15/min anon by IP, 429 +
  Retry-After; no-op without env vars)*
- **add-per-field-setting-reset** — *(✅ archived 2026-06-12; Advanced Mode
  'Modified settings' card lists changed print settings with one-click per-field
  reset; pure diff helper unit-tested)*
- **verify-quoting-flows-browser** — *(human QA of interactive UI paths)*
- **add-returnto-origin-capture** — explicit `returnTo` for the editor (post-config 3.1).

- **verify-quoting-flows-browser** — human QA checklist for the interactive UI
  paths (engine/generic/pay-first/cart/admin) not verifiable headlessly.
- **add-lightweight-print-time-estimator** — *(core implemented 2026-06-12:
  pure layer-stack estimator + worker, tested, shipping dark; wiring BLOCKED on
  print-farm validation of time constants + integration decision — see the
  change's tasks.md §3)*

## Phase 6 — Client decisions batch (2026-06-12)

All blockers the client resolved on 2026-06-12, implemented same day:

20. **fix-client-qa-batch-2026-06-12** — six browser-QA fixes (cart checklist
    refresh, quote-panel clarity/overflow, simple-mode autorotate, config
    restore on edit, advanced-save crash, delivery pricing). *(✅ archived)*
21. **add-quote-api-rate-limiting** — Upstash sliding window. *(✅ archived)*
22. **decide-geometry-deviation-policy** — REJECT (400). *(✅ archived)*
23. **restrict-proxy-private-prefixes** — models/ private. *(✅ archived)*
24. **add-input-validation-admin-endpoints** — admin-configurable machine
    limits. *(✅ archived)*
25. **add-per-field-setting-reset** — Modified-settings panel. *(✅ archived)*
26. **add-admin-print-time-config** — guided time-model setup. *(✅ archived)*
27. **add-otp-contact-verification** — DROPPED (email-only). *(✅ archived)*
28. **add-email-notifications-suite** — *(✅ archived 2026-06-22; customer/admin
    lifecycle + transactional emails on one light-theme base layout, buyer↔vendor
    chat lifecycle posts + new-message emails, and a scheduled idle-request nudge
    (free GitHub Actions cron). Specs `email-notifications`, `chat-notifications`
    in `openspec/specs/`)*
29. **redesign-admin-dashboard-onboarding** — *(ACTIVE, approved: grouped
    sidebar IA + Overview setup checklist + first-run wizard; design.md ready)*

Also 2026-06-12 (no openspec change needed): single `.env` for dev +
committed `.env.example`; fixed two env-name bugs (AWS_S3_BUCKET,
CLERK_WEBHOOK_SECRET fallback).

## Notes

- The instant quoting engine is the backbone the generic-quote/pay-first
  experience builds on. All pricing/mapping logic lives in pure, unit-tested
  modules under `lib/quoting/` (per `project.md`).
- **Established specs** now in `openspec/specs/`: `testing`, `3d-model-editor`,
  `custom-print-requests`, `instant-quoting-engine`, `generic-print-presets`,
  `admin-custom-print-requests`.

## Phase 7 — Blog/CMS port from eil (approved 2026-07-03)

Client decisions 2026-07-03: PostHog analytics (not built-in counters), full
newsletter port, NO reader extras (reactions/bookmarks/AI summary/sponsors/ads).
Feature audit of /Volumes/XtremeLOAD/Projects/eil recorded in
`changes/upgrade-blog-cms/design.md`.

30. **redesign-admin-dashboard-onboarding** — *(✅ archived 2026-07-05; spec
    `admin-dashboard` folded; browser QA spun out to
    `improve-admin-management-ux` at client request)*
31. **upgrade-blog-cms** — *(✅ archived 2026-07-05; spec `blog-cms` folded;
    browser QA spun out to `improve-admin-management-ux`)*
32. **add-blog-analytics-posthog** — *(✅ archived 2026-07-05; spec
    `blog-analytics` folded; PostHog project + keys live (project 496472),
    dashboard-fills eyeball spun out)*
33. **add-newsletter-suite** — *(✅ archived 2026-07-05; spec `newsletter`
    folded; TZ round-trip fix via `utils/datetimeLocal`; end-to-end send QA
    spun out to `improve-admin-management-ux`)*

## Phase 8 — Audit hardening batch (2026-07-04)

Defects found during the 2026-07-04 repo audit, implemented test-first:

34. **harden-payment-webhooks** — *(✅ archived 2026-07-05; verified LIVE via
    `stripe listen` + event resend: idempotency no-op on duplicate,
    `paymentMethod` populated via `latest_charge`; also moved the customer
    order-confirmation email into the webhook and deleted the unauthenticated
    `/api/user/checkout/confirmation` open relay found during QA)*
35. **reconcile-webhook-charge-amounts** — *(✅ archived 2026-07-05; client
    chose (b) fulfil-and-flag: `Order.amountMismatch` + NEEDS-REVIEW status
    note when Stripe's captured amount ≠ recomputed total; admin-UI surfacing
    deferred to `improve-admin-management-ux`)*
36. **improve-admin-management-ux** — *(BACKLOG, needs client scoping)* admin
    management panels UX revamp; absorbs the browser QA deferred 2026-07-05
    (admin sidebar/wizard, blog editor, newsletter end-to-end) and the
    amount-mismatch admin surfacing; consider merging with "improve the UI
    for creators".
37. **enable-shape-aware-print-pricing** — *(BACKLOG, gated on the client
    calibrating via Admin → Settings → Print Timing)* flip priced quotes to
    the calibrated layer-stack estimator behind the `estimatePrintHours`
    seam + wire the editor worker; spun out of the archived estimator change.

Also 2026-07-04 (no openspec change needed): `yarn lint` repaired (`eslint .`
+ flat-config `.jsx` matching; 0 errors), missing `IoMdLock` import in
SignUpForm (paid sign-up stages crashed), `useAccess` conditional-hooks
violation restructured, blog schedule-edit TZ shift (shared with newsletter),
JSX entity escapes, stale docstrings (cron scheduler, geometry formats),
debug log removed from `utils/store.js`.

## Phase 9 — Dashboard redesign backlog (filed 2026-07-05)

38. **redesign-dashboard-ui** — *(ACTIVE — WP0–WP7 + 6a/6b/6c shipped;
    WP8 tours/job-sheets in flight; WP9 stubs + WP10 review remain)*.
39. **Feature backlog spun from the redesign** (one change each, stubs/UI
    seams shipped or specced in the blueprint §6): add-order-timeline-notes,
    add-discount-codes, add-creator-payout-statements,
    add-creator-product-analytics, add-listing-manager-extras,
    add-refunds-ui, add-quote-review-state, add-fulfilment-evidence,
    add-admin-customers-panel, add-print-farm-inventory,
    add-dashboard-notification-centre, add-newsletter-test-send,
    add-product-image-generation.
