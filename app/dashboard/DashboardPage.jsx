'use client'
// Home gate: subscription/admin check. The shell (rail + DashProvider) comes
// from app/dashboard/layout.jsx, so this only swaps the main column between
// skeleton, Dashboard and Fallback.
import Dashboard from './Dashboard'
import Fallback from './Fallback'
import useAccess from '@/utils/useAccess'
import useSubscription from '@/utils/useSubscription'
import { SkeletonTile } from '@/components/dashboard-ui'

function DashboardPage() {
    const { loading: accessLoading, isAdmin } = useAccess()
    const { loading: subLoading, subscription } = useSubscription()

    const loading = accessLoading || subLoading

    const hasSubscription = !!subscription?.priceId
    const shouldAllowAccess = isAdmin || hasSubscription

    if (loading) {
        return (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <SkeletonTile className="md:col-span-2" />
                <SkeletonTile />
                <SkeletonTile className="md:col-span-2" />
                <SkeletonTile />
            </div>
        )
    }

    return shouldAllowAccess ? <Dashboard /> : <Fallback />
}

export default DashboardPage
