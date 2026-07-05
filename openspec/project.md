# Project Context — FIT Website (3D Printing Services Platform)

> This file is the shared source of truth for humans and AI agents working in
> the `openspec/` workflow. Read it before proposing or implementing a change.

## What this product is

A custom 3D-printing-services storefront and creator marketplace for a startup.
Customers can:

- Browse and buy catalogue products ("shop" and "print" product types).
- Upload their own 3D model, configure print settings in an in-browser
  Three.js editor, and order a **custom print**.
- Track orders, message the team (Stream Chat), and pay via Stripe.

Creators/admins manage products, categories, delivery types, blog/CMS content,
custom-print requests, and pricing through a dashboard + admin panel.

The headline feature this OpenSpec workspace introduces is an **Instant Quoting
Engine**: a customer-facing, real-time price estimate inside the existing 3D
editor, so a customer sees what their print will cost *before* checkout instead
of waiting for an admin to manually quote it.

## Tech stack

| Area            | Choice                                                              |
| --------------- | ------------------------------------------------------------------- |
| Framework       | Next.js 16 (App Router, `app/`), React 19, Turbopack dev            |
| Language        | JavaScript (JSX), `@/*` path alias → repo root (see `jsconfig.json`)|
| Styling         | Tailwind CSS v4 (`@tailwindcss/postcss`), CSS vars in `globals.css` |
| 3D              | three ^0.178, @react-three/fiber, @react-three/drei, leva controls  |
| State           | Zustand (`utils/store.js`), React Context providers                 |
| Auth            | Clerk (`@clerk/nextjs`), `middleware.js` route protection           |
| Database        | MongoDB via Mongoose (`lib/db.js` cached connection)                |
| Payments        | Stripe (custom checkout, webhooks)                                  |
| File storage    | AWS S3 (`lib/s3.js`) for uploaded models + media                    |
| Chat            | Stream Chat (`lib/streamChat.js`)                                   |
| Animation       | framer-motion, lenis smooth scroll, GSAP available                  |
| Content/CMS     | MDX (`content/`) + DB-backed `ContentBlock` model                   |

## Conventions

### Code

- Components: `*.jsx`, PascalCase. Pure helpers: `*.js` in `utils/` or `lib/`.
- API routes: `app/api/**/route.js`, exporting `GET/POST/PUT/DELETE`. Standard
  body: `await auth()` (Clerk) → `await connectToDatabase()` → validate →
  `NextResponse.json(...)`. Errors are caught and returned as
  `{ error }` with an HTTP status.
- Keep pricing/business logic in **pure, dependency-free modules** (e.g.
  `lib/printPricing.js`, `utils/discount.js`, `utils/deliveryPriceCalculator.js`)
  so it is unit-testable without a DB or network. New quoting logic MUST follow
  this rule.
- Money: amounts are numbers in major currency units (e.g. SGD dollars), default
  currency `sgd`. Dimensions: length/width/height in **cm**, weight in **kg** on
  persisted models, but several helpers pass weight in **grams** — always check
  the unit at the boundary (this is a known footgun; see backlog).

### Design system (match this for any new UI)

- Light theme only (dark mode commented out). CSS vars in `app/globals.css`:
  `--background #fefefe`, `--textColor #111111`, `--light #67696b`,
  `--borderColor #e6e6e6`, `--baseColor #fcfcfc`, `--extraLight #c3c3c3`.
- Font: **Inter** via `next/font` (`--font-inter`). Headings
  `font-semibold tracking-tight`; body `font-light text-sm md:text-base`.
- Surfaces: `border border-borderColor`, `rounded-md` (cards/inputs),
  `rounded-full` (buttons). Minimal, low-noise, thin borders. No glassmorphism.
- Featured CTA accent: `bg-gradient-to-br from-amber-300 to-red-400`
  (e.g. the "Print your Model" badge).
- Reuse existing utility classes: `.formInput`, `.formBlackButton`,
  `.formButton`, `.formDrag`, `.collectionItem`, `.tooltip`. Icons: `react-icons`.

### Testing

- Runner: **Vitest** (unit + integration), **React Testing Library** for
  components. Config in `vitest.config.mjs`; tests live in `tests/` as
  `*.test.js`. `@/*` alias is mirrored in the Vitest config.
- Business logic is tested directly (pure functions). API routes and components
  are tested with mocks for Clerk/Mongoose/Stripe/S3.
- Run with `yarn test` (watch) or `yarn test:run` (CI/one-shot).

## OpenSpec workflow (GOOS-aligned)

We follow [OpenSpec](https://github.com/Fission-AI/OpenSpec) for spec-driven
development and [GOOS](http://www.growing-object-oriented-software.com/)
("Growing Object-Oriented Software, Guided by Tests") for how we build:

1. **Spec before code.** A change starts as a proposal in
   `openspec/changes/<change-id>/` — never edit `openspec/specs/` directly.
2. **Outside-in, test-first.** Start from a failing acceptance/integration test
   that expresses a user-visible behaviour, then drive inward with unit tests.
   Each `#### Scenario:` in a spec should map to at least one test.
3. **Walking skeleton first.** Get the thinnest end-to-end slice working
   (upload → volume → price shown) before adding fee factors.
4. **Small, well-named, pure collaborators.** Keep pricing math pure and
   injected; mock at the system boundary (DB, Stripe, S3, network).
5. **Listen to the tests.** Hard-to-test code is a design signal — refactor
   toward smaller, decoupled units.
6. On completion, the change's spec deltas are folded into `openspec/specs/`
   and the change folder is moved to `openspec/changes/archive/`.

See `openspec/AGENTS.md` for the exact authoring format.
