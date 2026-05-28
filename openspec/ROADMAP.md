# Change Roadmap & Sequencing

> Recommended implementation order for the changes in `openspec/changes/`.
> Sequenced by dependency and risk, GOOS-style: build a working spine first, then
> layer features, then polish. Implement one change at a time, test-first; archive
> each into `openspec/specs/` when done (see `AGENTS.md`).

## Dependency graph (high level)

```
fix-dimension-unit-mismatch ─┐
add-test-framework ──────────┼─▶ add-instant-quoting-engine ─┬─▶ add-generic-print-presets ─┐
                             │                               │                               ├─▶ improve-custom-print-post-config-ux
                             │                               ├─▶ add-quote-persistence-and-sharing
                             │                               └─▶ add-slicer-accurate-estimation
                             │
independent ────────────────┴─ enhance-admin-request-config-view, fix-model-download-filename,
                                add-editor-reset-controls, fix-print-config-in-memory-store,
                                add-otp-contact-verification, retire-deprecated-printorder-model
```

## Phase 1 — Foundations (do first)

1. **add-test-framework** — harness + baseline suite. *(✅ archived 2026-05-28 →
   `changes/archive/`; `testing` spec in `openspec/specs/`)*
2. **fix-dimension-unit-mismatch** — investigated: **no active bug**; pinned by a
   unit-contract test; admin-validation follow-up split to
   `add-input-validation-admin-endpoints`. *(✅ archived 2026-05-28)*
3. **add-instant-quoting-engine** — the core: geometry→volume→weight, print-time
   estimate, the seven cost factors, expedite, minimum price, server-authoritative
   pricing. *(implemented; deferred: admin UI, submit-persist, browser verify)*

Follow-up backlog: **add-test-coverage-ci** (coverage thresholds + CI gating,
spun out of add-test-framework).

## Phase 2 — Quote-driven customer experience (depends on Phase 1)

4. **add-generic-print-presets** — Strength × Quality × Colour generic mode →
   maps to print settings → instant quote → pay first. Depends on (3).
5. **improve-custom-print-post-config-ux** — return-to-origin navigation + clear
   status copy ("awaiting quote" not "incomplete"). Depends on (3)/(4) because the
   auto-quote/pay-first path changes the post-config routing and banner logic.
6. **add-quote-persistence-and-sharing** — save/share quotes. Depends on (3).

## Phase 3 — Operator tooling & fixes (largely independent; parallelizable)

7. **enhance-admin-request-config-view** — expandable print-config panel for the
   print farm. Richer once (3) exists (show dimensions/quote), but can start anytime.
8. **fix-model-download-filename** — downloads keep original filename + extension.
9. **add-editor-reset-controls** — discoverable + per-field reset. Best built
   alongside (4) since both touch the editor config surface.
10. **fix-print-config-in-memory-store** — replace the serverless-unsafe in-memory
    print-config store with DB persistence.

## Phase 4 — Refinements & tech debt (later)

11. **add-slicer-accurate-estimation** — cura-wasm slicer behind the engine's
    time/material interface. Depends on (3); accuracy upgrade, not blocking.
12. **add-otp-contact-verification** — OTP-verified contact channel at checkout.
    Independent.
13. **retire-deprecated-printorder-model** — remove the deprecated `PrintOrder`
    model and stray `*.bak` files after a data audit. Independent.

## Notes

- **Client-note traceability:** note 1 + note 5 → (5); note 2.1 → (7);
  note 2.2 → (8); note 3 → (4); note 4 → (9). The instant quoting engine (3) is
  the backbone the generic-quote/pay-first experience builds on.
- Group (4) + (9) in one editor work-stream to avoid touching
  `components/Editor/result.jsx` twice.
- Keep all pricing/mapping logic in pure, unit-tested modules under `lib/quoting/`
  (per `project.md`).
