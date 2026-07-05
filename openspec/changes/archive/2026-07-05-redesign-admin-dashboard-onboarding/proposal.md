# Proposal: Admin Dashboard Reorganisation + First-Run Onboarding

> Status: **approved 2026-06-12, design ready — see `design.md`.** Client
> insight: recurring need for admin-supplied expectations/hardware/customisation
> (machine limits, time model, pricing, colours, delivery, base price) shows the
> dashboard needs (a) a coherent information architecture and (b) a first-run
> onboarding wizard that collects everything operations depends on, editable
> later.

## Why

The admin page is 11 flat tabs in one row (`content, payments, events,
categories, delivery, orders, blog, customPrint, customPrintRequests, quoting,
reviews`) with no grouping, no landing overview, and no guidance about what
must be configured before the storefront quotes/charges correctly. Operational
readiness currently depends on the admin discovering: quoting rates, time
model, machine limits, colour catalogue, delivery types, and the custom-print
base product — scattered across three tabs. A wrong/missing value silently
produces wrong prices (e.g. delivery fees were 0 until 2026-06-12 because
nothing prompted tier setup).

## What Changes (high level — detail in design.md)

1. **Grouped navigation** (sidebar, not a tab row): Operations / Catalogue /
   Storefront / Settings.
2. **Overview landing page** with a **setup checklist** (derived live from
   AppSettings + the custom-print product): each unmet item links to the
   section that fixes it.
3. **First-run onboarding wizard** (auto-shown while required steps are
   incomplete; skippable; rerunnable from Settings): 5 short steps reusing the
   same section components — Business basics → Pricing → Machines → Colours →
   Delivery.
4. All values remain editable in their sections afterwards (the wizard is a
   guided front-end over the same APIs; no new persistence model).

## Impact

- **Specs:** new `admin-dashboard` capability (navigation, checklist,
  onboarding completeness rules).
- **Code:** `app/admin/page.jsx` (shell), new `components/Admin/Overview.jsx` +
  `OnboardingWizard.jsx`, a pure `lib/admin/setupChecklist.js` (testable
  completeness rules); existing management components are *reused as-is*
  inside the new shell — no rewrite of the 12 panels.
- **Risk:** low-medium; purely additive shell + wizard around stable panels.
  The pure checklist logic carries the correctness burden and is unit-tested.
