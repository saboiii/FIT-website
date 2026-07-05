import { NextResponse } from 'next/server'
import { connectToDatabase } from '@/lib/db'
import NewsletterEvent from '@/models/NewsletterEvent'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const SITE_ORIGIN = () => process.env.NEXT_PUBLIC_BASE_URL || 'https://www.fixitoday.com'

// Click tracking + redirect: GET /api/newsletter/click?c=&s=&url=
// Only same-origin targets are allowed (we only ever wrap our own links),
// which closes the open-redirect hole.
export async function GET(req) {
    const reqUrl = new URL(req.url)
    const campaignId = reqUrl.searchParams.get('c')
    const token = reqUrl.searchParams.get('s')
    const target = reqUrl.searchParams.get('url') || '/'

    let destination
    try {
        destination = new URL(target, SITE_ORIGIN())
        if (destination.origin !== new URL(SITE_ORIGIN()).origin) {
            destination = new URL(SITE_ORIGIN())
        }
    } catch {
        destination = new URL(SITE_ORIGIN())
    }

    try {
        if (campaignId && token && /^[a-f\d]{24}$/i.test(campaignId)) {
            await connectToDatabase()
            await NewsletterEvent.create({ campaignId, subscriberToken: token, type: 'click', url: destination.pathname })
        }
    } catch { /* never break the redirect */ }

    return NextResponse.redirect(destination, 302)
}
