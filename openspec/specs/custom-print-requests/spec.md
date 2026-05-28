# Custom Print Requests Specification

## Purpose

The custom-print capability lets a signed-in customer turn an uploaded 3D model
into a paid print order. It owns the `CustomPrintRequest` lifecycle from upload
through configuration, quoting, payment, production, and delivery. This spec
documents the system **as it exists today** (admin-driven quoting); the
`add-instant-quoting-engine` change augments it with a customer-facing instant
quote.

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

### Requirement: Admin-driven suggested pricing
The system SHALL provide a suggested print cost via `calculatePrintCost(config,
dimensions, formula)` in `lib/printPricing.js`, using the
`AppSettings.printPricingFormula` (`baseFee`, `materialCostPerGram`,
`supportMultiplier`, `highQualityMultiplier`, `markupPercentage`). The price is
suggested to an admin, who sets the final `basePrice` + `printFee` and moves the
request to `quoted`.

#### Scenario: Suggested cost from formula
- GIVEN a formula and a request configuration with dimensions
- WHEN `calculatePrintCost` is invoked
- THEN it estimates material weight from explicit `weight` (kg→g) or from volume
  (length×width×height cm³ × PLA density), scales material usage by infill
  (30% shell + 70%×infill), applies the high-quality multiplier when
  layerHeight < 0.15 mm, applies the support multiplier when support is enabled,
  applies markup, and returns the value rounded to 2 decimals

#### Scenario: Missing formula
- GIVEN `formula` is null or undefined
- WHEN `calculatePrintCost` is invoked
- THEN it returns 0

### Requirement: Quoted price is fixed at checkout
The system SHALL, once a request is `quoted` or later, price it in the cart and
checkout breakdown as a fixed `basePrice + printFee` and SHALL NOT dynamically
re-price it. Custom prints appear in the cart under the synthetic product id
`custom-print:{requestId}`.

#### Scenario: Quoted request added to cart
- GIVEN a request in status `quoted` with `basePrice` and `printFee` set
- WHEN it is added to the cart and the checkout breakdown is computed
- THEN the item price equals `basePrice + printFee` plus the selected delivery fee

### Requirement: Delivery options and dimensions
The system SHALL store per-request available `delivery.deliveryTypes` (with
`price`/`customPrice`/`pickupLocation`) and `dimensions` (length/width/height in
cm, weight in kg) used for delivery pricing.

#### Scenario: Delivery fee from selected type
- GIVEN a request with one or more delivery types and a chosen type
- WHEN the checkout breakdown is computed
- THEN the delivery fee uses the chosen type's `customPrice` if set, else `price`
