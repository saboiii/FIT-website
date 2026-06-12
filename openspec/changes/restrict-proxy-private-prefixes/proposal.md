# Proposal: Restrict the S3 Proxy for Private Prefixes (backlog — needs product decision)

> Status: backlog — **BLOCKED on a product decision** (which S3 prefixes are
> public vs private). Logged 2026-06-12 during a full-codebase security scan; no
> code change yet.

## Why

`GET /api/proxy?key=<s3key>` streams any object in the bucket to **anonymous**
callers (auth is only required when `download=1` is passed, which merely toggles
the Content-Disposition header). Path traversal and URL keys are rejected, and
S3 keys are flat + high-entropy (`models/<ts>-<rand>-<name>`), so this is not
trivially enumerable — but any leaked/shared key URL exposes the object to
anyone, including customers' uploaded model files (their IP/designs) under
`models/`, while the same route legitimately serves public product/blog images.

## What Changes (once prefixes are decided)

- Classify prefixes: e.g. `images/`, `viewables/` → public; `models/` →
  owner-or-admin only (ownership via `CustomPrintRequest.modelFile.s3Key` /
  product asset records).
- Enforce in `/api/proxy` GET + HEAD; admin download paths keep working (admin
  check), customers can still fetch their own models.
- Consider short-lived presigned GET URLs for private objects instead of
  proxying.

## Impact / Blocker

- **Decision owner:** client/product — confirm which prefixes are public and
  whether any existing public page hotlinks `models/` objects (changing that
  breaks those pages).
- **Code:** `app/api/proxy/route.js`, possibly an ownership lookup helper.
- **Risk if not done:** uploaded model files are effectively
  public-by-obscurity; acceptable short-term, not long-term for paying
  customers' proprietary designs.
