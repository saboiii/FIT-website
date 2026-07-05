#!/usr/bin/env node
/**
 * Dashboard screenshot harness for the UI redesign engagement
 * (docs/DASHBOARD-UX-BLUEPRINT.md). Captures the baseline/after shot list
 * from docs/audit/NOTES.md against a running dev server.
 *
 * Usage:
 *   SHOT_EMAIL=you@example.com SHOT_PASSWORD=... \
 *     node scripts/dashboard-screens.mjs --out docs/audit/baseline [--base http://localhost:3000]
 *
 * Requires: `yarn dev` running, a Clerk (pk_test) account with BOTH an active
 * subscription (creator dashboard) and the admin role (admin dashboard).
 * Email+password sign-in must be enabled on the Clerk dev instance.
 */
import { chromium } from '@playwright/test'
import { mkdir } from 'node:fs/promises'

const arg = (name, fallback) => {
  const i = process.argv.indexOf(name)
  return i > -1 ? process.argv[i + 1] : fallback
}
const OUT = arg('--out', 'docs/audit/baseline')
const BASE = arg('--base', 'http://localhost:3000')
const EMAIL = process.env.SHOT_EMAIL
const PASSWORD = process.env.SHOT_PASSWORD
if (!EMAIL || !PASSWORD) {
  console.error('Set SHOT_EMAIL and SHOT_PASSWORD (Clerk dev test account).')
  process.exit(1)
}

const VIEWPORTS = {
  desktop: { width: 1440, height: 900 },
  mobile: { width: 375, height: 812 },
}

// One entry per audit shot. `go` navigates/acts; capture happens after.
// Keep in sync with the shot list in docs/audit/NOTES.md.
const SHOTS = [
  // Creator
  { name: 'creator--home', path: '/dashboard' },
  { name: 'creator--messages', path: '/dashboard/messages' },
  { name: 'creator--products-list', path: '/dashboard/products' },
  { name: 'creator--product-create', path: '/dashboard/products/create', fullPage: true },
  {
    name: 'creator--product-create--validation-errors',
    path: '/dashboard/products/create',
    fullPage: true,
    act: async (page) => {
      const btn = page.getByRole('button', { name: /create product/i }).first()
      if (await btn.count()) await btn.click()
      await page.waitForTimeout(800)
    },
  },
  // Admin panels (tab keys from app/admin/page.jsx PANELS)
  ...[
    'overview', 'customPrintRequests', 'orders', 'payments', 'reviews',
    'customPrint', 'categories', 'events', 'content', 'blog', 'newsletter',
    'quoting', 'printTiming', 'delivery',
  ].map((tab) => ({ name: `admin--${tab}`, path: `/admin?tab=${tab}`, fullPage: true })),
]

async function signIn(page) {
  await page.goto(`${BASE}/sign-in`, { waitUntil: 'networkidle' })
  await page.getByRole('textbox').first().fill(EMAIL)
  // Site's custom form exposes email + password fields together.
  const pw = page.locator('input[type="password"]').first()
  await pw.fill(PASSWORD)
  await page.getByRole('button', { name: /^sign in$/i }).first().click()
  await page.waitForURL(`${BASE}/**`, { timeout: 20000 })
  await page.waitForTimeout(1500)
}

const run = async () => {
  await mkdir(OUT, { recursive: true })
  const browser = await chromium.launch()
  for (const [vpName, viewport] of Object.entries(VIEWPORTS)) {
    const context = await browser.newContext({ viewport, deviceScaleFactor: 2 })
    const page = await context.newPage()
    await signIn(page)
    for (const shot of SHOTS) {
      try {
        await page.goto(`${BASE}${shot.path}`, { waitUntil: 'networkidle' })
        await page.waitForTimeout(1200) // client fetches settle
        if (shot.act) await shot.act(page)
        await page.screenshot({
          path: `${OUT}/${shot.name}--${vpName}.png`,
          fullPage: !!shot.fullPage,
        })
        console.log(`✓ ${shot.name} (${vpName})`)
      } catch (e) {
        console.error(`✗ ${shot.name} (${vpName}): ${e.message}`)
      }
    }
    await context.close()
  }
  await browser.close()
  console.log(`\nDone → ${OUT}`)
}

await run()
