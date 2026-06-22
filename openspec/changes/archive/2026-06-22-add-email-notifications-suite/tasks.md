# Tasks: Email + Chat Notification Suite

> Client decisions (2026-06-13): customers need lifecycle awareness emails
> (awaiting-quote, quote-ready, paid, status updates). PLUS chat notifications:
> (a) post lifecycle updates into a buyer↔vendor chat thread, and (b) email the
> recipient when they get a new chat message. Vendor side = the custom-print
> product's `creatorUserId` in a `creator`-kind Stream channel.

## 1. Pure email base layout (test-first)

- [x] 1.1 `lib/email/template.js`: light-theme base layout matching the design
      system (#fefefe bg, #111 text, #e6e6e6 hairlines, rounded cards, Inter
      stack, amber→red gradient CTA), table-based + inline CSS for email clients.
      Exports `emailLayout({ title, preheader, bodyHtml })`, `ctaButton`,
      `infoTable`, `breakdownTable({ lines, total, currency })`, `esc`.
- [x] 1.2 `tests/unit/emailTemplate.test.js`: asserts required content (amounts,
      CTA href, escaping of `<`), no `undefined` leaks.

## 2. Pure custom-print email builders (test-first)

- [x] 2.1 `lib/email/templates/customPrint.js`: `(data) => { subject, html }`
      builders — `buildAwaitingQuoteEmail`, `buildQuoteReadyEmail`,
      `buildPaymentReceivedEmail`, `buildStatusUpdateEmail`,
      `buildCancelledEmail`; admin variants `buildNewRequestAdminEmail`,
      `buildPaymentReceivedAdminEmail`. Reuse the breakdown partial.
- [x] 2.2 `tests/unit/customPrintEmails.test.js`: each builder includes the
      request id, the right amount/breakdown, and a pay/track CTA where relevant.

## 3. Pure chat message builders (test-first)

- [x] 3.1 `lib/chat/customPrintMessages.js`: `customPrintChatMessage(event, data)`
      → plain-text string per lifecycle event (awaiting-quote, quote-ready,
      paid, printing, printed, shipped, delivered, cancelled). Pure.
- [x] 3.2 `tests/unit/customPrintChatMessages.test.js`.

## 4. Side-effect adapters (best-effort, never block the request)

- [x] 4.1 `lib/chatNotify.js`: `postCustomPrintChatUpdate({ buyerUserId,
      creatorUserId, text, requestId })` — upsert users, find/create the
      `creator`-kind channel for [buyer, creator], `sendMessage` as the creator,
      upsert `ChannelSummary`. No-op + warn when Stream env unset. Mirrors
      `app/api/chat/channel` + `auto-reply` logic (extracted/shared).
- [x] 4.2 `lib/notifications/customPrint.js`: `notifyCustomPrintEvent({ event,
      request, product, quoteBreakdown })` — sends the customer email + posts the
      chat update; admin email for new-request/paid. Each leg wrapped so a
      failure logs and never throws (same pattern as the manual-quote email).

## 5. Wire lifecycle hooks

- [x] 5.1 `app/api/custom-print/config/route.js` (manual save) → customer
      "awaiting quote" email + chat (admin email already sent).
- [x] 5.2 `app/api/quote/route.js` (instant quote persisted) → customer
      "quote ready" email + chat with the breakdown + pay CTA.
- [x] 5.3 `app/api/admin/custom-print-requests/route.js`:
      `action==='quote'` → quote-ready; `action==='status'` → status-update;
      `action==='cancel'` → cancelled. Customer email + chat each.
- [x] 5.4 `app/api/webhook/stripe/route.js` → payment-received customer + admin
      email + chat (verify it covers custom prints via `customPrintChargeBreakdown`).

## 6. Email on new chat message

- [x] 6.1 `app/api/webhook/stream/route.js` (`message.new`): email the OTHER
      participant ("New message from {sender}") — best-effort, skip if the
      sender is the recipient or no email on file. Throttle is out of scope
      (flag if volume becomes an issue).

## 7. Verify

- [x] 7.1 `yarn test:run` green; lint changed files.

## 8. Restyle the 4 pre-existing emails onto the base layout

- [x] 8.1 `lib/email/templates/transactional.js`: `buildOrderConfirmationEmail`
      (customer), `buildNewSaleEmail` (creator), `buildDeliveryTypeChangedEmail`
      (creator) — full docs via `emailLayout`.
- [x] 8.2 Restyle `lib/manualQuoteEmail.js` to render through `emailLayout`
      (drop the dark `wrapInTemplate` at the call site).
- [x] 8.3 Wire: checkout confirmation, stripe new-sale, notify-delivery-change,
      manual-quote admin. `tests/unit/transactionalEmails.test.js` (+ existing
      manualQuoteEmail tests still green).

## 9. Idle / unconfigured nudge (now that a scheduler exists)

- [x] 9.1 Pure `lib/notifications/idleRequests.js#selectIdleRequests`
      (eligible pre-payment statuses, idle threshold, cooldown) + tests.
- [x] 9.2 `buildIdleNudgeEmail` (status-tailored copy/CTA) + tests.
- [x] 9.3 `CustomPrintRequest.idleNudgeSentAt` field (cooldown bookkeeping).
- [x] 9.4 `app/api/cron/custom-print-nudges` (CRON_SECRET-guarded GET; query
      candidates → send → stamp). Scheduler = free GitHub Actions workflow
      `.github/workflows/custom-print-nudges.yml` (daily 09:00 UTC; repo secrets
      `CRON_SECRET` + `CRON_BASE_URL`). `.env.example`: `CRON_SECRET`,
      `CUSTOM_PRINT_NUDGE_IDLE_DAYS`, `CUSTOM_PRINT_NUDGE_COOLDOWN_DAYS`.
