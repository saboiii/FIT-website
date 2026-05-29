# Proposal: Replace In-Memory Print-Config Store (bug)

> Status: **investigated 2026-05-29 — the endpoint is unused (dead code).**
> Re-scoped from "persist to DB" to "remove" (pending confirmation of no external
> callers). Folded into `retire-deprecated-printorder-model`.

## Investigation (2026-05-29)

`GET/POST/DELETE /api/print-config` (the module-level `Map` route) has **zero
callers** anywhere in `app/`, `components/`, `utils/`, `lib/`, `scripts/`. Every
"print-config" reference in the app points at the unrelated
`/api/product/custom-print-config` endpoint or the admin config `.txt` download
filename — not this route. The sibling `/api/print-config/[orderId]` reads from
the **deprecated `PrintOrder` model** (see `retire-deprecated-printorder-model`).

So this is not a live reliability bug — it is dead code. Building DB persistence
for it would be motion without value. The correct fix is **removal**, not
migration.

### Remaining actionable (FLAGGED — needs human confirmation)

Confirm no **external** consumer hits `/api/print-config` (e.g. a mobile app or
third-party integration not visible in this repo). Once confirmed, delete both
`app/api/print-config/route.js` and `app/api/print-config/[orderId]/route.js` as
part of `retire-deprecated-printorder-model`. Until confirmed, leave as-is (it's
inert — the in-memory store simply never persists, and nothing reads it).

## Why (original, superseded)

`app/api/print-config/route.js` (and `[orderId]`) appears to keep print
configuration in **module-level in-memory state**. On a serverless/Vercel
deployment (this app targets Vercel — see `vercel.json`), each request may hit a
different, cold, or recycled instance, so in-memory data is not shared and is
lost between requests. This makes config retrieval unreliable in production and
can drop a customer's print settings.

## What Changes

- Persist print-config through the existing MongoDB layer (e.g. on
  `CustomPrintRequest.printConfiguration`, which already exists) instead of
  in-memory state.
- Remove the in-memory map; route reads/writes go through Mongoose.
- Add an integration test (mocked DB) proving config survives across requests.

## Impact

- **Specs:** modifies `custom-print-requests`.
- **Code:** `app/api/print-config/route.js`, `app/api/print-config/[orderId]/route.js`.
- **Risk:** low — aligns with how `CustomPrintRequest` already stores
  configuration; verify no other caller depends on the in-memory behaviour.
