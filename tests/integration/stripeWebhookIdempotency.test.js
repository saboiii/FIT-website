// Integration-style test for the Stripe webhook idempotency claim: a redelivery
// of an already-processed checkout session must be acknowledged without
// re-running fulfilment. Convention: mock Stripe/Clerk/Mongoose at the edges.
import { describe, it, expect, vi, beforeEach } from 'vitest'

const { constructEvent, paymentIntentsRetrieve } = vi.hoisted(() => ({
    constructEvent: vi.fn(),
    paymentIntentsRetrieve: vi.fn(),
}))

vi.mock('stripe', () => ({
    default: class Stripe {
        constructor() {
            this.webhooks = { constructEvent }
            this.paymentIntents = { retrieve: paymentIntentsRetrieve }
        }
    },
}))
vi.mock('@/lib/db', () => ({ connectToDatabase: vi.fn() }))
vi.mock('@/models/User', () => ({ default: { findOne: vi.fn() } }))
vi.mock('@/models/Product', () => ({ default: { findOne: vi.fn(), findById: vi.fn() } }))
vi.mock('@/models/CheckoutSession', () => ({
    default: { findOne: vi.fn(), findOneAndUpdate: vi.fn(), updateOne: vi.fn() },
}))
vi.mock('@/models/Order', () => ({ default: vi.fn() }))
vi.mock('@/models/CustomPrintRequest', () => ({ default: { findOne: vi.fn(), create: vi.fn() } }))
vi.mock('@/models/AppSettings', () => ({ default: { findById: vi.fn() } }))
vi.mock('@/lib/email', () => ({ sendEmail: vi.fn() }))
vi.mock('@/lib/notifications/customPrint', () => ({ notifyCustomPrintEvent: vi.fn() }))
vi.mock('@clerk/nextjs/server', () => ({ clerkClient: vi.fn() }))

import { POST } from '@/app/api/webhook/stripe/route'
import CheckoutSession from '@/models/CheckoutSession'
import User from '@/models/User'
import Product from '@/models/Product'
import AppSettings from '@/models/AppSettings'
import Order from '@/models/Order'
import { sendEmail } from '@/lib/email'

const fakeRequest = () => ({
    text: async () => '{}',
    headers: { get: () => 'sig' },
})

const completedEvent = {
    type: 'checkout.session.completed',
    data: {
        object: {
            id: 'cs_test_1',
            payment_intent: 'pi_1',
            customer_details: { email: 'buyer@example.com', name: 'Saba' },
        },
    },
}

describe('POST /api/webhook/stripe idempotency', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        constructEvent.mockReturnValue(completedEvent)
        CheckoutSession.updateOne.mockResolvedValue({})
    })

    it('acknowledges a redelivered, already-processed session without refulfilling', async () => {
        // Claim fails (processed already true) …
        CheckoutSession.findOneAndUpdate.mockResolvedValue(null)
        // … and the session exists as processed.
        CheckoutSession.findOne.mockResolvedValue({ sessionId: 'cs_test_1', processed: true })

        const res = await POST(fakeRequest())

        expect(res.status).toBe(200)
        expect(await res.json()).toMatchObject({ received: true, duplicate: true })
        // Fulfilment never started.
        expect(User.findOne).not.toHaveBeenCalled()
    })

    it('returns 404 for an unknown session id (so Stripe retries)', async () => {
        CheckoutSession.findOneAndUpdate.mockResolvedValue(null)
        CheckoutSession.findOne.mockResolvedValue(null)

        const res = await POST(fakeRequest())

        expect(res.status).toBe(404)
        expect(User.findOne).not.toHaveBeenCalled()
    })

    it('claims the session on first delivery and releases the claim if fulfilment cannot start', async () => {
        CheckoutSession.findOneAndUpdate.mockResolvedValue({
            sessionId: 'cs_test_1',
            userId: 'user_1',
            processed: false,
        })
        User.findOne.mockResolvedValue(null) // user missing → cannot fulfil

        const res = await POST(fakeRequest())

        expect(res.status).toBe(404)
        expect(CheckoutSession.findOneAndUpdate).toHaveBeenCalledWith(
            { sessionId: 'cs_test_1', processed: { $ne: true } },
            { processed: true },
            expect.anything(),
        )
        // Claim released so a retry can re-attempt.
        expect(CheckoutSession.updateOne).toHaveBeenCalledWith(
            { sessionId: 'cs_test_1' },
            { processed: false },
        )
    })

    it('sends the customer order-confirmation email as part of fulfilment', async () => {
        CheckoutSession.findOneAndUpdate.mockResolvedValue({
            sessionId: 'cs_test_1',
            userId: 'user_1',
            processed: false,
        })
        // Empty cart → fulfilment succeeds with an empty order; the
        // confirmation email must still be tied to Order creation.
        User.findOne.mockResolvedValue({
            userId: 'user_1',
            email: 'buyer@example.com',
            cart: [],
            orderHistory: [],
            save: vi.fn().mockResolvedValue({}),
        })
        Product.findOne.mockResolvedValue(null)
        AppSettings.findById.mockReturnValue({ lean: vi.fn().mockResolvedValue(null) })
        paymentIntentsRetrieve.mockResolvedValue(null)
        Order.mockImplementation(function () {
            this.save = vi.fn().mockResolvedValue({})
        })
        sendEmail.mockResolvedValue({})

        const res = await POST(fakeRequest())

        expect(res.status).toBe(200)
        expect(sendEmail).toHaveBeenCalledWith(
            expect.objectContaining({ to: 'buyer@example.com' }),
        )
    })

    it('does not send the confirmation email on a duplicate delivery', async () => {
        CheckoutSession.findOneAndUpdate.mockResolvedValue(null)
        CheckoutSession.findOne.mockResolvedValue({ sessionId: 'cs_test_1', processed: true })

        const res = await POST(fakeRequest())

        expect(res.status).toBe(200)
        expect(sendEmail).not.toHaveBeenCalled()
    })

    it('flags the order when the captured amount differs from the recomputed total', async () => {
        constructEvent.mockReturnValue({
            ...completedEvent,
            data: { object: { ...completedEvent.data.object, amount_total: 1132 } },
        })
        CheckoutSession.findOneAndUpdate.mockResolvedValue({ sessionId: 'cs_test_1', userId: 'user_1', processed: false })
        // Empty cart → recomputed total 0, but Stripe captured 1132 cents.
        User.findOne.mockResolvedValue({ userId: 'user_1', email: 'buyer@example.com', cart: [], orderHistory: [], save: vi.fn().mockResolvedValue({}) })
        Product.findOne.mockResolvedValue(null)
        AppSettings.findById.mockReturnValue({ lean: vi.fn().mockResolvedValue(null) })
        paymentIntentsRetrieve.mockResolvedValue(null)
        let orderData
        Order.mockImplementation(function (data) {
            orderData = data
            this.save = vi.fn().mockResolvedValue({})
        })
        sendEmail.mockResolvedValue({})

        const res = await POST(fakeRequest())

        expect(res.status).toBe(200)
        expect(orderData.amountMismatch).toEqual({ stripeAmountCents: 1132, computedAmountCents: 0 })
        expect(orderData.statusHistory.some((h) => /review/i.test(h.note))).toBe(true)
    })

    it('does not flag the order when amounts agree', async () => {
        constructEvent.mockReturnValue({
            ...completedEvent,
            data: { object: { ...completedEvent.data.object, amount_total: 0 } },
        })
        CheckoutSession.findOneAndUpdate.mockResolvedValue({ sessionId: 'cs_test_1', userId: 'user_1', processed: false })
        User.findOne.mockResolvedValue({ userId: 'user_1', email: 'buyer@example.com', cart: [], orderHistory: [], save: vi.fn().mockResolvedValue({}) })
        Product.findOne.mockResolvedValue(null)
        AppSettings.findById.mockReturnValue({ lean: vi.fn().mockResolvedValue(null) })
        paymentIntentsRetrieve.mockResolvedValue(null)
        let orderData
        Order.mockImplementation(function (data) {
            orderData = data
            this.save = vi.fn().mockResolvedValue({})
        })
        sendEmail.mockResolvedValue({})

        const res = await POST(fakeRequest())

        expect(res.status).toBe(200)
        expect(orderData.amountMismatch).toBeUndefined()
    })

    it('releases the claim when fulfilment throws, then reports 500', async () => {
        CheckoutSession.findOneAndUpdate.mockResolvedValue({
            sessionId: 'cs_test_1',
            userId: 'user_1',
            processed: false,
        })
        User.findOne.mockRejectedValue(new Error('db down'))

        const res = await POST(fakeRequest())

        expect(res.status).toBe(500)
        expect(CheckoutSession.updateOne).toHaveBeenCalledWith(
            { sessionId: 'cs_test_1' },
            { processed: false },
        )
    })
})
