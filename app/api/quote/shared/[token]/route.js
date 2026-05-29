import { NextResponse } from 'next/server'
import { connectToDatabase } from '@/lib/db'
import SavedQuote from '@/models/SavedQuote'
import { isShareUsable, isQuoteValid } from '@/lib/quoting/savedQuote'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// GET /api/quote/shared/:token — public, read-only view of a shared quote.
export async function GET(req, { params }) {
  const { token } = await params
  if (!token) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await connectToDatabase()
  const saved = await SavedQuote.findOne({ shareToken: token }).lean()

  if (!saved || !isShareUsable(saved)) {
    return NextResponse.json({ error: 'This shared quote is unavailable or has expired' }, { status: 404 })
  }

  return NextResponse.json(
    {
      quote: saved.quote,
      currency: saved.currency,
      total: saved.total,
      modelRef: saved.modelRef ? { originalName: saved.modelRef.originalName } : undefined,
      validUntil: saved.validUntil,
      stale: !isQuoteValid(saved), // pricing window passed → re-quote recommended
    },
    { status: 200 },
  )
}
