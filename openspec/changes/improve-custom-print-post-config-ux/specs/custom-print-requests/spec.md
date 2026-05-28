# Custom Print Requests (delta for improve-custom-print-post-config-ux)

## ADDED Requirements

### Requirement: Clear customer status communication
The system SHALL communicate a custom print request's state to the customer in
terms of who must act next, and SHALL NOT describe a request as "incomplete"
once the customer has supplied everything required of them. Each status maps to
exactly one customer-facing stage:
- `pending_upload`, `pending_config` → **action needed by the customer**
- `configured` → **awaiting quote** (no customer action; reassuring copy)
- `quoted`, `payment_pending` → **ready to pay**
- `paid` and later → **in production / fulfilment**

#### Scenario: Configured request is not called "incomplete"
- GIVEN a custom print request in status `configured`
- WHEN the customer views it in the cart
- THEN the UI shows an "awaiting quote / preparing your quote" message
- AND the word "Incomplete" is not shown

#### Scenario: Genuinely incomplete request prompts the customer
- GIVEN a custom print request in status `pending_upload` or `pending_config`
- WHEN the customer views it in the cart
- THEN the UI clearly indicates the customer still needs to finish the request
- AND provides a call-to-action to complete it

#### Scenario: Stale state is not shown after saving
- GIVEN the customer has just saved a configuration (status now `configured`)
- WHEN they are returned to the originating page
- THEN the displayed status reflects `configured` (not a stale earlier status)
