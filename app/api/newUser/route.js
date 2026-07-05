import { createWebhooksHandler } from '@brianmmdev/clerk-webhooks-handler'
import Stripe from 'stripe'
import { clerkClient } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { getPostHogClient } from '@/lib/posthog-server'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

const handler = createWebhooksHandler({
    // Canonical name is CLERK_WEBHOOK_SECRET; WEBHOOK_SECRET kept as a fallback
    // because the existing env files used that name.
    secret: process.env.CLERK_WEBHOOK_SECRET || process.env.WEBHOOK_SECRET,
    onUserCreated: async (user) => {
        try {
            const { cardToken, priceId, basedIn, business_type } = user.unsafe_metadata || {}

            // If no priceId was selected, skip Stripe payment/subscription setup entirely
            if (!priceId) {
                const client = await clerkClient()
                const userObj = await client.users.getUser(user.id)
                const currentMetadata = userObj.publicMetadata || {}

                // create only minimal public metadata to indicate onboarding completed
                await client.users.updateUser(user.id, {
                    publicMetadata: {
                        ...currentMetadata,
                        role: 'user',
                    },
                })
                try {
                    const phog = getPostHogClient();
                    phog.capture({ distinctId: user.id, event: 'user_registered', properties: { has_paid_tier: false, sign_up_method: 'clerk' } });
                    phog.identify({ distinctId: user.id, properties: { role: 'user' } });
                } catch (phErr) {
                    console.error('PostHog user_registered capture failed:', phErr);
                }
                return
            }

            // For paid tiers, cardToken is required
            if (!cardToken) {
                console.warn(`User ${user.id} selected price ${priceId} but provided no card token. Skipping Stripe setup.`)
                return
            }

            // Create payment method from token
            const pm = await stripe.paymentMethods.create({
                type: 'card',
                card: { token: cardToken },
            })

            // Create a customer and attach the payment method
            const customer = await stripe.customers.create({
                email: user?.email_addresses?.[0]?.email_address,
                payment_method: pm.id,
            })

            // Create subscription for the selected price
            const subscription = await stripe.subscriptions.create({
                customer: customer.id,
                default_payment_method: pm.id,
                trial_period_days: 14,
                items: [{ price: priceId }],
                proration_behavior: 'always_invoice',
            })

            // Create Stripe Express account for the merchant
            const account = await stripe.accounts.create({
                type: 'express',
                country: basedIn,
                email: user?.email_addresses?.[0]?.email_address,
                business_type: business_type,
                capabilities: {
                    transfers: { requested: true },
                    card_payments: { requested: true },
                },
            });

            // Update Clerk user's public metadata with only the created IDs
            const client = await clerkClient()
            const userObj = await client.users.getUser(user.id)
            const currentMetadata = userObj.publicMetadata || {}

            const newMetadata = { ...currentMetadata, role: 'user' }
            if (customer?.id) newMetadata.stripeCustomerId = customer.id
            if (subscription?.id) newMetadata.stripeSubscriptionId = subscription.id
            if (account?.id) newMetadata.stripeAccountId = account.id

            await client.users.updateUser(user.id, {
                publicMetadata: newMetadata,
            })
            try {
                const phog = getPostHogClient();
                phog.capture({
                    distinctId: user.id,
                    event: 'user_registered',
                    properties: {
                        has_paid_tier: !!priceId,
                        sign_up_method: 'clerk',
                    },
                });
                phog.identify({
                    distinctId: user.id,
                    properties: {
                        role: 'user',
                    },
                });
            } catch (phErr) {
                console.error('PostHog user_registered capture failed:', phErr);
            }
        } catch (error) {
            console.error('Clerk webhook error:', error)
        }
    },
})

export async function POST(req) {
    const res = await handler.POST(req)
    // The library 404s event types we don't handle — acknowledge those so
    // Clerk doesn't retry deliberately-ignored events. Real failures (e.g.
    // bad svix signature → 400) pass through so they surface in Clerk's
    // dashboard and get retried.
    if (!res || res.status === 404) {
        return NextResponse.json({ received: true })
    }
    return res
}