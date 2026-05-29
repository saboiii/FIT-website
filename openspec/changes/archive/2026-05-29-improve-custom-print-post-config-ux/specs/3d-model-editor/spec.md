# 3D Model Editor (delta for improve-custom-print-post-config-ux)

## MODIFIED Requirements

### Requirement: Submit configuration
The system SHALL let the customer save/submit the print configuration, persisting
it to the associated `CustomPrintRequest`, and upon success SHALL navigate the
customer back to the context from which the editor was launched (the originating
order/request page), carrying the `requestId`, using client-side routing and an
explicit success confirmation. The system SHALL NOT rely on a fixed-delay
full-page redirect. (Previously: a 1.5s-delayed `window.location.href` redirect
always sent custom prints to `/cart` and direct orders to `/account`.)

#### Scenario: Return to origin after saving (cart flow)
- GIVEN the editor was launched from the cart for a custom print
- WHEN the customer saves the configuration successfully
- THEN the configuration is persisted and the status advances to `configured`
- AND the customer is routed back to the cart showing that request updated

#### Scenario: Return to origin after saving (direct print order)
- GIVEN the editor was launched from a direct print order page
- WHEN the customer saves the configuration successfully
- THEN the customer is routed back to that order page (not a generic page)
- AND a success confirmation is shown
