# Proposal: Migrate Product Print-Delivery into CustomPrintRequest (retire PrintOrder)

> Status: **approved, in progress** (decisions taken 2026-06-22). Supersedes the
> earlier `retire-deprecated-printorder-model` scope (folder renamed) — retiring
> `PrintOrder` is now the final phase of this migration. See `design.md` for the
> call-site audit and `tasks.md` for the phased plan.

## Why

`PrintOrder` backs the **product-based print-delivery** flow (a buyer picks a
listed `productType: "print"` product, chooses `printDelivery`, and the farm
prints and ships it). That flow is **important and staying**, but `PrintOrder`
is half-rotted (broken POST route, inconsistent `userId` type, dropped PUT
fields — see `design.md`) and duplicates `CustomPrintRequest`. Meanwhile a
print-delivery purchase is, from the customer's side, *exactly* what
`CustomPrintRequest` already does for custom uploads: a quote, a print-time
estimate, an editor view, a status lifecycle, and buyer↔vendor email + chat
notifications.

So instead of carrying two overlapping models, a print-delivery purchase becomes
a `CustomPrintRequest` — reusing all of that machinery — and `PrintOrder` is
retired.

## What this flow is (client spec, 2026-06-22)

A print-delivery product is "another product, but printed and sold, not just sold
as-is." Specifically:

- It has a **fixed, vendor-set advanced print config** → therefore a **fixed
  quote** (the customer cannot change print settings or move the price).
- The customer **can still choose the colour** (from the curated catalogue).
- It is **viewable/usable in the editor** as usual (the product's `viewableModel`).
- It must carry the same **markers** as custom prints: a **print-time estimate**,
  and **consistent vendor↔customer communication** (email notifications + Stream
  Chat lifecycle).

## What changes

1. **Product** (`productType: "print"`): add a vendor-set **fixed print config**
   (advanced print settings) and the **offered colours** for the product. Small
   section in the existing product editor — not the excluded admin redesign.
2. **CustomPrintRequest**: add a `source` discriminant (`upload` | `product`) and
   a `sourceProduct` ref (`productId`, `variantId`). For product-sourced
   requests, `modelFile.s3Key` points at the product's `viewableModel` so the
   editor, server-side geometry recompute, and proxy access work unchanged.
3. **Quote**: computed once, server-authoritatively, from the product model's
   geometry + the fixed settings (fixed for the customer; they only pick colour).
4. **Checkout + Stripe webhook**: stop creating `PrintOrder`; create/advance a
   product-sourced `CustomPrintRequest` instead (the live money path — gated,
   tested, and verified against real Stripe events; **explicit human steps in
   `tasks.md`/`design.md`**).
5. **Reads repointed**: editor load/config, `proxyAccess`, account/admin views.
6. **Backfill** historical `PrintOrder` docs into `CustomPrintRequest`
   (idempotent, dry-run first).
7. **Retire** `PrintOrder` model + `print-order` routes once reads/writes are off
   it. Fix the audited bugs as part of the migration (the broken routes are
   replaced, not patched-then-deleted).

## Impact

- **Specs:** `custom-print-requests` (product-sourced requests, fixed quote,
  colour-only customer choice), `instant-quoting-engine` (fixed product quote
  uses the same server-authoritative engine), and the existing
  `chat-notifications` / `email-notifications` lifecycle now also fires for
  product-sourced requests.
- **Code:** Product schema + editor field; CustomPrintRequest schema; checkout +
  webhook; proxyAccess; editor load path; a backfill script; removal of
  `PrintOrder` + routes.
- **Risks:** live Stripe payment path; historical data migration; private-model
  access continuity. All addressed phase-by-phase, money-path-last, with human QA.

## Out of scope

- Letting the customer change print settings (settings are vendor-fixed by design).
- Admin dashboard redesign (excluded by the client).

## Earlier done (2026-05-29, prior scope)

- Removed stray `app/api/product/route.js.bak`.
- Removed dead `/api/print-config` routes (zero callers).
