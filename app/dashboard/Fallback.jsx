'use client'
// Access fallback (blueprint §5.16): an EmptyState guide — what the creator
// space unlocks and one sun CTA to subscribe, instead of a dead-end denial.
// Self-wraps in DashProvider because product create/edit pages render it
// standalone.
import { useRouter } from 'next/navigation'
import { IoStorefrontOutline } from 'react-icons/io5'
import { DashProvider, EmptyState } from '@/components/dashboard-ui'

function Fallback() {
    const router = useRouter()
    return (
        <DashProvider className="flex items-center justify-center">
            <EmptyState
                icon={<IoStorefrontOutline />}
                title="Your Creator Space"
                body="An active subscription unlocks your shop: sell products, message customers, and manage orders from one place."
                cta="View Subscriptions"
                onCta={() => router.push('/account/subscription')}
                secondary="Return home"
                onSecondary={() => router.push('/')}
            />
        </DashProvider>
    )
}

export default Fallback
