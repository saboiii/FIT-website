# Testing (delta for add-test-framework)

## ADDED Requirements

### Requirement: Test runner
The system SHALL provide a Vitest-based test runner with a jsdom environment and
the `@/*` path alias resolving to the repo root, runnable via `yarn test:run`
(one-shot) and `yarn test` (watch).

#### Scenario: Suite runs and passes
- GIVEN the repository with dependencies installed
- WHEN `yarn test:run` is executed
- THEN Vitest discovers `tests/**/*.test.js` and the baseline suite passes

### Requirement: Business-logic regression coverage
The system SHALL include automated tests covering the existing pure pricing,
discount, delivery, validation, and slug logic so behavioural regressions are
detected.

#### Scenario: Pricing logic is covered
- GIVEN the test suite
- WHEN it runs
- THEN `calculatePrintCost`, discount, delivery-tier, and cart-breakdown logic
  each have passing assertions covering their main branches
