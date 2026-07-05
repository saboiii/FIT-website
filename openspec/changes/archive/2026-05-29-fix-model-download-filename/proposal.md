# Proposal: Download Models with Their Original Filename + Extension (bug)

## Why

Client note 2.2: a downloaded model file is named **"proxy"** with **no
extension**, and adding `.stl` manually fixes it. The operator should get the
actual file the user uploaded, correctly named.

Root cause, from the code:

- `app/api/proxy/route.js` streams the S3 object but sets `Content-Disposition`
  **only** when `?download=1` is present (lines ~55–57), and derives the filename
  from the S3 key basename: `const filename = key.split('/').pop()` (line ~48).
- When `download=1` is omitted (e.g. opening the proxy URL or `s3Url` directly,
  or right-click → Save), no `Content-Disposition` is sent, so the browser names
  the file after the URL path segment — **"proxy"** — with no extension.
- Even with `download=1`, if the S3 key basename has no extension (keys are often
  generated IDs), the served name lacks `.stl`/`.obj`/etc. The admin download
  button (`components/Admin/CustomPrintRequests.jsx` ~56–66) sets
  `a.download = originalName`, but a server `Content-Disposition` can override the
  anchor's `download` attribute, and the customer-facing/other paths don't set it
  at all.

The reliable filename lives in `CustomPrintRequest.modelFile.originalName`
(`models/CustomPrintRequest.js` ~13–20).

## What Changes

- For model downloads, the proxy SHALL always send `Content-Disposition:
  attachment` with a filename that **preserves the user's original filename and
  extension** (from `originalName`), independent of how the download is initiated.
- Allow the caller to pass the desired filename to the proxy (e.g.
  `?key=…&download=1&filename=<originalName>`), validated/sanitised server-side;
  fall back to the S3 key basename, and ensure a sensible extension is present.
- Audit every model-download entry point so none yield "proxy"/extension-less
  files.

## Impact

- **Specs:** adds a `model-file-download` requirement (under `custom-print-requests`).
- **Code:** `app/api/proxy/route.js` (Content-Disposition + filename param +
  sanitisation), `components/Admin/CustomPrintRequests.jsx` (pass `filename`),
  any other download callers.
- **Security note:** the `filename` param MUST be sanitised (strip path
  separators / header-injection chars) before being placed in the header.
- **Risk:** low; additive to existing behaviour.
