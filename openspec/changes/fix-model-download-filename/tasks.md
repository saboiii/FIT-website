# Tasks: Download Models with Original Filename + Extension

## 1. Proxy filename handling (pure-ish, testable)
- [ ] 1.1 Unit test a `resolveDownloadFilename({ requested, s3Key })` helper:
      prefers a sanitised requested name, falls back to S3 key basename,
      guarantees an extension, strips path/header-injection characters
- [ ] 1.2 Implement it; use it in `app/api/proxy/route.js`

## 2. Always set Content-Disposition for downloads
- [ ] 2.1 When `download=1`, always send `Content-Disposition: attachment;
      filename="<resolved>"` using the original filename/extension
- [ ] 2.2 Accept an optional `filename` query param (sanitised)

## 3. Callers
- [ ] 3.1 Admin "Model File" download passes `filename=originalName`
      (`CustomPrintRequests.jsx`)
- [ ] 3.2 Audit any other model-download links; route them through the same path

## 4. Verify
- [ ] 4.1 Manual: download a model → file is named like the uploaded file with
      the correct extension (no "proxy", no missing extension)
- [ ] 4.2 `yarn test:run` green
