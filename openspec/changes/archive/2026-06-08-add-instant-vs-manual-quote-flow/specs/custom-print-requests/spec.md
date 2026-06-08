# Custom Print Requests — delta for add-instant-vs-manual-quote-flow

## ADDED Requirements

### Requirement: Quote mode is persisted per request
Each `CustomPrintRequest` SHALL record whether it was quoted instantly (simple
mode, server-authoritative) or manually (advanced mode, admin sets the price),
via a `quoteMode: 'instant' | 'manual'` field set when the configuration is
saved.

#### Scenario: Saving from simple mode marks the request instant
- WHEN a customer saves a configuration from simple mode and the Instant Quoting
  Engine persists a quote
- THEN the request's `quoteMode` is `'instant'`

#### Scenario: Saving from advanced mode marks the request manual
- WHEN a customer saves a configuration from advanced mode
- THEN the request's `quoteMode` is `'manual'`
- AND no instant quote is persisted automatically

### Requirement: Instant quotes are immediately payable with admin-default delivery
For a request quoted by the Instant Quoting Engine, the server SHALL attach the
admin-configured default delivery options for custom prints (the active
`additionalDeliveryType`s whose `applicableToProductTypes` includes `'print'`)
and SHALL record the geometry-derived dimensions and weight, so the cart can
price delivery and the customer can proceed to checkout immediately.

#### Scenario: Defaults are applied if none are set
- GIVEN a custom-print request with no delivery types
- WHEN the Instant Quoting Engine persists a quote for it
- THEN `request.delivery.deliveryTypes` contains the active "print" delivery
  defaults from `AppSettings.additionalDeliveryTypes`

### Requirement: Manual quotes notify the admin
When a customer submits a configuration in manual (advanced) mode, the system
SHALL attempt to send a best-effort admin notification email summarising the
request, without blocking the save if email infrastructure is unavailable.

#### Scenario: Email failure does not block the save
- GIVEN email credentials are missing or the email send throws
- WHEN a manual configuration is saved
- THEN the request is still saved successfully and returns 200

### Requirement: Cart shows the right view for each mode
The cart SHALL display the Instant Quoting Engine total for instant prints and
the legacy `basePrice + printFee` for manual prints; it SHALL show the generic
(Strength/Quality/Colour) configuration view for instant prints and the
advanced settings view for manual prints.

#### Scenario: Instant cart row shows the engine total
- GIVEN a quoted custom-print request with `quoteMode: 'instant'` and a `quote`
- WHEN the cart renders the row
- THEN the displayed price equals `quote.total`
