# Tasks: Anchor Editor Panels to the Canvas

## 1. Editor layout
- [x] 1.1 Make the editor root a positioning context (`relative`, `w-full`).
- [x] 1.2 Anchor the simple-mode panel + mode toggle with `absolute` (bottom-right).
- [x] 1.3 Anchor the instant-quote panel with `absolute` at **top-left** (clear of
      the bottom-left chat launcher).

## 2. Verify
- [x] 2.1 `yarn test:run` green (QuotePanel render tests unaffected).
- [ ] 2.2 Browser: panels sit over the canvas, none overlap the chat launcher
      (deferred to client manual QA — `verify-quoting-flows-browser`).
