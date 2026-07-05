# Generic Print Presets (delta for add-generic-print-presets)

## ADDED Requirements

### Requirement: Generic configuration in plain language
The system SHALL offer a generic configuration mode (the default) in which the
customer selects only Strength (`Normal`/`Draft`/`Strong`), Quality
(`Draft`/`Medium`/`High`), and Colour (from the available catalogue), without
exposing slicer-level controls.

#### Scenario: Generic mode is the default
- GIVEN a customer opens the editor for a custom print
- WHEN the editor loads
- THEN generic mode is shown with Strength, Quality, and Colour controls
- AND advanced (detailed) settings remain available via a toggle

### Requirement: Deterministic preset-to-settings mapping
The system SHALL translate a (Strength, Quality, Colour) selection into concrete
`printSettings` via a single deterministic mapping, such that Quality controls
layer height (Draft = thickest/fastest, High = thinnest/best) and Strength
controls wall loops and infill density (Strong > Normal > Draft).

#### Scenario: Quality controls layer height
- GIVEN two generic selections identical except Quality = Draft vs High
- WHEN they are mapped to print settings
- THEN the Draft selection has a larger layer height than the High selection

#### Scenario: Strength controls walls and infill
- GIVEN two generic selections identical except Strength = Draft vs Strong
- WHEN they are mapped to print settings
- THEN the Strong selection has more wall loops and higher infill density

### Requirement: Admin-configurable colour/material catalogue
The system SHALL source the selectable colours from an admin-configured catalogue
(`name`, `hex`, optional `material`, optional `priceModifier`), so only available
colours/materials are offered, and a colour MAY map to a material that affects the
quote.

#### Scenario: Only catalogued colours are offered
- GIVEN an admin has set the available colours
- WHEN a customer opens the colour dropdown
- THEN exactly those colours are selectable

#### Scenario: Material-bearing colour affects settings
- GIVEN a colour whose catalogue entry specifies a material (e.g. Wood, Transparent)
- WHEN it is selected
- THEN the mapped print settings use that material

### Requirement: Instant quote and pay-first for generic configs
The system SHALL, for a complete generic selection, compute an instant quote via
the Instant Quoting Engine and let the customer pay immediately, auto-quoting the
request (`configured → quoted`) without requiring admin action.

#### Scenario: Generic selection yields an instant payable quote
- GIVEN an uploaded model and a complete generic selection
- WHEN the selection is finalized
- THEN an itemized instant quote is shown
- AND the customer can proceed directly to payment without waiting for an admin

#### Scenario: Price responds to choices
- GIVEN a generic selection with an instant quote shown
- WHEN the customer raises Strength or Quality
- THEN the quoted price updates to reflect the higher material/time usage
