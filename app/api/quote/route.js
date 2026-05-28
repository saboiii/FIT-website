import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { connectToDatabase } from '@/lib/db'
import AppSettings from '@/models/AppSettings'
import CustomPrintRequest from '@/models/CustomPrintRequest'
import { buildQuote } from '@/lib/quoting/quoteRequest'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const MAX_BODY_BYTES = 50_000

/**
 * POST /api/quote — Instant Quoting Engine endpoint.
 *
 * Anonymous callers get a price preview. Supplying a `requestId` persists the
 * quote and auto-quotes the request, which requires authentication + ownership.
 *
 * Pricing is recomputed server-side from AppSettings.quotingConfig; the client
 * cannot set the price (the input schema rejects price/rate fields).
 *
 * TODO(infra): request rate limiting is not yet wired — it needs Upstash Redis
 * (no reliable single-instance limiter on Vercel). See openspec change
 * `add-quote-api-rate-limiting`.
 */
export async function POST(req) {
  const contentLength = Number(req.headers.get('content-length') || 0)
  if (contentLength > MAX_BODY_BYTES) {
    return NextResponse.json({ error: 'Payload too large' }, { status: 413 })
  }

  let body
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  await connectToDatabase()
  const settings = await AppSettings.findById('app-settings').lean()
  const pricingConfig = settings?.quotingConfig || {}
  const deliveryTypes = settings?.additionalDeliveryTypes || []

  const result = buildQuote(body, { pricingConfig, deliveryTypes })
  if (!result.ok) {
    return NextResponse.json({ error: result.error, issues: result.issues }, { status: result.status })
  }

  const { quote, requestId } = result.data

  if (requestId) {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Sign in to save a quote' }, { status: 401 })
    }
    const reqDoc = await CustomPrintRequest.findOne({ requestId })
    if (!reqDoc) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 })
    }
    if (reqDoc.userId !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // SECURITY NOTE: geometry metrics are client-computed. Recomputing volume
    // server-side from the stored model (to prevent metric tampering before
    // payment) is a tracked follow-up: openspec change
    // `add-server-side-geometry-verification`.
    reqDoc.quote = quote
    reqDoc.quotedAt = new Date()
    if (['pending_upload', 'pending_config', 'configured'].includes(reqDoc.status)) {
      reqDoc.status = 'quoted'
      reqDoc.statusHistory.push({ status: 'quoted', note: 'Auto-quoted by Instant Quoting Engine' })
    }
    await reqDoc.save()
  }

  return NextResponse.json({ quote }, { status: 200 })
}
