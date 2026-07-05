'use client'

import Dashboard from './Dashboard'
import Fallback from './Fallback'
import useAccess from '@/utils/useAccess'
import useSubscription from '@/utils/useSubscription'
import { DashProvider, SkeletonTile } from '@/components/dashboard-ui'

function DashboardPage() {
    const { loading: accessLoading, isAdmin } = useAccess()
    const { loading: subLoading, subscription } = useSubscription()

    const loading = accessLoading || subLoading

    const hasSubscription = !!subscription?.priceId
    const shouldAllowAccess = isAdmin || hasSubscription

    return (
        <DashProvider>
            {loading ? (
                <div className="mx-auto w-full max-w-[1200px] px-6 py-12 grid grid-cols-1 md:grid-cols-3 gap-4">
                    <SkeletonTile className="md:col-span-2" />
                    <SkeletonTile />
                    <SkeletonTile className="md:col-span-2" />
                    <SkeletonTile />
                </div>
            ) : shouldAllowAccess ? (
                <Dashboard />
            ) : (
                <Fallback />
            )}
        </DashProvider>
    )
}

export default DashboardPage
