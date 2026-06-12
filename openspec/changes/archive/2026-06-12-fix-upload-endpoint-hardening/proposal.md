# Proposal: Harden Upload Endpoints (security)

> Status: **COMPLETE 2026-06-12** (archived). Found during a full-codebase security scan.

## Why

1. **Arbitrary S3 deletion:** `POST /api/upload/cleanup` deletes any list of S3
   keys for *any authenticated user* — no ownership check, no prefix
   restriction. A regular customer could delete other users' models, product
   images, any object in the bucket. Its only caller is the admin
   ProductForm's failure-cleanup path (`utils/formHelpers/productFormHelpers.js`),
   so it should be admin-gated like every other admin capability.
2. **Unsanitized S3 key parts:** `POST /api/upload/models` and
   `POST /api/upload/viewable` embed the raw client `filename` into the
   presigned S3 key (`models/<ts>-<rand>-<filename>`). Slashes, `..`, control
   characters, and unbounded length end up in object keys — no traversal risk
   in S3's flat namespace, but it pollutes key space, can confuse
   prefix-scoped tooling/the proxy route, and allows absurd keys.

## What Changes

- `/api/upload/cleanup` requires `checkAdminPrivileges` (403 otherwise) and
  only accepts string keys.
- New pure `lib/uploadKey.js` — `sanitizeKeyPart(filename)`: basename only
  (strip `/`/`\` path segments), drop control/unsafe characters, collapse
  dots, cap length, preserve the extension; tested.
- Models + viewable presign routes pass `filename` through it.

## Impact

- **Specs:** none (no behavioural requirement for legit flows changes; admin
  cleanup keeps working).
- **Code:** the three routes above, `lib/uploadKey.js`, unit tests.
- **Risk:** low — the admin ProductForm runs with admin sessions; customer
  flows never call cleanup. Sanitized filenames keep their extension, which is
  all `supportsServerRecompute`/download naming depend on.
