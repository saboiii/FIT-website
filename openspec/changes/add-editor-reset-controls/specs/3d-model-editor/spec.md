# 3D Model Editor (delta for add-editor-reset-controls)

## ADDED Requirements

### Requirement: Reset configuration to defaults
The system SHALL provide a reset-to-defaults control that is discoverable in both
generic and advanced editor modes, restoring all print/visual/lighting settings
(and mesh colours) to their defaults, and SHALL also allow resetting an
individual setting to its default without affecting the others. Defaults SHALL be
sourced from the single set of default constants.

#### Scenario: Reset all from generic mode
- GIVEN the editor in generic mode with customised settings
- WHEN the customer activates "Reset to defaults"
- THEN all settings and mesh colours return to their default values

#### Scenario: Reset a single setting
- GIVEN the editor with several settings changed from their defaults
- WHEN the customer resets one specific setting
- THEN only that setting returns to its default and the others are unchanged
