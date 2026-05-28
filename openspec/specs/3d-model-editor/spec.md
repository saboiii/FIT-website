# 3D Model Editor Specification

## Purpose

The in-browser 3D editor (`/editor`) lets a customer upload a 3D model, preview
it interactively, and configure print settings before submitting a custom print
request. It is built on `@react-three/fiber`/`drei` with `leva` control panels
and a Zustand store (`utils/store.js`). This spec documents current behaviour;
the `add-instant-quoting-engine` change adds a live quote panel here.

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

### Requirement: Print settings (printability) controls
The system SHALL expose print settings — layer height, initial layer height,
wall loops, infill density and pattern, nozzle diameter, support enable/type,
and print plate — through both an advanced (leva) panel and a simplified preset
mode (Draft / Standard / High Quality / Strong & Durable) with quick color
swatches.

#### Scenario: Applying a simple-mode preset
- GIVEN the editor in simple mode
- WHEN the customer selects the "High Quality" preset
- THEN the underlying print settings update to that preset's values

### Requirement: Submit configuration
The system SHALL let the customer save/submit the print configuration, persisting
it to the associated `CustomPrintRequest` (when launched from a custom-print
flow, carrying `requestId`/`isCustomPrint` in the store).

#### Scenario: Submitting print configuration
- GIVEN a loaded model and chosen print settings in a custom-print session
- WHEN the customer submits the configuration
- THEN the settings are sent to the custom-print API and the request advances to `configured`
