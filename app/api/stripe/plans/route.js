import Stripe from 'stripe'
import { NextResponse } from 'next/server'
import { getStripePriceIds } from '@/lib/stripeConfig'

export const runtime = 'nodejs'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

// Public catalogue data (names, amounts, features) — cache briefly so the
// pricing page doesn't hit Stripe on every visit.
const CACHE_TTL_MS = 5 * 60 * 1000
let cache = null // { at, plans }

function featureList(product) {
    const marketing = (product?.marketing_features || [])
        .map((f) => f?.name)
        .filter(Boolean)
    if (marketing.length > 0) return marketing
    const meta = product?.metadata?.features
    if (typeof meta === 'string' && meta.trim()) {
        // Metadata may hold a JSON array string ('["A","B"]') or a
        // pipe/comma-separated list — accept both.
        try {
            const parsed = JSON.parse(meta)
            if (Array.isArray(parsed)) return parsed.map((s) => String(s).trim()).filter(Boolean)
        } catch { /* not JSON — fall through to delimiter split */ }
        return meta.split(/[|,]/).map((s) => s.trim()).filter(Boolean)
    }
    return []
}

export async function GET() {
    try {
        if (cache && Date.now() - cache.at < CACHE_TTL_MS) {
            return NextResponse.json({ plans: cache.plans })
        }
        const priceIds = await getStripePriceIds()
        const tiers = ['tier1', 'tier2', 'tier3', 'tier4']
        const plans = (
            await Promise.all(
                tiers.map(async (tier) => {
                    const id = priceIds?.[tier]
                    if (!id) return null
                    try {
                        const price = await stripe.prices.retrieve(id, { expand: ['product'] })
                        if (!price?.active || price.product?.active === false) return null
                        return {
                            tier,
                            priceId: price.id,
                            name: price.product?.name || tier,
                            description: price.product?.description || '',
                            amount: typeof price.unit_amount === 'number' ? price.unit_amount / 100 : null,
                            currency: (price.currency || 'sgd').toUpperCase(),
                            interval: price.recurring?.interval || null,
                            popular: price.product?.metadata?.popular === 'true',
                            features: featureList(price.product),
                        }
                    } catch (err) {
                        console.error(`[stripe/plans] failed to load ${tier} (${id}):`, err?.message)
                        return null
                    }
                }),
            )
        ).filter(Boolean)
        cache = { at: Date.now(), plans }
        return NextResponse.json({ plans })
    } catch (err) {
        console.error('[stripe/plans] error:', err)
        return NextResponse.json({ error: 'Failed to load plans' }, { status: 500 })
    }
}
