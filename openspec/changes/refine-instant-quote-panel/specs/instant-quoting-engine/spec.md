# Instant Quoting Engine — delta for refine-instant-quote-panel

## MODIFIED Requirements

### Requirement: Live editor quote panel
The editor SHALL show a live, server-authoritative quote panel that sends
geometry metrics + settings + option toggles to `POST /api/quote` (debounced) and
renders the itemized breakdown, never computing or sending a price. The panel
SHALL make the following explicit so a correct quote is not mistaken for a broken
one:

- When the engine floored the total to the minimum price
  (`quote.minimumApplied`), the panel SHALL show a note that the minimum order
  price was applied, including the floor amount.
- The print-time line SHALL display the estimated print hours
  (`quote.inputs.printHours`) and SHALL label print time as an estimate of
  machine time.
- The geometry summary SHALL distinguish the solid mesh **volume** from the
  bounding-**box** dimensions so they are not conflated.

#### Scenario: Minimum price is surfaced
- GIVEN a configuration whose computed subtotal is below the minimum price
- WHEN the panel renders the returned quote with `minimumApplied: true`
- THEN the panel shows a "minimum order price applied" note with the floor amount
- AND the total equals the minimum price

#### Scenario: Print time shows hours
- GIVEN a quote whose `inputs.printHours` is 2.3
- WHEN the panel renders the print-time line
- THEN the estimated hours (≈2.3 h) are shown alongside the print-time price
