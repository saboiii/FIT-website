# Delta for admin-custom-print-requests — dimension validation + machine limits

## ADDED Requirements

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
