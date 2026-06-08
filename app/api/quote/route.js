import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { connectToDatabase } from '@/lib/db'
import AppSettings from '@/models/AppSettings'
import CustomPrintRequest from '@/models/CustomPrintRequest'
import { buildQuote } from '@/lib/quoting/quoteRequest'
import { getAppSettingsId } from '@/lib/appSettingsId'
import { recomputeMetricsFromModel } from '@/lib/quoting/serverGeometry'
import { geometryDeviation } from '@/lib/quoting/geometryDeviation'
import { resolveCustomPrintDeliveryDefaults } from '@/lib/customPrintDelivery'
import { s3 } from '@/lib/s3'
import { GetObjectCommand } from '@aws-sdk/client-s3'

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
  const settings = await AppSettings.findById(getAppSettingsId()).lean()
  const pricingConfig = settings?.quotingConfig || {}
  const deliveryTypes = settings?.additionalDeliveryTypes || []

  const result = buildQuote(body, { pricingConfig, deliveryTypes })
  if (!result.ok) {
    return NextResponse.json({ error: result.error, issues: result.issues }, { status: result.status })
  }

  const { quote, requestId } = result.data
  let responseQuote = quote

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

    // Anti-tamper: for the PERSISTED quote, recompute geometry server-side from
    // the stored model (STL only for now) instead of trusting client metrics.
    // Best-effort — any failure falls back to the client-derived quote so the
    // save never breaks. The live preview still uses client metrics.
    let persistQuote = quote
    try {
      const mf = reqDoc.modelFile || {}
      const name = mf.originalName || mf.s3Key || ''
      if (mf.s3Key && /\.stl$/i.test(name)) {
        const obj = await s3.send(
          new GetObjectCommand({ Bucket: process.env.NEXT_PUBLIC_S3_BUCKET_NAME, Key: mf.s3Key }),
        )
        const bytes = await obj.Body.transformToByteArray()
        const serverMetrics = recomputeMetricsFromModel(bytes, name)
        if (serverMetrics?.volumeCm3 > 0) {
          // Deviation logging: if the client's volume disagrees with the
          // server's recompute by more than the tolerance, flag it. The server
          // value still wins (we trust the recompute), but the log lets ops
          // notice tampering attempts or a real parse-divergence bug.
          const dev = geometryDeviation(
            { volumeCm3: body?.volumeCm3 },
            { volumeCm3: serverMetrics.volumeCm3 },
          )
          if (dev.suspicious) {
            console.error(
              `[quote] geometry deviation ${dev.volumePctDelta.toFixed(1)}% > ` +
                `${dev.tolerancePct}% for requestId=${requestId} ` +
                `(client=${body?.volumeCm3} cm³, server=${serverMetrics.volumeCm3} cm³)`,
            )
          }

          const serverResult = buildQuote(
            {
              ...body,
              volumeCm3: serverMetrics.volumeCm3,
              dimensionsCm: serverMetrics.dimensionsCm,
              confidence: serverMetrics.confidence,
            },
            { pricingConfig, deliveryTypes },
          )
          if (serverResult.ok) persistQuote = serverResult.data.quote
        }
      }
    } catch (verifyErr) {
      console.error('Server geometry verification failed; using client metrics:', verifyErr)
    }

    reqDoc.quote = persistQuote
    responseQuote = persistQuote
    reqDoc.quotedAt = new Date()
    // /api/quote IS the instant path — anything persisted here is an instant
    // quote (the manual/advanced path goes through admin set-quote).
    reqDoc.quoteMode = 'instant'

    // Auto-apply admin-default delivery for custom prints if none are set, so
    // the cart has selectable options instead of "No delivery options".
    const existingDelivery = reqDoc.delivery?.deliveryTypes || []
    if (existingDelivery.length === 0) {
      const defaults = resolveCustomPrintDeliveryDefaults(
        settings?.additionalDeliveryTypes || [],
      )
      if (defaults.length > 0) {
        reqDoc.delivery = { deliveryTypes: defaults }
      }
    }

    // Persist geometry-derived dimensions/weight so delivery pricing tiers work.
    const dims = persistQuote.inputs?.dimensionsCm
    const grams = persistQuote.inputs?.weightGrams
    if (dims && (dims.length > 0 || dims.width > 0 || dims.height > 0)) {
      reqDoc.dimensions = {
        length: dims.length || null,
        width: dims.width || null,
        height: dims.height || null,
        weight: grams != null ? grams / 1000 : null, // grams -> kg (model unit)
      }
    }

    if (['pending_upload', 'pending_config', 'configured'].includes(reqDoc.status)) {
      reqDoc.status = 'quoted'
      reqDoc.statusHistory.push({ status: 'quoted', note: 'Auto-quoted by Instant Quoting Engine' })
    }
    await reqDoc.save()
  }

  return NextResponse.json({ quote: responseQuote }, { status: 200 })
}
