'use client'
// Creator setup checklist (blueprint §6 [UI]) — mirrors the admin checklist
// anatomy. Every check is client-derivable: Stripe onboarding via
// GET /api/user/express, welcome message via GET /api/chat/settings, and the
// rest from data the home page already fetched (display name, products,
// orders). Collapses to "Setup N/5 ▸" when ≥4 complete; hides at 5/5.
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { DashCard } from '@/components/dashboard-ui'

const isRawUserId = (value) => typeof value === 'string' && /^user_[a-zA-Z0-9]+$/.test(value.trim())

function CheckDot({ done }) {
    return (
        <span
            aria-hidden="true"
            className={`h-2.5 w-2.5 rounded-full shrink-0 ${
                done ? 'bg-[var(--dash-ink)]' : 'dash-hatch border border-[var(--dash-line)]'
            }`}
        />
    )
}

export default function SetupChecklist({ user, isLoaded, displayName, hasProduct, hasSale }) {
    const [stripeOnboarded, setStripeOnboarded] = useState(null) // null = checking
    const [welcomeSet, setWelcomeSet] = useState(null)
    const [expanded, setExpanded] = useState(false)

    useEffect(() => {
        if (!user || !isLoaded) return undefined
        let cancelled = false
        const accountId = user?.publicMetadata?.stripeAccountId
        if (!accountId) {
            setStripeOnboarded(false)
        } else {
            ;(async () => {
                try {
                    const res = await fetch(`/api/user/express?stripeAccountId=${accountId}`)
                    const data = res.ok ? await res.json() : {}
                    if (!cancelled) setStripeOnboarded(data.onboarded === true)
                } catch {
                    if (!cancelled) setStripeOnboarded(false)
                }
            })()
        }
        ;(async () => {
            try {
                const res = await fetch('/api/chat/settings')
                const data = res.ok ? await res.json() : {}
                if (!cancelled) setWelcomeSet(Boolean(String(data.autoReplyMessage || '').trim()))
            } catch {
                if (!cancelled) setWelcomeSet(false)
            }
        })()
        return () => {
            cancelled = true
        }
    }, [user, isLoaded])

    // Wait for the async checks so the card never flashes wrong state.
    if (stripeOnboarded === null || welcomeSet === null) return null

    const items = [
        {
            key: 'stripe',
            label: 'Finish Stripe payouts onboarding',
            done: stripeOnboarded,
            href: '#stripe-payouts',
        },
        {
            key: 'name',
            label: 'Name your shop',
            done: Boolean(displayName) && !isRawUserId(displayName),
            href: '#shop-name',
        },
        {
            key: 'welcome',
            label: 'Set a chat welcome message',
            done: welcomeSet,
            href: '/dashboard/messages',
        },
        {
            key: 'product',
            label: 'Publish your first product',
            done: hasProduct,
            href: '/dashboard/products/create',
        },
        {
            key: 'sale',
            label: 'Make your first sale',
            done: hasSale,
            href: '/dashboard/products',
        },
    ]
    const done = items.filter((i) => i.done).length
    if (done === items.length) return null

    if (done >= 4 && !expanded) {
        return (
            <DashCard>
                <button
                    type="button"
                    onClick={() => setExpanded(true)}
                    aria-expanded={false}
                    className="w-full flex items-center justify-between gap-3 text-left cursor-pointer"
                >
                    <span className="text-[13px] font-medium">Setup {done}/{items.length}</span>
                    <span className="dash-soft text-[13px]" aria-hidden="true">▸</span>
                </button>
            </DashCard>
        )
    }

    return (
        <DashCard title="Set up your shop" action={<span className="dash-data dash-soft">{done}/{items.length} done</span>}>
            <ul className="flex flex-col">
                {items.map((item) => (
                    <li
                        key={item.key}
                        className="flex items-center gap-2.5 py-2 border-b border-[var(--dash-line)] last:border-b-0 last:pb-0 first:pt-0"
                    >
                        <CheckDot done={item.done} />
                        {item.done ? (
                            <span className="text-[13px] dash-soft">{item.label}</span>
                        ) : (
                            <Link href={item.href} className="text-[13px] text-[var(--dash-ink)] hover:underline">
                                {item.label} →
                            </Link>
                        )}
                    </li>
                ))}
            </ul>
        </DashCard>
    )
}
