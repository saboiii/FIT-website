# 3D Model Editor (delta for add-instant-quoting-engine)

## ADDED Requirements

### Requirement: Geometry metrics on load
The system SHALL, after a model is parsed into the scene, compute and store its
geometry metrics (volume cm³, bounding-box dimensions cm, manifold flag) in the
editor store for use by the quoting engine.

#### Scenario: Metrics available after upload
- GIVEN the editor with a freshly loaded model
- WHEN parsing completes
- THEN `geometryMetrics` is populated with volume and bounding-box dimensions

### Requirement: Live instant-quote panel
The system SHALL display an instant-quote panel in the editor showing the
itemized breakdown (material, print time, base/post-processing/special-request/
priority/delivery fees), an expedite toggle, the total, and a low-confidence
warning when geometry is non-manifold; the panel SHALL update as print settings
and options change.

#### Scenario: Quote updates with settings
- GIVEN a loaded model with the quote panel shown
- WHEN the customer increases infill density
- THEN the material line and total update to reflect the higher material usage

#### Scenario: Expedite toggle reflected
- GIVEN a loaded model with a computed quote
- WHEN the customer enables the expedite option
- THEN an expedite line appears and the total increases accordingly

#### Scenario: Low-confidence warning
- GIVEN a non-manifold model
- WHEN the quote is shown
- THEN the panel displays a notice that the estimate is approximate
