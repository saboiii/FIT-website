import { NextResponse } from 'next/server'
import { randomUUID } from 'node:crypto'
import { auth } from '@clerk/nextjs/server'
import { connectToDatabase } from '@/lib/db'
import AppSettings from '@/models/AppSettings'
import SavedQuote from '@/models/SavedQuote'
import { buildQuote } from '@/lib/quoting/quoteRequest'
import { getAppSettingsId } from '@/lib/appSettingsId'
import { computeExpiry, DEFAULT_VALIDITY_DAYS } from '@/lib/quoting/savedQuote'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const MAX_BODY_BYTES = 50_000

// POST /api/quote/save — compute a server-authoritative quote and save it.
export async function POST(req) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Sign in to save a quote' }, { status: 401 })

  if (Number(req.headers.get('content-length') || 0) > MAX_BODY_BYTES) {
    return NextResponse.json({ error: 'Payload too large' }, { status: 413 })
  }
  let body
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  await connectToDatabase()
  const settings = await AppSettings.findById(getAppSettingsId()).lean()
  const pricingConfig = settings?.quotingConfig || {}
  const deliveryTypes = settings?.additionalDeliveryTypes || []

  const result = buildQuote(body, { pricingConfig, deliveryTypes })
  if (!result.ok) {
    return NextResponse.json({ error: result.error, issues: result.issues }, { status: result.status })
  }
  const { quote } = result.data

  const quoteId = randomUUID()
  await SavedQuote.create({
    quoteId,
    userId,
    modelRef: body.modelRef && typeof body.modelRef === 'object'
      ? { originalName: body.modelRef.originalName, s3Key: body.modelRef.s3Key }
      : undefined,
    settings: body.settings,
    quote,
    currency: quote.currency,
    total: quote.total,
    validUntil: computeExpiry(Date.now(), DEFAULT_VALIDITY_DAYS),
  })

  return NextResponse.json({ quoteId, quote }, { status: 201 })
}

// GET /api/quote/save — list the signed-in user's saved quotes.
export async function GET() {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await connectToDatabase()
  const quotes = await SavedQuote.find({ userId })
    .sort({ createdAt: -1 })
    .select('quoteId total currency validUntil shareToken createdAt modelRef')
    .lean()

  return NextResponse.json({ quotes }, { status: 200 })
}
