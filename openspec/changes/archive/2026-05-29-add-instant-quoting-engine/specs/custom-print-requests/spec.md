# Custom Print Requests (delta for add-instant-quoting-engine)

## MODIFIED Requirements

### Requirement: Admin-driven suggested pricing
The system SHALL compute a customer-facing instant quote via the Instant Quoting
Engine (`lib/quoting/quote.js`) when a model is configured, persist the itemized
quote and total onto the request, and automatically advance the request to
`quoted` with that total. An admin MAY still override the quoted total (the
override is recorded in `statusHistory`). (Previously: pricing was only a
suggestion to an admin via `calculatePrintCost`, and reaching `quoted` required a
manual admin action.)

#### Scenario: Auto-quote on configuration
- GIVEN a custom print request with an uploaded model and saved print settings
- WHEN the configuration is submitted
- THEN the engine computes an itemized quote from the geometry metrics and settings
- AND the request stores the quote and `quotedAt` and advances to `quoted`

#### Scenario: Admin override
- GIVEN a request already in `quoted` with an auto-computed total
- WHEN an admin sets a different `printFee`/total
- THEN the request's effective total reflects the admin value
- AND the change is recorded in `statusHistory`

## ADDED Requirements

### Requirement: Persisted quote breakdown
The system SHALL store the itemized quote (the seven factor lines, expedite,
subtotal, total, currency, confidence) and `quotedAt` on the
`CustomPrintRequest`, so the price shown to the customer in the editor matches
the price charged at checkout.

#### Scenario: Quote persists to checkout
- GIVEN a request quoted at total T in the editor
- WHEN it is added to the cart and the checkout breakdown is computed
- THEN the custom-print line price equals T (plus delivery, per existing rules)
