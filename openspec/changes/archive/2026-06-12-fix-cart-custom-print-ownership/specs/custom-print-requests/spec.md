# Delta for custom-print-requests — cart addition ownership

## ADDED Requirements

### Requirement: Adding a request to the cart requires ownership
The system SHALL only add a custom-print request to the authenticated user's
cart when the request belongs to that user; a requestId owned by another user
SHALL be answered exactly like an unknown requestId (404, no cart change), so
the endpoint is not an existence oracle. The cart line's snapshot price SHALL
come from the shared display-price selector (instant → `quote.total`,
manual/legacy → `basePrice + printFee`).

#### Scenario: Foreign request is rejected
- GIVEN a signed-in user A and a custom-print request owned by user B
- WHEN A posts B's requestId to /api/cart/custom-print
- THEN the response is 404 and A's cart is unchanged

#### Scenario: Own request is added with the displayed price
- GIVEN a signed-in user with an instant-quoted request (quote.total = T)
- WHEN they post its requestId to /api/cart/custom-print
- THEN the cart gains one line with the synthetic productId and price T
