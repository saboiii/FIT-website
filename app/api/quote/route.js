import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { connectToDatabase } from '@/lib/db'
import AppSettings from '@/models/AppSettings'
import CustomPrintRequest from '@/models/CustomPrintRequest'
import { buildQuote } from '@/lib/quoting/quoteRequest'
import { getAppSettingsId } from '@/lib/appSettingsId'
import { recomputeMetricsFromModel, supportsServerRecompute } from '@/lib/quoting/serverGeometry'
import { geometryDeviation } from '@/lib/quoting/geometryDeviation'
import {
  resolveCustomPrintDeliveryDefaults,
  refreshCustomPrintDeliveryPrices,
} from '@/lib/customPrintDelivery'
import { s3 } from '@/lib/s3'
import { GetObjectCommand } from '@aws-sdk/client-s3'
import { limitQuoteRequest } from '@/lib/rateLimit'
import { checkMachineLimits, machineLimitMessage } from '@/lib/quoting/machineLimits'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const MAX_BODY_BYTES = 50_000
// Skip server geometry recompute for very large stored models (uploads allow up
// to 100MB) — buffering those in a serverless function risks OOM. The persist
// then falls back to client metrics, same as an unparseable file.
const MAX_RECOMPUTE_BYTES = 75 * 1024 * 1024

/**
 * POST /api/quote — Instant Quoting Engine endpoint.
 *
 * Anonymous callers get a price preview. Supplying a `requestId` persists the
 * quote and auto-quotes the request, which requires authentication + ownership.
 *
 * Pricing is recomputed server-side from AppSettings.quotingConfig; the client
 * cannot set the price (the input schema rejects price/rate fields).
 *
 * Rate-limited via Upstash Redis (lib/rateLimit): authed traffic by userId,
 * anonymous by IP with tighter limits. No-ops when Upstash env vars are unset.
 */
export async function POST(req) {
  const contentLength = Number(req.headers.get('content-length') || 0)
  if (contentLength > MAX_BODY_BYTES) {
    return NextResponse.json({ error: 'Payload too large' }, { status: 413 })
  }

  const { userId } = await auth()
  const rate = await limitQuoteRequest({ userId, headers: req.headers })
  if (!rate.allowed) {
    return NextResponse.json(
      { error: 'Too many requests — please retry shortly' },
      { status: 429, headers: rate.headers },
    )
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

  // Machine capacity: reject models the farm cannot print (admin-configured
  // limits; nothing is enforced until the admin sets them).
  const limitsCheck = checkMachineLimits(
    result.data.quote.inputs?.dimensionsCm,
    (result.data.quote.inputs?.weightGrams ?? 0) / 1000,
    settings?.machineLimits?.toObject?.() || settings?.machineLimits || null,
  )
  if (!limitsCheck.fits) {
    return NextResponse.json(
      { error: machineLimitMessage(limitsCheck.violations) },
      { status: 422 },
    )
  }

  const { quote, requestId } = result.data
  let responseQuote = quote

  if (requestId) {
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
    // the stored model (STL/OBJ/glTF/GLB/3MF) instead of trusting client
    // metrics. Best-effort — any failure falls back to the client-derived quote
    // so the save never breaks. The live preview still uses client metrics.
    let persistQuote = quote
    try {
      const mf = reqDoc.modelFile || {}
      const name = mf.originalName || mf.s3Key || ''
      if (mf.s3Key && supportsServerRecompute(name)) {
        const obj = await s3.send(
          new GetObjectCommand({ Bucket: process.env.NEXT_PUBLIC_S3_BUCKET_NAME, Key: mf.s3Key }),
        )
        const tooLarge = (obj.ContentLength ?? 0) > MAX_RECOMPUTE_BYTES
        if (tooLarge) {
          obj.Body?.destroy?.()
          console.warn(
            `[quote] skipping geometry recompute for requestId=${requestId}: ` +
              `stored model is ${obj.ContentLength} bytes (> ${MAX_RECOMPUTE_BYTES})`,
          )
        }
        const bytes = tooLarge ? null : await obj.Body.transformToByteArray()
        const serverMetrics = bytes ? await recomputeMetricsFromModel(bytes, name) : null
        if (serverMetrics?.volumeCm3 > 0) {
          // Deviation policy (product decision 2026-06-12): if the client's
          // volume understates the server recompute by more than the
          // tolerance, REJECT the request (tamper signal) — log for ops, no
          // quote is persisted. Honest divergences should retry cleanly after
          // a model reload.
          const dev = geometryDeviation(
            { volumeCm3: body?.volumeCm3 },
            { volumeCm3: serverMetrics.volumeCm3 },
          )
          if (dev.suspicious) {
            console.error(
              `[quote] geometry deviation ${dev.volumePctDelta.toFixed(1)}% > ` +
                `${dev.tolerancePct}% for requestId=${requestId} ` +
                `(client=${body?.volumeCm3} cm³, server=${serverMetrics.volumeCm3} cm³) — rejected`,
            )
            return NextResponse.json(
              {
                error:
                  'The model measurements sent by your browser do not match the uploaded file. ' +
                  'Please reload the model and request the quote again.',
              },
              { status: 400 },
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

    // Persist geometry-derived dimensions/weight first so delivery pricing
    // (tiers in grams, volume in cm³) can be computed below.
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

    // Auto-apply admin-default delivery for custom prints if none are set (so
    // the cart has selectable options), priced from the request's dimensions.
    // On every re-quote, refresh non-overridden prices from CURRENT admin
    // settings so delivery fees track the live config (admin customPrice wins).
    const deliveryDims = reqDoc.dimensions?.length ? reqDoc.dimensions : null
    const adminDeliveryTypes = settings?.additionalDeliveryTypes || []
    const existingDelivery = reqDoc.delivery?.deliveryTypes || []
    if (existingDelivery.length === 0) {
      const defaults = resolveCustomPrintDeliveryDefaults(adminDeliveryTypes, deliveryDims)
      if (defaults.length > 0) {
        reqDoc.delivery = { deliveryTypes: defaults }
      }
    } else {
      reqDoc.delivery = {
        ...(reqDoc.delivery?.toObject?.() ?? reqDoc.delivery),
        deliveryTypes: refreshCustomPrintDeliveryPrices(
          existingDelivery.map((e) => (e?.toObject?.() ? e.toObject() : e)),
          adminDeliveryTypes,
          deliveryDims,
        ),
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
