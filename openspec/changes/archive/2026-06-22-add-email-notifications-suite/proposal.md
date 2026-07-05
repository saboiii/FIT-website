# Proposal: Email Notification Suite (all key use cases, polished templates)

> Status: **approved 2026-06-12, ready to implement.** Client decision: email is
> the only notification channel (OTP/SMS dropped — see archived
> `add-otp-contact-verification`). "Make sure there are email notifications for
> all key use cases and make sure the templates look clean, polished and pretty
> with required info."

## Current state (audited 2026-06-12)

`lib/email.js` provides `sendEmail` (nodemailer/Gmail) + `wrapInTemplate`.
Only four call sites exist:

| Trigger | Recipient | Where |
|---|---|---|
| Manual-quote config saved | admin | `app/api/custom-print/config` |
| Delivery change | customer | `app/api/admin/notify-delivery-change` |
| Checkout confirmation | customer | `app/api/user/checkout/confirmation` |
| Stripe webhook (order paid) | customer | `app/api/webhook/stripe` |

## Gaps to fill (the "key use cases")

Customer-facing:
1. **Custom print quoted** (instant or admin manual quote set) — "your quote is
   ready, here's the breakdown, pay here".
2. **Payment received / order confirmed** (custom print + shop orders) — verify
   the existing webhook email covers custom prints with the right amounts
   (it predates `customPrintChargeBreakdown`).
3. **Status updates**: printing started, printed, shipped (with delivery info),
   delivered.
4. **Request needs attention**: model uploaded but unconfigured after N days
   (gentle nudge; optional, cron-dependent — flag if no scheduler exists).

Admin-facing:
5. New custom-print request submitted (model uploaded).
6. Manual-quote requested (exists — restyle only).
7. Payment received for a custom print (so the farm starts work).
8. Suspicious geometry deviation rejected (ops signal, replaces log-watching).

## Template system

- One **base layout** (`lib/email/template.js`): brand header, Inter-stack web
  fonts with safe fallbacks, light theme matching the design system
  (`#fefefe` bg, `#111111` text, `#e6e6e6` hairlines, rounded cards, amber→red
  gradient CTA button), footer with contact + legal. Inline CSS only (email
  clients), table-based layout, dark-mode friendly colours.
- Pure **template functions** per use case (`lib/email/templates/*.js`):
  `(data) => { subject, html }` — unit-testable string builders like the
  existing `manualQuoteEmail` (which has tests already — follow that pattern).
- A quote-breakdown partial that renders the itemized lines/total used by both
  the quoted and paid emails.

## Tasks (sequenced)

- [ ] 1. Base layout + breakdown partial, snapshot-style unit tests (strings
      contain required info: amounts, request id, CTA link).
- [ ] 2. Wire "custom print quoted" (instant: after /api/quote persist; manual:
      after admin set-quote) — customer email.
- [ ] 3. Wire admin notifications 5/7/8.
- [ ] 4. Restyle the four existing emails onto the base layout.
- [ ] 5. Status-update emails on admin status transitions.
- [ ] 6. (flagged) nudge email needs a scheduler — separate decision.

## Impact

- **Specs:** new `email-notifications` capability.
- **Risks:** Gmail rate/deliverability limits (fine at current volume; note
  SES/Resend as the upgrade path); emails must never block the triggering
  request (send best-effort, log failures) — same pattern the manual-quote
  email already uses.
