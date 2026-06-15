# Spec delta for: email-notifications

## ADDED Requirements

### Requirement: Custom-print lifecycle emails keep the customer informed

The system SHALL email the customer at each meaningful transition of their
custom-print request, so they always know the next step. Emails are sent
best-effort: a delivery failure MUST be logged and MUST NOT block or fail the
triggering request.

#### Scenario: Manual configuration submitted (awaiting quote)
- **WHEN** a customer saves an advanced (manual) print configuration
- **THEN** the customer receives an "awaiting quote" email confirming their
  settings were received and that a quote will follow.

#### Scenario: Instant quote ready
- **WHEN** the Instant Quoting Engine persists a quote for the customer's request
- **THEN** the customer receives a "quote ready" email containing the itemized
  breakdown, the total, the request id, and a call-to-action to pay.

#### Scenario: Manual quote set by admin
- **WHEN** an admin sets a manual quote (price) on a request
- **THEN** the customer receives a "quote ready" email with the amount and a
  call-to-action to pay.

#### Scenario: Payment received
- **WHEN** payment for a custom-print request is confirmed
- **THEN** the customer receives a payment-confirmation email and the admin
  receives a "start work" notification, both reflecting the charged amount
  (`customPrintChargeBreakdown`).

#### Scenario: Status update
- **WHEN** an admin transitions a paid request (printing, printed, shipped,
  delivered)
- **THEN** the customer receives a status-update email; the shipped email
  includes any tracking/delivery information present on the request.

#### Scenario: Request cancelled
- **WHEN** an admin cancels a request
- **THEN** the customer receives a cancellation email with the reason note if
  provided.

### Requirement: Emails use one polished, on-brand base layout

All notification emails SHALL render through a single base layout that matches
the storefront design system (light theme, Inter stack, thin `#e6e6e6`
hairlines, rounded cards, amber→red gradient CTA), using inline CSS and
table-based structure for email-client compatibility. Template bodies SHALL be
produced by pure `(data) => { subject, html }` builders that escape
user-supplied values and are unit-tested without sending mail.

#### Scenario: Itemized amounts are present and escaped
- **WHEN** a quote-ready or payment email is built for a request
- **THEN** the HTML contains each breakdown line, the total, and the request id,
  and any user-supplied text (e.g. model file name) is HTML-escaped.
