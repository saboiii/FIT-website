# Tasks: Escape JSON-LD Script Blocks

- [x] 1.1 Failing unit test: `jsonLdString` escapes `<` (incl. `</script>`)
      and round-trips via JSON.parse.
- [x] 1.2 Implement `lib/jsonLd.js`.
- [x] 1.3 Replace `JSON.stringify` in the six `dangerouslySetInnerHTML`
      JSON-LD call sites.
- [x] 1.4 `yarn test:run` green; lint changed files.
