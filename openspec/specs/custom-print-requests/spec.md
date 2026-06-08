# Custom Print Requests Specification

## Purpose

The custom-print capability lets a signed-in customer turn an uploaded 3D model
into a paid print order. It owns the `CustomPrintRequest` lifecycle from upload
through configuration, quoting, payment, production, and delivery. Pricing is
produced by the customer-facing Instant Quoting Engine (auto-quote on
configuration), with an admin override retained.

## Requirements

### Requirement: Custom print request lifecycle
The system SHALL represent each custom print as a `CustomPrintRequest` whose
`status` is one of `pending_upload`, `pending_config`, `configured`, `quoted`,
`payment_pending`, `paid`, `printing`, `printed`, `shipped`, `delivered`, or
`cancelled`, and SHALL record every status transition in `statusHistory`.

#### Scenario: Status advances as data is supplied
- GIVEN a new request created with status `pending_upload`
- WHEN the customer uploads a model file
- THEN the status advances to `pending_config`
- AND WHEN the customer saves print settings, the status advances to `configured`
- AND each transition appends a `{ status, updatedAt, note }` entry to `statusHistory`

### Requirement: Print configuration capture
The system SHALL persist the customer's print configuration on the request,
including `printSettings` (layerHeight, initialLayerHeight, materialType,
wallLoops, infill density/pattern, nozzleDiameter, support flags, printPlate)
and per-mesh `meshColors`.

#### Scenario: Saving a configuration
- GIVEN an uploaded model in status `pending_config`
- WHEN the customer submits print settings
- THEN `printConfiguration.printSettings` is stored
- AND `printConfiguration.isConfigured` is true with a `configuredAt` timestamp
- AND the status becomes `configured`

### Requirement: Instant auto-quote on simple-mode configuration
The system SHALL compute a customer-facing instant quote via the Instant Quoting
Engine (`lib/quoting/quote.js`) when a customer saves a configuration in **simple
mode**, persist the itemized quote and total onto the request, and automatically
advance the request to `quoted` with that total. Advanced-mode configurations
SHALL NOT be auto-quoted — they stay at `configured` until an admin sets a
manual quote. An admin MAY also override an instant quote (recorded in
`statusHistory`). The legacy `calculatePrintCost` / `printPricingFormula` remains
only until the admin "calculate print cost" tool migrates.

#### Scenario: Auto-quote on simple-mode configuration
- GIVEN a custom print request with an uploaded model and a saved simple-mode
  configuration (with geometry metrics available)
- WHEN the configuration is submitted with `mode: 'instant'`
- THEN the engine computes an itemized quote from the metrics and settings
- AND the request stores the quote and `quotedAt` and advances to `quoted`

#### Scenario: Advanced-mode submit stays at `configured`
- GIVEN a custom print request with a saved advanced-mode configuration
- WHEN the configuration is submitted with `mode: 'manual'`
- THEN the engine is NOT invoked
- AND the request stays at status `configured` until an admin issues a quote

#### Scenario: Admin override
- GIVEN a request already in `quoted` with an auto-computed total
- WHEN an admin sets a different total
- THEN the request's effective total reflects the admin value
- AND the change is recorded in `statusHistory`

### Requirement: Quote mode is persisted per request
Each `CustomPrintRequest` SHALL record whether it was quoted instantly (simple
mode, server-authoritative) or manually (advanced mode, admin sets the price),
via a `quoteMode: 'instant' | 'manual'` field set when the configuration is
saved (and defensively set to `'manual'` by the admin set-quote action).

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
when the request has no delivery types yet, and SHALL record the
geometry-derived dimensions (cm) and weight (kg from `quote.inputs.weightGrams`),
so the cart can price delivery and the customer can proceed to checkout
immediately.

#### Scenario: Defaults are applied if none are set
- GIVEN a custom-print request with no delivery types
- WHEN the Instant Quoting Engine persists a quote for it
- THEN `request.delivery.deliveryTypes` contains the active "print" delivery
  defaults from `AppSettings.additionalDeliveryTypes`
- AND `request.dimensions` reflects the model's bounding box and computed weight

### Requirement: Manual quotes notify the admin
When a customer submits a configuration in manual (advanced) mode, the system
SHALL attempt to send a best-effort admin notification email summarising the
request (via `lib/email.js` using a `lib/manualQuoteEmail` pure body builder),
without blocking the save if email infrastructure is unavailable.

#### Scenario: Email failure does not block the save
- GIVEN email credentials are missing or the email send throws
- WHEN a manual configuration is saved
- THEN the request is still saved successfully and returns 200

### Requirement: Cart shows the right view for each mode
The cart SHALL display the Instant Quoting Engine total for instant prints and
the legacy `basePrice + printFee` for manual prints; it SHALL show the generic
(Strength/Quality/Colour) configuration view for instant prints and the
advanced settings view for manual prints. The price-source rule SHALL live in
the pure helper `lib/customPrintDisplayPrice.js`.

#### Scenario: Instant cart row shows the engine total
- GIVEN a quoted custom-print request with `quoteMode: 'instant'` and a `quote`
- WHEN the cart renders the row
- THEN the displayed price equals `quote.total`
- AND the price label reads "Instant Quote"

#### Scenario: Manual or legacy cart row uses basePrice + printFee
- GIVEN a quoted custom-print request with `quoteMode: 'manual'` (or unset)
- WHEN the cart renders the row
- THEN the displayed price equals `basePrice + printFee`

### Requirement: Model upload reports real progress
When a customer uploads a 3D model for a custom-print request, the UI SHALL
report real upload progress (0–100%) derived from the bytes sent to storage,
rather than only 0% before and 100% after.

#### Scenario: Progress reflects bytes sent
- GIVEN a model is uploading to storage
- WHEN 50% of the bytes have been sent
- THEN the progress indicator shows approximately 50%

#### Scenario: Progress is clamped and rounded
- GIVEN a progress event with `loaded`/`total` bytes
- WHEN the percentage is computed
- THEN it is an integer clamped to the range 0–100
- AND an unknown or zero total yields 0

### Requirement: Persisted quote breakdown
The system SHALL store the itemized quote (the factor lines, expedite, subtotal,
total, currency, confidence, inputs) and `quotedAt` on the `CustomPrintRequest`,
so the price shown to the customer matches the price charged at checkout.

#### Scenario: Quote persists to checkout
- GIVEN a request quoted at total T
- WHEN it is added to the cart and the checkout breakdown is computed
- THEN the custom-print line price equals T (plus delivery, per existing rules)

### Requirement: Clear customer status communication
The system SHALL communicate a request's state in terms of who must act next, and
SHALL NOT describe a request as "incomplete" once the customer has supplied
everything required of them. Statuses map to stages: `pending_upload`/
`pending_config` → action needed by the customer; `configured` → awaiting quote
(reassuring copy, no action); `quoted`/`payment_pending` → ready to pay; `paid`+
→ in production.

#### Scenario: Configured request is not called "incomplete"
- GIVEN a request in status `configured`
- WHEN the customer views it in the cart
- THEN the UI shows an "awaiting/preparing your quote" message and never "Incomplete"

#### Scenario: Genuinely incomplete request prompts the customer
- GIVEN a request in status `pending_upload` or `pending_config`
- WHEN the customer views it in the cart
- THEN the UI clearly indicates the customer must finish the request, with a CTA

### Requirement: Quoted price is fixed at checkout
The system SHALL, once a request is `quoted` or later, price it in the cart and
checkout breakdown as a fixed total and SHALL NOT dynamically re-price it. Custom
prints appear in the cart under the synthetic product id `custom-print:{requestId}`.

#### Scenario: Quoted request added to cart
- GIVEN a request in status `quoted` with a persisted total
- WHEN it is added to the cart and the checkout breakdown is computed
- THEN the item price equals the quoted total plus the selected delivery fee

### Requirement: Delivery options and dimensions
The system SHALL store per-request available `delivery.deliveryTypes` (with
`price`/`customPrice`/`pickupLocation`) and `dimensions` (length/width/height in
cm, weight in kg) used for delivery pricing.

#### Scenario: Delivery fee from selected type
- GIVEN a request with one or more delivery types and a chosen type
- WHEN the checkout breakdown is computed
- THEN the delivery fee uses the chosen type's `customPrice` if set, else `price`

### Requirement: Model downloads preserve the original filename and extension
The system SHALL serve downloaded model files named with the user's original
filename and correct extension (from `modelFile.originalName`), regardless of how
the download is initiated, by always setting `Content-Disposition: attachment`
with a sanitised filename. A served filename SHALL never be the route name
("proxy") and SHALL never lack an extension.

#### Scenario: Download uses the original filename
- GIVEN a request whose `modelFile.originalName` is "bracket.stl"
- WHEN an operator downloads the model
- THEN the downloaded file is named "bracket.stl"

#### Scenario: Filename input is sanitised
- GIVEN a download requested with a filename containing path separators or
  control/header characters
- WHEN the server builds the Content-Disposition header
- THEN those characters are stripped so no header injection or path traversal occurs
