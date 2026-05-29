import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { connectToDatabase } from '@/lib/db'
import SavedQuote from '@/models/SavedQuote'
import { generateShareToken, computeExpiry, DEFAULT_SHARE_DAYS } from '@/lib/quoting/savedQuote'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// POST /api/quote/:quoteId/share — owner generates (or refreshes) a share link.
export async function POST(req, { params }) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { quoteId } = await params
  await connectToDatabase()
  const saved = await SavedQuote.findOne({ quoteId })
  if (!saved) return NextResponse.json({ error: 'Quote not found' }, { status: 404 })
  if (saved.userId !== userId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  saved.shareToken = saved.shareToken || generateShareToken()
  saved.shareExpiresAt = computeExpiry(Date.now(), DEFAULT_SHARE_DAYS)
  await saved.save()

  return NextResponse.json(
    { shareToken: saved.shareToken, shareExpiresAt: saved.shareExpiresAt },
    { status: 200 },
  )
}
