import { NextResponse } from 'next/server'
import { z } from 'zod'
import crypto from 'crypto'
import { connectToDatabase } from '@/lib/db'
import Subscriber from '@/models/Subscriber'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const MAX_BODY_BYTES = 4 * 1024

const SubscribeSchema = z
    .object({
        email: z.string().trim().toLowerCase().email().max(254),
        fullName: z.string().trim().max(120).optional(),
        interestIds: z.array(z.string().max(64)).max(20).optional(),
    })
    .strict()

// Public newsletter signup. Upserts by email; preserves the unsubscribe token;
// re-subscribes a previously-unsubscribed address.
export async function POST(req) {
    const length = Number(req.headers.get('content-length') || 0)
    if (length > MAX_BODY_BYTES) {
        return NextResponse.json({ error: 'Payload too large' }, { status: 413 })
    }
    let body
    try {
        body = await req.json()
    } catch {
        return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
    }
    const parsed = SubscribeSchema.safeParse(body)
    if (!parsed.success) {
        return NextResponse.json({ error: 'Invalid input' }, { status: 422 })
    }
    const { email, fullName, interestIds } = parsed.data

    await connectToDatabase()
    const existing = await Subscriber.findOne({ email })
    if (existing) {
        existing.status = 'active'
        if (fullName) existing.fullName = fullName
        if (interestIds) existing.interestIds = interestIds
        await existing.save()
        return NextResponse.json({ ok: true, resubscribed: true })
    }
    await Subscriber.create({
        email,
        fullName: fullName || '',
        interestIds: interestIds || [],
        unsubscribeToken: crypto.randomUUID(),
    })
    return NextResponse.json({ ok: true })
}
