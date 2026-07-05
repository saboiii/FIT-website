import { NextResponse } from 'next/server'
import { z } from 'zod'
import { connectToDatabase } from '@/lib/db'
import Subscriber from '@/models/Subscriber'
import Interest from '@/models/Interest'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Token-authenticated (the unsubscribe token IS the credential).
export async function GET(req, { params }) {
    const { token } = await params
    await connectToDatabase()
    const sub = await Subscriber.findOne({ unsubscribeToken: token })
        .select('email fullName interestIds status preferences')
        .lean()
    if (!sub) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    const interests = await Interest.find({ isActive: true }).select('name description').lean()
    return NextResponse.json({ ok: true, subscriber: sub, interests })
}

const PrefsSchema = z
    .object({
        interestIds: z.array(z.string().max(64)).max(20).optional(),
        frequency: z.enum(['all', 'weekly', 'monthly']).optional(),
        pausedUntil: z.string().datetime().nullable().optional(),
        resubscribe: z.boolean().optional(),
    })
    .strict()

export async function PUT(req, { params }) {
    const { token } = await params
    let body
    try {
        body = await req.json()
    } catch {
        return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
    }
    const parsed = PrefsSchema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: 'Invalid input' }, { status: 422 })

    await connectToDatabase()
    const sub = await Subscriber.findOne({ unsubscribeToken: token })
    if (!sub) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const { interestIds, frequency, pausedUntil, resubscribe } = parsed.data
    if (interestIds) sub.interestIds = interestIds
    if (frequency) sub.preferences.frequency = frequency
    if (pausedUntil !== undefined) sub.preferences.pausedUntil = pausedUntil ? new Date(pausedUntil) : null
    if (resubscribe) sub.status = 'active'
    await sub.save()
    return NextResponse.json({ ok: true })
}
