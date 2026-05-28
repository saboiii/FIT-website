# Testing Specification

## Purpose

Defines the automated test harness and the baseline regression coverage for the
platform's business logic, so behaviour is documented as executable specification
and regressions are caught early. Established by change
`add-test-framework` (archived 2026-05-28).

## Requirements

### Requirement: Test runner
The system SHALL provide a Vitest-based test runner with a jsdom environment and
the `@/*` path alias resolving to the repo root, runnable via `yarn test:run`
(one-shot) and `yarn test` (watch).

#### Scenario: Suite runs and passes
- GIVEN the repository with dependencies installed
- WHEN `yarn test:run` is executed
- THEN Vitest discovers `tests/**/*.test.{js,jsx}` and the suite passes

### Requirement: Business-logic regression coverage
The system SHALL include automated tests covering the pure pricing, discount,
delivery, validation, and slug logic so behavioural regressions are detected.

#### Scenario: Pricing logic is covered
- GIVEN the test suite
- WHEN it runs
- THEN `calculatePrintCost`, discount, delivery-tier, and cart-breakdown logic
  each have passing assertions covering their main branches
