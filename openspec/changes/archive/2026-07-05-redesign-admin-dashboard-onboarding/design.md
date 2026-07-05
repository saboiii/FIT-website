# Design: Admin Dashboard Reorganisation + Onboarding

## Information architecture (from 11 flat tabs → 4 groups + overview)

Sidebar (desktop) / collapsible drawer (mobile), light theme per the design
system (thin `#e6e6e6` hairlines, `rounded-md` surfaces, no glassmorphism):

```
◉ Overview                      ← new landing (checklist + at-a-glance numbers)

OPERATIONS                      ← daily work
  Print Requests                ← CustomPrintRequests
  Orders & Statuses             ← OrderStatusManagement
  Payments                      ← CreatorPayments
  Reviews                       ← ReviewManagement

CATALOGUE                       ← what is sold
  Custom Print Product          ← CustomPrintProductManagement
  Categories                    ← CategoryManagement
  Events                        ← EventManagement

STOREFRONT                      ← what customers read
  Site Content                  ← ContentManagement + DynamicContentManagement
  Blog                          ← BlogManagement

SETTINGS                        ← how the business runs
  Quoting & Pricing             ← QuotingPricingManagement (rates, time model,
                                   machine limits, colours)
  Delivery                      ← DeliveryTypeManagement
  Setup wizard (re-run)         ← OnboardingWizard entry point
```

Rationale: tabs are grouped by *frequency and mindset* — daily operations
first, occasional configuration last; the two custom-print tabs stop being
ambiguous siblings ("customPrint" vs "customPrintRequests").

## Overview page

- **Setup checklist** (the heart of the page until complete):
  each row = label, status (✓ / ⚠ missing), one-line consequence, link.
  Derived by pure `lib/admin/setupChecklist.js` from a single GET
  (`/api/admin/quoting` + custom-print product + delivery types):
  1. Pricing rates set (materialRatePerGram, printTimeRatePerHour > 0)
  2. Print-time model tuned (any timeModel override present — else "using
     generic defaults; quotes may not match your machines")
  3. Machine limits entered (else "oversized models won't be caught")
  4. Colour catalogue curated (≥1 colour)
  5. Delivery types for prints (≥1 active 'print' type with tiers/formula)
  6. Custom-print base product configured (basePrice + dimensions)
  7. Admin notification email set (ADMIN_EMAIL/GMAIL_USER present — read-only
     env hint)
- **At-a-glance**: open print requests by status, unquoted manual requests,
  paid-not-yet-printed count. (Counts only — links into Operations.)

## Onboarding wizard

- Trigger: `/admin` loads → if required checklist items (1, 5, 6) incomplete
  and `localStorage.adminOnboardingDismissed` unset → full-screen modal wizard.
- 5 steps, each a thin wrapper around the *same form sections* used in
  Settings (no duplicated form logic — the wizard renders the existing
  components in "wizard mode" via props, or extracts shared section components
  where needed):
  1. **Welcome / basics** — store name + admin email check (read-only env
     facts, explains what the wizard sets up).
  2. **Pricing** — material rate, hourly rate, base fee, minimum price
     (the "what do you charge" questions).
  3. **Your machines** — the five print-time questions + machine limits
     (the "what hardware do you run" questions).
  4. **Colours & materials** — curate the catalogue from the defaults.
  5. **Delivery** — at least one delivery option for prints (tier or formula),
     review + finish → saves via the existing PUT endpoints, marks checklist.
- Every step is skippable ("Set up later"); progress persists because the
  values themselves persist — re-opening the wizard pre-fills from AppSettings.
  No separate onboarding state document; *the config is the state*.

## Implementation order (test-first)

1. `lib/admin/setupChecklist.js` + unit tests (rules above; pure data-in).
2. Sidebar shell + Overview page (reuse panels unchanged behind new nav;
   keep `?tab=` deep links working via a redirect map).
3. Wizard shell (step state machine, pure `nextStep/canFinish` helpers +
   tests) wrapping existing sections.
4. RTL smoke: checklist renders ✓/⚠ from fixture configs; wizard advances and
   calls the save endpoints (fetch mocked).
5. Browser QA pass (add to `verify-quoting-flows-browser`).

## Out of scope

- Rewriting any management panel's internals.
- Role/permission tiers beyond the existing admin flag.
- Analytics dashboards (the at-a-glance counts reuse existing list endpoints).
