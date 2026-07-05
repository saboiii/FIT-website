# Proposal: OTP Contact Verification at Checkout (future)

> Status: **DROPPED 2026-06-12** (archived; client chose email-only — see Resolution). Originally needed an SMS/WhatsApp
> provider (account, credentials, cost approval); none exists in the repo (only
> nodemailer email). Cannot be implemented end-to-end until a provider is chosen.
> Inspired by the reference flow (quote.additiveinn.com).

## Why

The reference quoting flow collects a contact channel (email / SMS / WhatsApp,
WhatsApp preferred) and verifies it with a one-time passcode before the order is
accepted, so the team has a reliable way to send print/order updates. Our flow
relies on the Clerk account email only; for custom prints (where back-and-forth
about the model is common) a verified, preferred contact channel reduces failed
deliveries and missed configuration deadlines.

## What Changes

- Capture a preferred contact channel + value during custom-print checkout.
- Send an OTP to that channel and require verification before the order is placed.
- Store the verified channel on the order/request for notifications.

## Impact

- **Specs:** adds a `contact-verification` capability; modifies checkout.
- **Code:** OTP send/verify endpoints, an SMS/WhatsApp provider integration
  (none exists today — email is via nodemailer), checkout UI step.
- **Risks:** provider cost/setup (WhatsApp Business API), rate-limiting/abuse,
  privacy of stored contact details. Out of scope: full multi-channel
  notification system.

## Resolution (2026-06-12) — dropped in favour of email-only

Client decided email is sufficient — no SMS/WhatsApp provider will be set up.
The Clerk account email is already verified at sign-up, so no extra OTP step is
needed. The follow-on work is making sure email notifications cover all key
use cases with polished templates — tracked in `add-email-notifications-suite`.
