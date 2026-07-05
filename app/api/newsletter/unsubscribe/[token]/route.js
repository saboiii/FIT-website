import { NextResponse } from 'next/server'
import { connectToDatabase } from '@/lib/db'
import Subscriber from '@/models/Subscriber'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req, { params }) {
    const { token } = await params
    await connectToDatabase()
    const sub = await Subscriber.findOneAndUpdate(
        { unsubscribeToken: token },
        { status: 'unsubscribed' },
    )
    if (!sub) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json({ ok: true })
}
