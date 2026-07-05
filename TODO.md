# Your Remaining Tasks (slimmed 2026-07-05)

Everything else from the old list is done: Stripe test purchase verified
end-to-end (fulfilment, payment method, duplicate guard), backfill run (0
docs — PrintOrder deleted), reconcile decision (b) implemented, six openspec
changes archived, and the work is committed on `feat/instant-quoting-engine`
(pushing is yours). Admin/blog/newsletter click-through QA is deferred into
the future admin-UI revamp (`openspec/changes/improve-admin-management-ux/`).

## 1. Production env (~10 min)

- [ ] Copy the four `*POSTHOG*` values from `.env.local` into Vercel
- [ ] `CRON_SECRET`: generate (`openssl rand -hex 32`), add to `.env` +
      Vercel, and add `CRON_SECRET` + `CRON_BASE_URL`
      (`https://www.fixitoday.com`) as GitHub Actions repository secrets —
      powers scheduled blog publishing, newsletter sends, idle nudges

## 2. Quick eyeballs from the test purchase (~5 min)

- [ ] Both emails arrived: "Thank you for your order" + "Payment received"
- [ ] Account → Orders shows the order (visa …4242)
- [ ] Admin → Custom Print Requests shows the paid request; its model opens
      in the editor

## 3. Editor QA — still current UI, not deferred (~20 min)

With `yarn dev` running, signed in:

- [ ] Upload an STL at `/editor` — quote panel shows volume/dims/itemised
      price and updates with Strength/Quality/Colour/infill changes
- [ ] "Save & Get Instant Quote" → cart shows the request as quoted/payable
- [ ] A half-configured request says "Preparing your quote", never
      "Incomplete"
- [ ] Persist quotes for an STL, OBJ, GLB, and 3MF — totals should match the
      editor preview (server recompute agreeing); watch the terminal for
      `[quote] geometry deviation` lines

## 4. One more test purchase (~10 min)

The upload-source custom print is verified; the **product-sourced** path
(catalogue print product → colour pick in editor → pay) still needs one run:

1. Terminal 2: `stripe listen --forward-to localhost:3000/api/webhook/stripe`
   (if the printed `whsec_…` differs from last time, update
   `STRIPE_SESSION_COMPLETE_SIGNING_SECRET` in `.env` and restart dev)
2. Buy a print-type product that HAS a viewable model (e.g. the fully
   configured one) with card `4242 4242 4242 4242`
3. Confirm exactly one paid request appears with print-time + your colour

## Parked (no action)

- Admin/blog/newsletter UI revamp + its QA — needs a scoping chat
- "Improve the UI for creators" — possibly same scoping chat
- Print-farm timing validation for the smarter estimator
