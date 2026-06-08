# 3D Model Editor Specification

## Purpose

The in-browser 3D editor (`/editor`) lets a customer upload a 3D model, preview
it interactively, configure print settings (generic or advanced), see a live
instant quote, and submit a custom print request. It is built on
`@react-three/fiber`/`drei` with `leva` control panels and a Zustand store
(`utils/store.js`).

## Requirements

### Requirement: Model upload and parsing
The system SHALL accept 3D model uploads in GLB, GLTF, OBJ, STL, and 3MF formats
(including zipped GLTF bundles with external dependencies) via drag-and-drop, and
SHALL parse them into a `THREE.Scene` in the Zustand store, ensuring every mesh
has a stable name.

#### Scenario: Uploading an STL file
- GIVEN the editor with no model loaded (FileDrop shown)
- WHEN the customer drops a valid `.stl` file
- THEN the store parses it via `STLLoader` into a named mesh in a `THREE.Scene`
- AND the editor switches from FileDrop to the Result view

#### Scenario: Unsupported format
- GIVEN the editor
- WHEN the customer drops a file whose extension is not GLB/GLTF/OBJ/STL/3MF
- THEN parsing rejects with an "Unsupported file format" error and no scene is set

### Requirement: Interactive preview
The system SHALL render the loaded scene with orbit controls, configurable
lighting/environment presets, optional auto-rotate, wireframe toggle, and
material appearance (plastic/resin/metal/sandstone), and SHALL allow per-mesh
color selection.

#### Scenario: Recoloring a mesh
- GIVEN a loaded multi-mesh model
- WHEN the customer picks a color for a named mesh
- THEN that mesh's material color updates live in the viewer

### Requirement: Geometry metrics on load
The system SHALL, after a model is parsed into the scene, compute and store its
geometry metrics (volume cm³, bounding-box dimensions cm, watertight flag,
confidence) in the editor store for use by the quoting engine.

#### Scenario: Metrics available after upload
- GIVEN the editor with a freshly loaded model
- WHEN parsing completes
- THEN `geometryMetrics` is populated with volume and bounding-box dimensions

### Requirement: Print settings (printability) controls
The system SHALL offer two configuration modes: a **generic** mode (default) with
plain-language Strength, Quality, and Colour choices (see the
`generic-print-presets` capability), and an **advanced** mode exposing the full
leva print settings — layer height, initial layer height, wall loops, infill
density and pattern, nozzle diameter, support enable/type, and print plate. The
customer SHALL be able to switch between modes; selecting generic choices SHALL
populate the same underlying `printSettings` used by advanced mode.

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

### Requirement: Live instant-quote panel
The system SHALL display an instant-quote panel in the editor showing the
itemized breakdown (material, print time, base/post-processing/special-request/
priority/delivery fees), an expedite toggle, the total, and a low-confidence
warning when geometry is non-watertight; the panel SHALL update as print settings
and options change, and the displayed price SHALL be the server-authoritative
quote. The panel SHALL make the following explicit so a correct quote is not
mistaken for a broken one:

- When the engine floored the total to the minimum price
  (`quote.minimumApplied`), the panel SHALL show a note that the minimum order
  price was applied, including the floor amount.
- The print-time line SHALL display the estimated print hours
  (`quote.inputs.printHours`) and SHALL label print time as an estimate of
  machine time.
- The geometry summary SHALL distinguish the solid mesh **volume** from the
  bounding-**box** dimensions so they are not conflated.

#### Scenario: Quote updates with settings
- GIVEN a loaded model with the quote panel shown
- WHEN the customer increases infill density
- THEN the material line and total update to reflect the higher material usage

#### Scenario: Expedite toggle reflected
- GIVEN a loaded model with a computed quote
- WHEN the customer enables the expedite option
- THEN an expedite line appears and the total increases accordingly

#### Scenario: Low-confidence warning
- GIVEN a non-watertight model
- WHEN the quote is shown
- THEN the panel displays a notice that the estimate is approximate

#### Scenario: Minimum price is surfaced
- GIVEN a configuration whose computed subtotal is below the minimum price
- WHEN the panel renders the returned quote with `minimumApplied: true`
- THEN the panel shows a "minimum order price applied" note with the floor amount
- AND the total equals the minimum price

#### Scenario: Print time shows hours
- GIVEN a quote whose `inputs.printHours` is 2.3
- WHEN the panel renders the print-time line
- THEN the estimated hours (≈2.3 h) are shown alongside the print-time price

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

### Requirement: Lighting preset takes effect
When the user changes the lighting preset (rembrandt/portrait/upfront/soft), the
viewer's light rig SHALL rebuild so the change is visible.

#### Scenario: Switching presets changes lighting
- GIVEN a model is loaded with the default lighting preset
- WHEN the user selects a different lighting preset
- THEN the scene's lighting visibly changes to match the selected preset

### Requirement: Reset configuration to defaults
The system SHALL provide a reset-to-defaults control that is discoverable in both
generic and advanced editor modes, restoring all print/visual/lighting settings
(and mesh colours) and the generic selection to their defaults. Defaults SHALL be
sourced from a single set of default constants.

#### Scenario: Reset all from generic mode
- GIVEN the editor in generic mode with customised settings
- WHEN the customer activates "Reset to defaults"
- THEN all settings, mesh colours, and the generic selection return to defaults

### Requirement: Submit configuration
The system SHALL let the customer save/submit the print configuration, persisting
it to the associated `CustomPrintRequest`, and upon success SHALL navigate the
customer back to the context from which the editor was launched (custom print →
cart, direct order → account) using client-side routing with an explicit success
confirmation — not a fixed-delay full-page redirect. For custom prints, the
editor SHALL also request a server-authoritative quote (auto-quoting the request)
so the customer can pay; a quoting failure SHALL NOT block the configuration save.

#### Scenario: Return to origin after saving (cart flow)
- GIVEN the editor was launched from the cart for a custom print
- WHEN the customer saves the configuration successfully
- THEN the configuration is persisted and the request is auto-quoted to `quoted`
- AND the customer is routed back to the cart showing that request updated and payable

#### Scenario: Return to origin after saving (direct print order)
- GIVEN the editor was launched from a direct print order page
- WHEN the customer saves the configuration successfully
- THEN the customer is routed back to the account/order page with a success confirmation
