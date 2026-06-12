# Proposal: Client Browser-QA Fix Batch (2026-06-12)

> Status: **COMPLETE 2026-06-12** (archived). Six issues reported from the
> `verify-quoting-flows-browser` checklist run by the client.

## Issues and fixes

1. **Cart steps stale after model delete** — `CustomPrintUpload.handleDeleteModel`
   cleared only its local state; the cart's `customPrintRequests` map kept the
   deleted doc, so the Upload/Configure checklist stayed green. Added an
   `onDeleteComplete` callback (mirroring `onUploadComplete`); Cart refreshes
   its breakdown + request map on delete.
2. **Quote panel overflow + unclear metrics/options** — print-time machine-hours
   moved to a sub-line (amounts no longer overflow, `whitespace-nowrap`);
   "Volume … · Box …" split into two labelled rows ("Material volume",
   "Size (L×W×H)" with a tooltip); each option toggle now shows the fee it adds
   (`· +SGD x.xx`) or "no extra charge set" when the admin fee is 0 — the
   reported "options don't change the price" was the default-0 fees in
   `Admin → Quoting`, now made visible instead of silent.
3. **Auto-rotate in simple mode** — added a checkbox in the simple config panel
   bound to the same `lighting.autoRotate` leva value (no need to open
   Advanced).
4. **Simple settings not restored on edit** — `loadConfigFromDB` fetched the
   saved config and discarded it. It now applies saved leva print settings,
   material, mesh colours, and the generic Strength/Quality/Colour (+ material)
   selection once the scene is loaded; advanced-saved (manual-mode) requests
   reopen in Advanced Mode.
5. **Advanced save crash** — `printConfiguration.generic: undefined` failed
   Mongoose's cast when no prior generic block existed. The generic key is now
   only included when there is a value; the 500 also no longer echoes internal
   error details.
6. **Delivery costs all 0** — `resolveCustomPrintDeliveryDefaults` stored
   `price: 0` assuming checkout would recompute from tiers, but checkout reads
   the stored price. Defaults are now priced from the request's dimensions via
   the same `getDeliveryTypeApplicability` (tiers + basePricing formula, kg→g)
   used by the product form; on every re-quote, stored types without an
   admin `customPrice` are re-priced from current admin settings
   (`refreshCustomPrintDeliveryPrices`, unit-tested). Types whose tiers don't
   cover the dims are excluded.

## Impact

- **Specs:** none (all behaviour already specified or pure UI polish).
- **Tests:** `customPrintDelivery` suite extended (7 new cases); QuotePanel RTL
  suite still green; full run 228 passing.
- **Browser re-verify:** items 1–6 above map to the original checklist — needs
  a quick human pass (same `verify-quoting-flows-browser` change).
