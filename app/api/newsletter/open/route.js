import { connectToDatabase } from '@/lib/db'
import NewsletterEvent from '@/models/NewsletterEvent'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// 1×1 transparent GIF
const PIXEL = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64')

// Open-tracking pixel: GET /api/newsletter/open?c=<campaignId>&s=<token>
export async function GET(req) {
    try {
        const url = new URL(req.url)
        const campaignId = url.searchParams.get('c')
        const token = url.searchParams.get('s')
        if (campaignId && token && /^[a-f\d]{24}$/i.test(campaignId)) {
            await connectToDatabase()
            await NewsletterEvent.create({ campaignId, subscriberToken: token, type: 'open' })
        }
    } catch { /* never break the pixel */ }
    return new Response(PIXEL, {
        headers: { 'Content-Type': 'image/gif', 'Cache-Control': 'no-store' },
    })
}
