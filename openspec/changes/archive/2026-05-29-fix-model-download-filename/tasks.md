# Tasks: Download Models with Original Filename + Extension

> Implemented 2026-05-29.

## 1. Proxy filename handling (pure, testable)
- [x] 1.1 `resolveDownloadFilename({ requested, s3Key })` (lib/download/filename.js)
      + tests: prefers sanitised requested name, falls back to S3 key basename,
      guarantees an extension, strips path/header-injection chars
- [x] 1.2 Used in `app/api/proxy/route.js` (GET + HEAD)

## 2. Always set Content-Disposition for downloads
- [x] 2.1 When `download=1`, send `Content-Disposition: attachment;
      filename="<resolved>"` with a real extension (never "proxy")
- [x] 2.2 Optional `filename` query param (decoded + sanitised)

## 3. Callers
- [x] 3.1 Admin "Model File" download passes `filename=originalName`
      (`CustomPrintRequests.jsx`)
- [x] 3.2 Audited model-download links: the admin button is the only model
      downloader; it now routes through the `filename` param

## 4. Verify
- [x] 4.2 `yarn test:run` green
- [ ] 4.1 **BLOCKED — needs browser/human:** download a model from the admin UI and
      confirm the saved file keeps the original name + extension (no "proxy")
