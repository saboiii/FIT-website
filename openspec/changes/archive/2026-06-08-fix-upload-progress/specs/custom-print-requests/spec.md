# Custom Print Requests — delta for fix-upload-progress

## ADDED Requirements

### Requirement: Model upload reports real progress
When a customer uploads a 3D model for a custom-print request, the UI SHALL
report real upload progress (0–100%) derived from the bytes sent to storage,
rather than only 0% before and 100% after.

#### Scenario: Progress reflects bytes sent
- GIVEN a model is uploading to storage
- WHEN 50% of the bytes have been sent
- THEN the progress indicator shows approximately 50%

#### Scenario: Progress is clamped and rounded
- GIVEN a progress event with `loaded`/`total` bytes
- WHEN the percentage is computed
- THEN it is an integer clamped to the range 0–100
- AND an unknown or zero total yields 0
