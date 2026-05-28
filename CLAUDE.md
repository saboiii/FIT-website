# CLAUDE.md — Project & Implementation Playbook

Guidance for AI agents (and humans) working in this repo. Read this first, then
`openspec/project.md`, `openspec/AGENTS.md`, and `openspec/ROADMAP.md`.

## What this is

A custom 3D-printing-services storefront (Next.js 16 App Router, React 19,
Three.js editor, Clerk auth, Stripe, MongoDB/Mongoose, AWS S3, Stream Chat,
Tailwind v4). The active initiative is the **Instant Quoting Engine** and the
follow-on changes sequenced in `openspec/ROADMAP.md`.

## Non-negotiable workflow (OpenSpec + GOOS)

Follow this for every feature. It is how the quoting engine was built and how all
roadmap work must continue.

1. **Spec before code.** Every change starts in `openspec/changes/<id>/`
   (`proposal.md`, `tasks.md`, spec deltas, `design.md` if non-trivial). Never
   edit `openspec/specs/` directly during a change — fold deltas in on archive.
2. **Test-first, outside-in (GOOS).** Write a failing test that expresses an
   observable behaviour, then implement until green. Each `#### Scenario:` in a
   spec maps to ≥1 test. Walking skeleton (thinnest end-to-end slice) before
   breadth.
3. **Pure, dependency-free business logic.** Pricing/estimation/mapping live in
   `lib/quoting/*` as pure functions (numbers in, objects out) — no three.js, DB,
   network, or React. Side-effecty edges (three.js scene, Mongoose, Clerk) are
   thin adapters around the pure core. This is why the engine is unit-testable
   without WebGL/DB.
4. **Server-authoritative money.** Never trust a client-sent price. Recompute on
   the server from `AppSettings` config. API input schemas are zod `.strict()`
   (reject unknown/price/rate fields), with bounded `.finite()` numbers and a
   Content-Length guard. Clerk `auth()` optional for previews, required to persist.
5. **Verify what you can; flag what you can't.** Run `yarn test:run` (must be
   green) and lint changed files. If a step needs human input or infrastructure
   (Redis, payment secrets, range thresholds, browser-only verification), DO NOT
   guess — implement up to the seam, leave a code comment at the exact point, and
   create/extend an `openspec/changes/<id>/` backlog proposal describing the
   blocker and owner. We revisit these; never silently drop them.
6. **Honesty over motion.** If an investigation contradicts the plan (e.g. a
   "bug" turns out not to exist), re-scope the change and record the finding;
   don't perform a risky refactor for its own sake.
7. **Commit per change** with a descriptive message; push to the feature branch
   (`feat/instant-quoting-engine`). Never touch `main`. Exclude local `.claude/`
   from commits.

## Delegation

Use subagents in parallel for breadth (codebase audits, web best-practice/
security research) to keep main-context usage low — but never delegate synthesis
or final code decisions. Research packages before adopting them (correct API,
security posture); cite/record findings in the change's `design.md`.

## Repo conventions

- **Path alias** `@/*` → repo root (`jsconfig.json`, mirrored in
  `vitest.config.mjs`).
- **Tests**: Vitest + RTL, `tests/**/*.test.{js,jsx}`. `yarn test` (watch),
  `yarn test:run` (CI). Mock at boundaries (Clerk/Mongoose/Stripe/S3/fetch).
- **Units**: weight persisted in **kg**, dimensions in **cm**; delivery pricing
  tiers/factors are in **grams** — convert kg→g (×1000) at every gram-denominated
  boundary. The invariant is pinned by `tests/unit/unitContract.test.js`.
- **Money**: numbers in major units (SGD default `sgd`); round to 2 decimals.
- **Design system** (match for any UI): light theme, Inter font; CSS vars
  `--background #fefefe`, `--textColor #111111`, `--light #67696b`,
  `--borderColor #e6e6e6`, `--baseColor #fcfcfc`. Surfaces
  `border border-borderColor rounded-md`; buttons `rounded-full`; featured CTA
  gradient `from-amber-300 to-red-400`. Minimal, thin borders, no glassmorphism.
- **API routes**: `app/api/**/route.js`, `runtime = 'nodejs'`,
  `dynamic = 'force-dynamic'` for POST; `await auth()` → `connectToDatabase()` →
  validate → `NextResponse.json`.

## Instant Quoting Engine architecture (already built — extend, don't rewrite)

Pipeline (all pure except the adapter):
`threeGeometryAdapter` (scene → world-space positions) → `geometryVolume`
(signed-tetrahedron volume, watertight check, mm/m/cm→cm, bbox fallback +
confidence) → `materialEstimate` (volume×fill×density → grams) →
`printTimeEstimate` (heuristic hours, **slicer-swappable interface**) →
`quote.calculateInstantQuote` (7 factors: material, print time, base,
post-processing, special request, priority, delivery; + expedite
percent/flat/greater; + minimum price) → itemized breakdown.

- Config: `AppSettings.quotingConfig` (+ `materialDensities`). Defaults in
  `lib/quoting/pricingDefaults.js`.
- API: `POST /api/quote` via `lib/quoting/quoteRequest.buildQuote` (validation +
  server pricing). Persists onto `CustomPrintRequest.quote/quotedAt` and
  auto-sets status `quoted` when an owner passes a `requestId`.
- Editor: `utils/store.js` computes `geometryMetrics` on load;
  `components/Editor/QuotePanel.jsx` shows the live, server-authoritative quote.
- Print time is labelled an estimate; non-watertight meshes show a low-confidence
  warning.

## Open seams / flagged backlog (do not forget)

- `add-quote-api-rate-limiting` — needs Upstash Redis infra.
- `add-server-side-geometry-verification` — recompute volume from the stored
  model to stop metric tampering before payment.
- `add-input-validation-admin-endpoints` — range thresholds need the print farm's
  real limits.
- Admin UI for `quotingConfig`; editor-submit auto-quote wiring (Phase 2);
  interactive `/editor` browser verification (needs `yarn dev` + env).

## Commands

- `yarn dev` (Turbopack) · `yarn build` · `yarn test:run` · `yarn lint`
