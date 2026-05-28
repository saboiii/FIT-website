# Proposal: Replace In-Memory Print-Config Store (bug)

> Status: backlog (bug / reliability). Discovered while mapping API routes.

## Why

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
