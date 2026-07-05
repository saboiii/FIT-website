<wizard-report>
# PostHog post-wizard report

The wizard has completed a deep integration of PostHog analytics into the Fix
It Today 3D-printing storefront, in two passes.

**Pass 1 (foundation + core events):**

- `next.config.mjs` — PostHog reverse-proxy rewrites (`/ingest/*` → PostHog
  US, including the required `static`/`array` asset routes) and
  `skipTrailingSlashRedirect: true`.
- `components/General/PostHogProvider.jsx` — consent-gated `posthog.init` via
  the proxy (`api_host: '/ingest'`), `capture_exceptions: true`, manual
  `$pageview` on route change, and Clerk-wired `posthog.identify()` /
  `posthog.reset()` on sign-in/sign-out (covers returning visits too).
- `lib/posthog-server.js` — singleton `getPostHogClient()` (`posthog-node`,
  `flushAt: 1 / flushInterval: 0` for serverless delivery).
- `.env.local` — all four PostHog vars set; live project `496472` created.

**Pass 2 (blog + remaining site, this run):**

- 15 new events across the blog/newsletter funnel, the editor→quote→cart→
  checkout funnel, reviews, and subscription churn (table below).
- Server-side `captureException` at the two money-path boundaries: the Stripe
  webhook catch (`app/api/webhook/stripe/route.js`) and both checkout-session
  catches (`app/api/checkout/session/route.js`).
- Repaired two pass-1 defects: `posthog-node` was in `node_modules` but
  missing from `package.json`/`yarn.lock` (now properly installed — this
  out-of-band install was also the root cause of the `property-information`
  "Export html doesn't exist" build error; fixed together with a `.next`
  cache clear), and the PostHog env var names are now documented in
  `.env.example`.

## All instrumented events

| Event name | Description | File |
|---|---|---|
| `sign_in_completed` | User signs in via email or Google OAuth. | `components/AuthComponents/SignInForm.jsx` |
| `sign_up_tier_selected` | User selects a subscription tier during sign-up. | `components/AuthComponents/SignUpForm.jsx` |
| `sign_up_completed` | User submits the final sign-up form. | `components/AuthComponents/SignUpForm.jsx` |
| `onboarding_completed` | New user completes onboarding. | `app/onboarding/Onboarding.jsx` |
| `checkout_payment_submitted` | User submits payment during checkout. | `app/checkout/CheckOut.jsx` |
| `purchase_completed` | Return page confirms completed payment. | `app/checkout/return/Return.jsx` |
| `instant_quote_received` | Live instant quote returned in the editor. | `components/Editor/QuotePanel.jsx` |
| `order_created` | Order created server-side on Stripe webhook. | `app/api/webhook/stripe/route.js` |
| `user_registered` | Account created via the Clerk webhook. | `app/api/newUser/route.js` |
| `blog_post_viewed` | Visitor opened a blog post (content funnel top). | `app/blog/[blogSlug]/BlogPageClient.jsx` |
| `blog_cta_clicked` | Reader clicked the post's call-to-action. | `app/blog/[blogSlug]/BlogPageClient.jsx` |
| `newsletter_subscribed` | Visitor subscribed via the blog footer form. | `components/General/SubscribeForm.jsx` |
| `newsletter_unsubscribed` | Subscriber confirmed unsubscribe (churn). | `app/newsletter/unsubscribe/[token]/page.jsx` |
| `newsletter_preferences_saved` | Subscriber updated topics / re-subscribed. | `app/newsletter/preferences/[token]/page.jsx` |
| `blog_post_published` | Admin published a post (server). | `app/api/admin/blog/route.js` |
| `newsletter_campaign_sent` | Campaign finished dispatching (server). | `lib/newsletter/dispatch.js` |
| `model_uploaded` | Visitor loaded a 3D model (quote funnel top). | `app/editor/page.jsx` |
| `print_config_saved` | Customer saved a print config (instant/manual). | `components/Editor/result.jsx` |
| `quote_persisted` | Server persisted an authoritative quote. | `app/api/quote/route.js` |
| `quote_rejected_geometry_deviation` | Server rejected a diverged/tampered quote (fraud signal). | `app/api/quote/route.js` |
| `product_added_to_cart` | Product / print job / custom request added to cart. | `app/products/[slug]/ProductPage.jsx`, `components/Editor/result.jsx` |
| `checkout_started` | Shopper left the cart for checkout. | `app/cart/Cart.jsx` |
| `review_submitted` | Buyer submitted a product review. | `components/ProductPage/ReviewForm.jsx` |
| `subscription_cancelled` | Creator cancelled their subscription (churn, server). | `app/api/user/subscription/cancel/route.js` |

## Next steps

We've built a dashboard and five insights based on the pass-1 events:

- **Dashboard**: [Analytics basics (wizard)](https://us.posthog.com/project/496472/dashboard/1798713)
- [Sign-up to Purchase Funnel (wizard)](https://us.posthog.com/project/496472/insights/84TXnf6b)
- [New User Registrations (wizard)](https://us.posthog.com/project/496472/insights/fcwLMOCr)
- [Quote Engine Activity (wizard)](https://us.posthog.com/project/496472/insights/L4KJvWB3)
- [Orders Created (wizard)](https://us.posthog.com/project/496472/insights/DaWKyl63)
- [Key Conversion Events (wizard)](https://us.posthog.com/project/496472/insights/p98zmW52)

Recommended additions for the pass-2 events (no PostHog MCP was connected in
this run, so add these in the PostHog UI — exact event names as above):

1. **Quote funnel**: `model_uploaded` → `instant_quote_received` →
   `print_config_saved` → `checkout_started` → `purchase_completed`
2. **Shop funnel**: `product_added_to_cart` → `checkout_started` →
   `checkout_payment_submitted` → `purchase_completed`
3. **Blog → newsletter conversion**: `blog_post_viewed` →
   `newsletter_subscribed`, with `newsletter_unsubscribed` as churn overlay
4. **Warning trends**: `quote_rejected_geometry_deviation` and
   `subscription_cancelled`

## Verify before merging

- [ ] Run a full production build (`yarn build`) and the test suite
      (`yarn test:run`) on your machine — this run verified both green
      (88 pages, 377 tests) but confirm in your environment.
- [ ] The PostHog env vars are documented in `.env.example` and set in
      `.env.local` — add the same four to Vercel so production captures.
- [ ] Restart any running `yarn dev` session — the `property-information`
      fix requires the fresh install + cleared `.next` from this run.
- [ ] Browse the site with cookie consent accepted and confirm the new events
      appear in PostHog (blog post view, subscribe, model upload, add to
      cart, checkout start).
- [ ] Wire source-map upload (`posthog-cli sourcemap` or a CI step) so
      production stack traces de-minify in PostHog Error Tracking.
- [ ] Add the four funnel/insight recommendations above to the wizard
      dashboard in the PostHog UI.

### Agent skill

We've left an agent skill folder in your project at
`.claude/skills/integration-nextjs-app-router/`. You can use this context for
further agent development when using Claude Code. This will help ensure the
model provides the most up-to-date approaches for integrating PostHog.

</wizard-report>
