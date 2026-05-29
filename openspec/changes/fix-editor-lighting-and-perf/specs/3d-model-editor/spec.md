# 3D Model Editor — delta for fix-editor-lighting-and-perf

## MODIFIED Requirements

### Requirement: Lighting preset takes effect
When the user changes the lighting preset (rembrandt/portrait/upfront/soft), the
viewer's light rig SHALL rebuild so the change is visible.

#### Scenario: Switching presets changes lighting
- GIVEN a model is loaded with the default lighting preset
- WHEN the user selects a different lighting preset
- THEN the scene's lighting visibly changes to match the selected preset
