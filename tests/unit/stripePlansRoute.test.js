// GET /api/stripe/plans — Stripe catalogue mapping, incl. metadata feature
// parsing (JSON array string vs delimiter list) and inactive-price skipping.
import { describe, it, expect, vi, beforeEach } from 'vitest'

const retrieve = vi.fn()
vi.mock('stripe', () => ({ default: class Stripe { constructor() { this.prices = { retrieve } } } }))
vi.mock('@/lib/stripeConfig', () => ({
    getStripePriceIds: async () => ({ tier1: 'p1', tier2: 'p2', tier3: 'p3', tier4: null }),
}))

const price = (id, product, extra = {}) => ({
    id,
    active: true,
    unit_amount: 1200,
    currency: 'sgd',
    recurring: { interval: 'month' },
    product: { active: true, name: `Plan ${id}`, description: '', ...product },
    ...extra,
})

describe('GET /api/stripe/plans', () => {
    beforeEach(() => { retrieve.mockReset(); vi.resetModules() })

    it('parses JSON-array metadata features into a list, not one JSON string', async () => {
        retrieve
            .mockResolvedValueOnce(price('p1', {
                metadata: { features: '["Professional Feature 1","Professional Feature 2"]' },
            }))
            .mockResolvedValueOnce(price('p2', { metadata: { features: 'A | B | C' } }))
            .mockResolvedValueOnce(price('p3', {
                // A JSON array pasted into a single Stripe marketing feature
                // must ALSO expand into bullets (the reported bug).
                marketing_features: [{ name: 'From marketing' }, { name: '["MF A","MF B"]' }],
                metadata: { features: '["ignored"]' },
            }))
        const { GET } = await import('@/app/api/stripe/plans/route')
        const res = await GET()
        const { plans } = await res.json()
        expect(plans[0].features).toEqual(['Professional Feature 1', 'Professional Feature 2'])
        expect(plans[1].features).toEqual(['A', 'B', 'C'])
        expect(plans[2].features).toEqual(['From marketing', 'MF A', 'MF B'])
    })

    it('skips inactive prices and unconfigured tiers', async () => {
        retrieve
            .mockResolvedValueOnce(price('p1', {}))
            .mockResolvedValueOnce(price('p2', {}, { active: false }))
            .mockResolvedValueOnce(price('p3', { active: false }))
        const { GET } = await import('@/app/api/stripe/plans/route')
        const { plans } = await (await GET()).json()
        expect(plans.map((p) => p.priceId)).toEqual(['p1'])
        expect(plans[0]).toMatchObject({ amount: 12, currency: 'SGD', interval: 'month' })
    })
})
