'use client'
// Creator payout statements — honest stub (openspec add-creator-payout-statements).
// Real page shell + informational empty state + a clearly non-interactive
// ghost of the intended layout. Data plugs in via ./data.js (fetchPayoutStatement).
// The rail comes from CreatorShell via app/dashboard/layout.jsx.
import { IoWalletOutline } from 'react-icons/io5'
import {
    ComingSoon,
    ComingSoonBlock,
    EmptyState,
    SkeletonRow,
    SkeletonTile,
} from '@/components/dashboard-ui'

export default function PayoutsPage() {
    return (
        <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
                <h1 className="dash-title">Payouts</h1>
                <ComingSoon />
            </div>

            <div className="bg-[var(--dash-card)] border border-[var(--dash-line)] rounded-[var(--dash-r-card)] shadow-[var(--dash-shadow-card)]">
                <EmptyState
                    icon={<IoWalletOutline />}
                    title="Payout Statements Coming Soon"
                    body="Your balance, payout history and per-order breakdowns (product, shipping, fees, net) will live here once statements are wired to your Stripe Express account."
                />
            </div>

            {/* Ghost of the intended layout — dimmed, non-interactive. */}
            <ComingSoonBlock title="Payout statements, coming soon" className="flex flex-col gap-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <SkeletonTile />
                    <SkeletonTile />
                </div>
                <div className="bg-[var(--dash-card)] border border-[var(--dash-line)] rounded-[var(--dash-r-card)] shadow-[var(--dash-shadow-card)] p-4 flex flex-col gap-2">
                    <span className="dash-label">Payout history</span>
                    <SkeletonRow />
                    <SkeletonRow />
                    <SkeletonRow />
                    <SkeletonRow />
                </div>
            </ComingSoonBlock>
        </div>
    )
}
