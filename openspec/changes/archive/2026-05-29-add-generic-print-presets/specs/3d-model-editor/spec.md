# 3D Model Editor (delta for add-generic-print-presets)

## MODIFIED Requirements

### Requirement: Print settings (printability) controls
The system SHALL offer two configuration modes: a **generic** mode (default) with
plain-language Strength, Quality, and Colour choices (see the
`generic-print-presets` capability), and an **advanced** mode exposing the full
leva print settings — layer height, initial layer height, wall loops, infill
density and pattern, nozzle diameter, support enable/type, and print plate. The
customer SHALL be able to switch between modes; selecting generic choices SHALL
populate the same underlying `printSettings` used by advanced mode. (Previously:
a simplified preset mode offered four fixed presets — Draft/Standard/High
Quality/Strong & Durable — and eight colour swatches.)

#### Scenario: Switching between generic and advanced
- GIVEN the editor in generic mode with a Strength/Quality/Colour selection
- WHEN the customer switches to advanced mode
- THEN the leva controls reflect the print settings derived from the generic choices
- AND further manual edits are possible

#### Scenario: Generic choices populate print settings
- GIVEN the editor in generic mode
- WHEN the customer selects a Strength, Quality, and Colour
- THEN the underlying `printSettings` (layer height, walls, infill, material, mesh
  colours) are set accordingly for downstream pricing and fulfilment
