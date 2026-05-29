# Proposal: Real Upload Progress for Custom-Print Models

> Status: active. From client manual-testing feedback (#1).

## Why

Uploading a large model gives no real feedback — the progress bar jumps 0 → 100.
The custom-print upload sends the file to S3 with `fetch(url, {method:'PUT'})`
([CustomPrintUpload.jsx]), and `fetch` cannot report upload progress, so
`uploadProgress` is only set to 0 before and 100 after.

## What Changes

- Add `putWithProgress(...)` (XMLHttpRequest-based) and a pure
  `progressPercent(loaded, total)` helper to `utils/uploadHelpers.js`.
- Use `putWithProgress` for the custom-print S3 PUT so the bar reflects real
  upload progress via `xhr.upload.onprogress`.

## Impact

- **Specs:** `custom-print-requests` (upload feedback).
- **Code:** `utils/uploadHelpers.js`, `components/Cart/CustomPrintUpload.jsx`.
- **Tests:** unit-test `progressPercent`; the XHR wiring is verified in-browser.
- **Risk:** low — scoped to the custom-print upload; other uploaders unchanged.
