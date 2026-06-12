# Admin Custom Print Requests Specification

## Purpose

The admin/print-farm view for managing customer custom-print requests: reading
the full print configuration, downloading the model and config, and progressing
the request. This capability covers how the configuration is surfaced to the
operator.

## Requirements

### Requirement: Inline expandable print configuration
The system SHALL let an admin/print-farm operator expand any custom print request
in the admin list to read its full print configuration inline — all print
settings, all mesh colours (labelled), the model dimensions/weight, and the quote
total when available — via an explicit expand/collapse control, without entering
edit mode and without leaving the list. The configuration SHALL remain
downloadable.

#### Scenario: Expand a request to read its configuration
- GIVEN the admin custom-print-requests list with a configured request
- WHEN the operator clicks the request's expand control
- THEN the full print configuration (settings + mesh colours + dimensions) is shown inline
- AND collapsing it hides the detail again

#### Scenario: Configuration is readable while editing is available
- GIVEN a request whose configuration is expanded
- WHEN the operator chooses to edit the request
- THEN the configuration remains readable (display is not lost by entering edit mode)

#### Scenario: Downloads remain available
- GIVEN an expanded request
- WHEN the operator chooses to download
- THEN both the print configuration and the model file can be downloaded

### Requirement: Dimension input validation with machine limits
Admin endpoints that persist dimensions (`PUT /api/admin/custom-print-requests`,
`POST /api/product/custom-print-config`) SHALL reject non-object, non-finite,
or negative dimension values (400), and SHALL additionally reject dimensions or
weight exceeding the admin-configured `AppSettings.machineLimits`
(max length/width/height in cm, max weight in kg). Unset/null limits enforce
nothing, so the mechanism is safe before the print farm's real numbers are
entered. The quote API applies the same limits to customer models (422 with a
customer-safe message).

#### Scenario: Structural validation
- GIVEN a dimensions payload with a negative or NaN value
- WHEN an admin endpoint validates it
- THEN the request is rejected with 400

#### Scenario: Machine limit exceeded (unit-typo catch)
- GIVEN machineLimits.maxWeightKg = 5 and a submitted weight of 500
  (grams mistakenly entered as kg)
- WHEN an admin endpoint validates the dimensions
- THEN the request is rejected with a message naming the field and the limit

#### Scenario: No limits configured
- GIVEN machineLimits fields all null
- WHEN any dimensions are submitted
- THEN only structural validation applies
