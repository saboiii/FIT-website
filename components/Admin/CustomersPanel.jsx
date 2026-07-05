'use client'
// Admin customers panel — honest stub (openspec add-admin-customers-panel).
// CRM-lite (Shopify Customers reference): the panel exists in the IA today,
// renders an informational empty state plus a dimmed ghost ledger, and stays
// visibly non-live until the aggregation API lands.
import { IoPeopleOutline } from 'react-icons/io5'
import { ComingSoon, ComingSoonBlock, EmptyState, SkeletonRow } from '@/components/dashboard-ui'

export default function CustomersPanel() {
    return (
        <div className="p-4 md:p-6 flex flex-col gap-4">
            <div className="flex items-center gap-3">
                <h2 className="dash-title">Customers</h2>
                <ComingSoon />
            </div>

            <EmptyState
                icon={<IoPeopleOutline />}
                title="Customers — Coming Soon"
                body="Every customer in one place: orders count, lifetime value, last order, linked print requests and internal notes. Needs an admin aggregation across users, orders and requests."
            />

            {/* Ghost of the intended ledger — dimmed, non-interactive. */}
            <ComingSoonBlock title="Customer ledger — coming soon">
                <div className="grid grid-cols-[minmax(0,1fr)_80px_100px_110px] gap-4 px-1 pb-2">
                    <span className="dash-label">Customer</span>
                    <span className="dash-label text-right">Orders</span>
                    <span className="dash-label text-right">Lifetime</span>
                    <span className="dash-label text-right">Last order</span>
                </div>
                <div className="flex flex-col gap-2">
                    <SkeletonRow />
                    <SkeletonRow />
                    <SkeletonRow />
                    <SkeletonRow />
                </div>
            </ComingSoonBlock>
        </div>
    )
}
