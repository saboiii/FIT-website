# Tasks: Real Upload Progress for Custom-Print Models

## 1. Tests first
- [x] 1.1 Unit-test `progressPercent(loaded, total)`: 0 for zero/unknown total,
      clamps to 0..100, rounds.

## 2. Helper
- [x] 2.1 Add `progressPercent` (pure) and `putWithProgress` (XHR, reports
      `upload.onprogress`, rejects on non-2xx / error) to `utils/uploadHelpers.js`.

## 3. Wire-up
- [x] 3.1 Use `putWithProgress` for the custom-print S3 PUT, passing
      `setUploadProgress` as the progress callback.

## 4. Verify
- [x] 4.1 `yarn test:run` green.
- [ ] 4.2 Browser: large-file upload shows a moving bar (deferred to client QA).
