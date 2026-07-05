# Tasks: Remove Saved & Shareable Quotes

## 1. Delete code
- [x] 1.1 Delete `models/SavedQuote.js`.
- [x] 1.2 Delete `lib/quoting/savedQuote.js`.
- [x] 1.3 Delete `tests/unit/savedQuote.test.js`.
- [x] 1.4 Delete `app/api/quote/save/`, `app/api/quote/[quoteId]/share/`, and
      `app/api/quote/shared/[token]/`.

## 2. Tidy OpenSpec
- [x] 2.1 Remove `openspec/changes/add-quote-persistence-and-sharing/`.
- [x] 2.2 Update `openspec/ROADMAP.md` to mark the capability dropped at client
      request.

## 3. Verify
- [x] 3.1 No remaining references (`grep -rln SavedQuote|savedQuote|/api/quote/save|/api/quote/shared`).
- [x] 3.2 `yarn test:run` green.
