# 3D Model Editor — delta for fix-editor-panel-layout

## MODIFIED Requirements

### Requirement: Editor overlay placement
The editor's overlay controls (instant-quote panel, simple-mode configuration
panel, and the Simple/Advanced mode toggle) SHALL be anchored to the 3D canvas
area (a positioned ancestor) rather than the viewport, and SHALL NOT overlap the
global chat launcher.

#### Scenario: Quote panel clear of the chat launcher
- GIVEN the global chat launcher is anchored at the bottom-left of the viewport
- WHEN a model is loaded and the instant-quote panel is shown
- THEN the quote panel is anchored to the canvas (not the viewport) and does not
  occupy the same corner as the chat launcher
